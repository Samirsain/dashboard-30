// =============================================================================
// data.js — Loads ALL data once from the Apps Script endpoint (which now returns
// every row plus the list of weeks), then the UI filters by week client-side.
// This makes older weeks and the "All weeks" view instant (no re-fetch).
// =============================================================================

import { APPS_SCRIPT_URL, USE_SAMPLE_DATA_FALLBACK, EXCLUDED_DOERS, WRITE_TOKEN } from "./config.js";
import { getAllSampleData } from "./sample-data.js";

export const ALL_WEEKS = { key: "all", label: "All weeks", from: "", to: "" };

// Ex-staff hidden everywhere (case-insensitive). Applied to live + sample data.
const EXCLUDED = new Set((EXCLUDED_DOERS || []).map((s) => String(s).trim().toUpperCase()));
const isExcluded = (name) => EXCLUDED.has(String(name ?? "").trim().toUpperCase());

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
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?week=all&_t=${Date.now()}`, { method: "GET", redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (payload && payload.error) {
      return { data: null, source: "live", error: { message: payload.error, missingHeaders: payload.missingHeaders || [] } };
    }
    return { data: prepare(normalize(payload)), source: "live", error: null };
  } catch (err) {
    if (USE_SAMPLE_DATA_FALLBACK) {
      return {
        data: prepare(getAllSampleData()),
        source: "sample",
        error: { message: `Live data unavailable (${err.message}); showing sample data.` },
      };
    }
    return { data: null, source: "live", error: { message: `Could not reach data source: ${err.message}` } };
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
// payload: { name, department }
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
  if (!APPS_SCRIPT_URL) {
    return { ok: false, error: "Sample mode — no live sheet connected to write to." };
  }
  const generated = /^(CL|TL)-\d+$/.test(String(task.id || ""));
  const body = JSON.stringify({
    token: WRITE_TOKEN,
    action: "complete",
    system: task.source === "Checklist" ? "checklist" : "tasklist",
    taskId: generated ? "" : task.id,
    doer: task.doer,
    task: task.task,
    date: task.due || task.created || "",
  });
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
  if (out && out.ok === false) throw new Error(out.error || "Could not mark the task done.");
  return out || { ok: true };
}

// Reschedule a pending task to a new date (newDateISO = "YYYY-MM-DD").
// Task List → revision count +1, Latest Revision = new date; Checklist → Planned moves.
export async function reviseTask(task, newDateISO) {
  if (!APPS_SCRIPT_URL) {
    return { ok: false, error: "Sample mode — no live sheet connected to write to." };
  }
  const generated = /^(CL|TL)-\d+$/.test(String(task.id || ""));
  const body = JSON.stringify({
    token: WRITE_TOKEN,
    action: "revise",
    system: task.source === "Checklist" ? "checklist" : "tasklist",
    taskId: generated ? "" : task.id,
    doer: task.doer,
    task: task.task,
    date: task.due || task.created || "",
    newDate: newDateISO,
  });
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
export function filterByDoer(data, doerName) {
  if (!data || !doerName) return data;
  const needle = String(doerName).trim().toUpperCase();
  const match = (r) => String(r.doer || "").trim().toUpperCase() === needle;
  return {
    ...data,
    checklist: (data.checklist || []).filter(match),
    delegation: (data.delegation || []).filter(match),
    fms: (data.fms || []).filter(match),
  };
}

// Client-side week filter. "all" (or unknown) returns everything.
export function filterByWeek(data, weekKey) {
  if (!data) return data;
  if (!weekKey || weekKey === "all") return data;
  const wk = (data.availableWeeks || []).find((w) => w.key === weekKey);
  if (!wk) return data;
  const inRange = (d) => {
    const s = String(d || "").trim();
    return !!s && s >= wk.from && s <= wk.to;
  };
  return {
    ...data,
    checklist: (data.checklist || []).filter((r) => inRange(r.planned)),
    delegation: (data.delegation || []).filter((r) => inRange(r.firstDate)),
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
