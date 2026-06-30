// =============================================================================
// data.js — Loads ALL data once from the Apps Script endpoint (which now returns
// every row plus the list of weeks), then the UI filters by week client-side.
// This makes older weeks and the "All weeks" view instant (no re-fetch).
// =============================================================================

import { APPS_SCRIPT_URL, USE_SAMPLE_DATA_FALLBACK, EXCLUDED_DOERS, WRITE_TOKEN } from "./config.js";
import { getAllSampleData } from "./sample-data.js";
import { getActiveConnections } from "./sheets";

export const ALL_WEEKS = { key: "all", label: "All weeks", from: "", to: "" };

// Ex-staff hidden everywhere (case-insensitive). Applied to live + sample data.
const EXCLUDED = new Set((EXCLUDED_DOERS || []).map((s) => String(s).trim().toUpperCase()));
const isExcluded = (name) => {
  const s = String(name ?? "").trim().toUpperCase();
  return s === "" || EXCLUDED.has(s);
};

function dropExcludedDoers(data) {
  if (!data) return data;
  const doers = (data.doers || []).filter((d) => !isExcluded(d.doer));
  const checklist = (data.checklist || []).filter((r) => !isExcluded(r.doer));
  const delegation = (data.delegation || []).filter((r) => !isExcluded(r.doer));
  const fms = (data.fms || []).filter((r) => !isExcluded(r.doer));
  // Keep only departments still referenced by a remaining doer or task row.
  const used = new Set();
  for (const d of doers) used.add(String(d.department ?? "").trim());
  for (const rows of [checklist, delegation, fms]) for (const r of rows) used.add(String(r.department ?? "").trim());
  const departments = (data.departments || []).filter((d) => used.has(String(d.department ?? "").trim()));
  return { ...data, doers, checklist, delegation, fms, departments };
}

// withDataQuality(dropExcludedDoers(...)) — exclude ex-staff, then flag unknowns.
const prepare = (data) => withDataQuality(dropExcludedDoers(data));

// Fetch everything once. Returns { data, source, error }.
export async function loadData() {
  if (!APPS_SCRIPT_URL) {
    return { data: prepare(getAllSampleData()), source: "sample", error: null };
  }

  let mainData = null;
  let mainError = null;
  let mainSource = "live";

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?week=all&_t=${Date.now()}`, { method: "GET", redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (payload && payload.error) {
      mainError = { message: payload.error, missingHeaders: payload.missingHeaders || [] };
    } else {
      mainData = prepare(normalize(payload));
    }
  } catch (err) {
    if (USE_SAMPLE_DATA_FALLBACK) {
      mainData = prepare(getAllSampleData());
      mainSource = "sample";
      mainError = { message: `Live data unavailable (${err.message}); showing sample data.` };
    } else {
      return { data: null, source: "live", error: { message: `Could not reach data source: ${err.message}` } };
    }
  }

  // Load additional connected sheets in parallel. Each connection's rows are stored
  // under viewData[conn.moduleSlug] so ModuleBody can pull them by slug.
  const connections = getActiveConnections ? getActiveConnections() : [];
  if (connections.length && mainData) {
    const connResults = await Promise.allSettled(
      connections.map((conn) => fetchConnectionData(conn))
    );
    connResults.forEach((result, i) => {
      if (result.status === "fulfilled" && result.value !== null) {
        mainData[connections[i].moduleSlug] = result.value;
      }
    });
  }

  return { data: mainData, source: mainSource, error: mainError };
}

// Fetch rows from a single additional sheet connection. Returns an array of rows
// (delegation or checklist format) with _sheetId stamped on each row for writes.
async function fetchConnectionData(conn) {
  const url = conn.scriptUrl || APPS_SCRIPT_URL;
  if (!url) return null;
  try {
    const res = await fetch(
      `${url}?sheetId=${encodeURIComponent(conn.sheetId)}&type=${conn.sheetType}&_t=${Date.now()}`,
      { method: "GET", redirect: "follow" }
    );
    if (!res.ok) return null;
    const payload = await res.json();
    if (payload && payload.error) return null;
    const rows = conn.sheetType === "tasklist"
      ? (payload.delegation || [])
      : (payload.checklist || []);
    // Stamp the source sheetId so completeTask / reviseTask write to the right sheet.
    return rows.map((r) => ({ ...r, _sheetId: conn.sheetId, _scriptUrl: conn.scriptUrl || "" }));
  } catch {
    return null;
  }
}

// Test a potential connection before saving — used by SheetManager.
// Returns { ok, rows, error }.
export async function testSheetConnection({ sheetId, sheetType, scriptUrl }) {
  const url = scriptUrl || APPS_SCRIPT_URL;
  if (!url || !sheetId) return { ok: false, rows: 0, error: "Script URL or Sheet ID missing." };
  try {
    const res = await fetch(
      `${url}?sheetId=${encodeURIComponent(sheetId)}&type=${sheetType}&_t=${Date.now()}`,
      { method: "GET", redirect: "follow" }
    );
    if (!res.ok) return { ok: false, rows: 0, error: `HTTP ${res.status}` };
    const payload = await res.json();
    if (payload && payload.error) return { ok: false, rows: 0, error: payload.error };
    const rows = sheetType === "tasklist" ? (payload.delegation || []) : (payload.checklist || []);
    return { ok: true, rows: rows.length, error: null };
  } catch (err) {
    return { ok: false, rows: 0, error: err.message };
  }
}

// Lightweight fetch: returns just the doer names for login verification.
export async function fetchDoerNames() {
  if (!APPS_SCRIPT_URL) {
    const sample = getAllSampleData();
    return (sample.doers || []).map((d) => String(d.doer || "").trim()).filter(Boolean);
  }
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?week=all&_t=${Date.now()}`, { method: "GET", redirect: "follow" });
    if (!res.ok) return [];
    const payload = await res.json();
    if (payload && payload.error) return [];
    return (payload.doers || []).map((d) => String(d.doer || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// Add a task by POSTing to the Apps Script doPost handler. Uses a "simple"
// text/plain request so the browser skips the CORS preflight (Apps Script can't
// answer preflight) — same cross-origin path the GET already uses successfully.
// payload: { system: "tasklist"|"checklist", task, doer, priority?, frequency?, department?, date? }
export async function addTask(payload) {
  if (!APPS_SCRIPT_URL) {
    return { ok: false, error: "Sample mode — no live sheet connected to write to." };
  }
  const body = JSON.stringify({ token: WRITE_TOKEN, ...payload });
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    out = { ok: true }; // unreadable (opaque) response — assume the write landed
  }
  if (out && out.ok === false) throw new Error(out.error || "Could not add the task.");
  return out || { ok: true };
}

// Add a new doer to the Doers sheet in Google Sheets.
// payload: { name, department, mobile, email, username, password }
// username and password are saved so admin can reference them from the sheet.
export async function addDoer(payload) {
  if (!APPS_SCRIPT_URL) {
    return { ok: false, error: "Sample mode — no live sheet connected to write to." };
  }
  const body = JSON.stringify({ token: WRITE_TOKEN, action: "addDoer", ...payload });
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    out = { ok: true };
  }
  if (out && out.ok === false) throw new Error(out.error || "Could not add the doer.");
  return out || { ok: true };
}

// Remove a doer from the Doers sheet.
// payload: { name }
export async function removeDoer(payload) {
  if (!APPS_SCRIPT_URL) {
    return { ok: false, error: "Sample mode — no live sheet connected." };
  }
  const body = JSON.stringify({ token: WRITE_TOKEN, action: "removeDoer", ...payload });
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let out;
  try { out = JSON.parse(text); } catch { out = { ok: true }; }
  if (out && out.ok === false) throw new Error(out.error || "Could not remove the doer.");
  return out || { ok: true };
}

// Mark a task complete. Sends Task ID plus a doer/task/date fallback so the
// Apps Script can find the row even when a checklist row has no Task ID.
// task: a unified task row from analytics (has id, source, doer, task, due).
export async function completeTask(task) {
  const scriptUrl = task._scriptUrl || APPS_SCRIPT_URL;
  if (!scriptUrl) {
    return { ok: false, error: "Sample mode — no live sheet connected to write to." };
  }
  const generated = /^(CL|TL)-\d+$/.test(String(task.id || ""));
  // IMPORTANT: Always use task.created (= firstDate / planned) as the date to
  // match against the sheet's "First Date" / "Planned" column. task.due shifts
  // to the revised date after a revise, so it would no longer match the sheet.
  // task.created always holds the ORIGINAL date and never changes on revise.
  const matchDate = task.created || task.due || "";
  const body = JSON.stringify({
    token: WRITE_TOKEN,
    action: "complete",
    system: task.source === "Checklist" ? "checklist" : "tasklist",
    sheetId: task._sheetId || "",
    taskId: generated ? "" : task.id,
    doer: task.doer,
    task: task.task,
    date: matchDate,
  });
  const res = await fetch(scriptUrl, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    out = { ok: true };
  }
  if (out && out.ok === false) throw new Error(out.error || "Could not mark the task done.");
  return out || { ok: true };
}

// Reschedule a pending task to a new date (newDateISO = "YYYY-MM-DD").
// Task List → revision count +1, Latest Revision = new date; Checklist → Planned moves.
export async function reviseTask(task, newDateISO) {
  const scriptUrl = task._scriptUrl || APPS_SCRIPT_URL;
  if (!scriptUrl) {
    return { ok: false, error: "Sample mode — no live sheet connected to write to." };
  }
  const generated = /^(CL|TL)-\d+$/.test(String(task.id || ""));
  // IMPORTANT: Always match on the ORIGINAL first/planned date (task.created).
  // After a revise, task.due moves to the new date but the sheet's "First Date"
  // column stays at the original value. Using task.created avoids a mismatch
  // on re-revise (where task.due is the previously-revised date, not the sheet's
  // First Date). task.created is set from r.firstDate in analytics.js and
  // never changes through the task lifecycle in the frontend.
  const matchDate = task.created || task.due || "";
  const body = JSON.stringify({
    token: WRITE_TOKEN,
    action: "revise",
    system: task.source === "Checklist" ? "checklist" : "tasklist",
    sheetId: task._sheetId || "",
    taskId: generated ? "" : task.id,
    doer: task.doer,
    task: task.task,
    date: matchDate,
    newDate: newDateISO,
  });
  const res = await fetch(scriptUrl, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  let out;
  try {
    out = JSON.parse(text);
  } catch {
    out = { ok: true };
  }
  if (out && out.ok === false) throw new Error(out.error || "Could not revise the task.");
  return out || { ok: true };
}

function normalize(payload) {
  return {
    doers: payload.doers || [],
    departments: payload.departments || [],
    fms: payload.fms || [],
    checklist: payload.checklist || [],
    delegation: payload.delegation || [],
    availableWeeks: payload.availableWeeks || [],
  };
}

// Week selector options: "All weeks" + every week present in the data.
export function weekOptions(data) {
  return [ALL_WEEKS, ...((data && data.availableWeeks) || [])];
}

// Client-side doer filter. When a staff member is logged in, only show their tasks.
// doerName must match the "Doer" column value in the sheet (case-insensitive).
// Pass null/undefined to return all data (admin or unmapped staff).
// Also filters any extra array keys (sheet connection data keyed by moduleSlug).
const STANDARD_ARRAY_KEYS = new Set(["checklist", "delegation", "fms"]);

export function filterByDoer(data, doerName) {
  if (!data || !doerName) return data;
  const needle = String(doerName).trim().toUpperCase();
  const match = (r) => String(r.doer || "").trim().toUpperCase() === needle;

  const result = {
    ...data,
    checklist: (data.checklist || []).filter(match),
    delegation: (data.delegation || []).filter(match),
    fms: (data.fms || []).filter(match),
  };

  // Filter dynamic connection arrays (keyed sc-XXXXXX).
  for (const key of Object.keys(data)) {
    if (!STANDARD_ARRAY_KEYS.has(key) && Array.isArray(data[key])) {
      result[key] = data[key].filter(match);
    }
  }

  return result;
}

// Client-side week filter. "all" (or unknown) returns everything.
// For pending delegation rows, the effective date is latestRevision (if set)
// rather than firstDate — so a task revised to this week's date appears here
// even if it was originally scheduled in a previous week.
// Completed/done tasks always use their original firstDate so historical
// scoring stays accurate.
export function filterByWeek(data, weekKey) {
  if (!data) return data;
  if (!weekKey || weekKey === "all") return data;
  const wk = (data.availableWeeks || []).find((w) => w.key === weekKey);
  if (!wk) return data;
  const inRange = (d) => {
    const s = String(d || "").trim();
    return !!s && s >= wk.from && s <= wk.to;
  };
  const delegationDate = (r) => {
    const done = r.status === "Completed" || r.status === "Done";
    return done ? r.firstDate : (r.latestRevision || r.firstDate);
  };
  return {
    ...data,
    checklist: (data.checklist || []).filter((r) => inRange(r.planned)),
    delegation: (data.delegation || []).filter((r) => inRange(delegationDate(r))),
    fms: (data.fms || []).filter((r) => inRange(r.planned || r.firstDate)),
    weekRange: { key: wk.key, label: wk.label, from: wk.from, to: wk.to },
  };
}

function withDataQuality(data) {
  const known = new Set((data.doers || []).map((d) => String(d.doer ?? "").trim()));
  const unknown = new Set();
  for (const rows of [data.fms, data.checklist, data.delegation]) {
    for (const r of rows || []) {
      const name = String(r.doer ?? "").trim();
      if (name && !known.has(name)) unknown.add(name);
    }
  }
  data.unknownDoers = [...unknown].sort();
  return data;
}
