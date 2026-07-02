// =============================================================================
// data.js — Loads ALL data once from the Apps Script endpoint (which now returns
// every row plus the list of weeks), then the UI filters by week client-side.
// This makes older weeks and the "All weeks" view instant (no re-fetch).
// =============================================================================

import { APPS_SCRIPT_URL, USE_SAMPLE_DATA_FALLBACK, EXCLUDED_DOERS, WRITE_TOKEN } from "./config.js";
import { getAllSampleData } from "./sample-data.js";
import { getActiveConnections } from "./sheets";
import { applyRemoteConfig } from "./configSync";

export const ALL_WEEKS = { key: "all", label: "All weeks", from: "", to: "" };

// After a write (add / complete / revise / doer change) the very next load must
// bypass the Apps Script payload cache (?nocache=1). Otherwise a background
// keepWarm trigger can re-populate that cache with STALE rows just after the
// write cleared it, so the freshly added task wouldn't appear until the cache
// (6h TTL) expired. This flag forces exactly one fresh, cache-skipping rebuild.
let forceFreshNextLoad = false;
export function markDataStale() {
  forceFreshNextLoad = true;
}

// Last successful LIVE payload, cached so the dashboard can render instantly on
// the next visit while fresh data loads in the background (stale-while-revalidate).
const DATA_CACHE_KEY = "tm-mis-data-cache-v1";
export function getCachedData() {
  try {
    const raw = localStorage.getItem(DATA_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
    // Generous budget: a cold Apps Script start over a large sheet can take
    // 30-50s. This only guards against a true hang, not normal slowness.
    // Right after a write, skip the server-side payload cache so the new/changed
    // row is guaranteed to appear (see markDataStale above).
    const nocache = forceFreshNextLoad ? "&nocache=1" : "";
    forceFreshNextLoad = false;
    const res = await fetchWithTimeout(`${APPS_SCRIPT_URL}?week=all${nocache}&_t=${Date.now()}`, { method: "GET", redirect: "follow" }, 70000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (payload && payload.error) {
      mainError = { message: payload.error, missingHeaders: payload.missingHeaders || [] };
    } else {
      mainData = prepare(normalize(payload));
      // Hydrate this device's connections + per-doer access from the shared
      // backend config so every laptop sees the same sheets and permissions.
      try { applyRemoteConfig(payload.config); } catch { /* ignore */ }
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

  // Connected-sheet rows are NO LONGER fetched here — they are loaded lazily by
  // each connection module only when it's opened (see ConnectionModule in
  // App.tsx). This keeps the main dashboard load fast no matter how many sheets
  // are attached, and a slow/large connected sheet can never stall the board.

  // Cache the live payload so the next visit paints instantly from cache while
  // this same fetch refreshes it in the background.
  if (mainSource === "live" && mainData) {
    try { localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(mainData)); } catch { /* quota */ }
  }

  return { data: mainData, source: mainSource, error: mainError };
}

// fetch() with an abort timeout so a slow/hanging endpoint can never leave the
// dashboard spinning forever. Rejects with an Error on timeout.
async function fetchWithTimeout(url, opts = {}, ms = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Fetch rows from a single additional sheet connection. Returns an array of rows
// (delegation or checklist format) with _sheetId stamped on each row for writes,
// or null on error/timeout. Exported so connection modules can load on demand.
export async function fetchConnectionData(conn) {
  const url = conn.scriptUrl || APPS_SCRIPT_URL;
  if (!url) return null;
  try {
    const res = await fetchWithTimeout(
      `${url}?sheetId=${encodeURIComponent(conn.sheetId)}&type=${conn.sheetType}&_t=${Date.now()}`,
      { method: "GET", redirect: "follow" },
      45000
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

// Shared writer for all POSTs to the Apps Script doPost handler. Uses a "simple"
// text/plain request so the browser skips the CORS preflight (Apps Script can't
// answer preflight) — same cross-origin path the GET uses.
//
// If fetch() throws before any response, that's a network/CORS failure ("Failed
// to fetch"): the request never reached the server. In practice this means the
// Backend URL is wrong/expired, OR the Apps Script deployment isn't shared as
// "Anyone" (so the POST gets redirected to a Google login the browser blocks).
// We turn that into a clear, actionable message instead of a cryptic one. We do
// NOT silently re-send (no-cors) because that risks duplicate rows.
async function postToScript(url, payloadObj, failMsg) {
  if (!url) return { ok: false, error: "Sample mode — no live sheet connected to write to." };
  const body = JSON.stringify(payloadObj);

  // Apps Script answers a POST with a 302 redirect to googleusercontent.com.
  // Browsers frequently block reading that redirected response cross-origin, so a
  // normal fetch throws "Failed to fetch" EVEN THOUGH the write already ran. We
  // therefore send a single "simple" fire-and-forget request in no-cors mode:
  // doPost executes and the row is written to the sheet; we just can't read the
  // reply, so we assume success and let the follow-up reload show the result.
  // One request only ⇒ no duplicate rows. Client-side validation already guards
  // the common mistakes (empty task/doer), so losing the server reply is fine.
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
    });
    return { ok: true };
  } catch {
    throw new Error(
      "Backend se connect nahi ho paya. Internet, ya Backend URL check karein " +
      "(Admin → Sheet Connections → Backend URL → Test). " + (failMsg || "")
    );
  }
}

// Add a task. payload: { system, task, doer, priority?, frequency?, department?, date?, sheetId? }
export async function addTask(payload) {
  const res = await postToScript(APPS_SCRIPT_URL, { token: WRITE_TOKEN, ...payload }, "Could not add the task.");
  markDataStale();
  return res;
}

// Add a new doer to the Doers sheet in Google Sheets.
// payload: { name, department, mobile, email, username, password }
// username and password are saved so admin can reference them from the sheet.
export async function addDoer(payload) {
  const res = await postToScript(APPS_SCRIPT_URL, { token: WRITE_TOKEN, action: "addDoer", ...payload }, "Could not add the doer.");
  markDataStale();
  return res;
}

// Remove a doer from the Doers sheet.  payload: { name }
export async function removeDoer(payload) {
  const res = await postToScript(APPS_SCRIPT_URL, { token: WRITE_TOKEN, action: "removeDoer", ...payload }, "Could not remove the doer.");
  markDataStale();
  return res;
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
  const res = await postToScript(scriptUrl, {
    token: WRITE_TOKEN,
    action: "complete",
    system: task.source === "Checklist" ? "checklist" : "tasklist",
    sheetId: task._sheetId || "",
    taskId: generated ? "" : task.id,
    doer: task.doer,
    task: task.task,
    date: matchDate,
  }, "Could not mark the task done.");
  markDataStale();
  return res;
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
  const res = await postToScript(scriptUrl, {
    token: WRITE_TOKEN,
    action: "revise",
    system: task.source === "Checklist" ? "checklist" : "tasklist",
    sheetId: task._sheetId || "",
    taskId: generated ? "" : task.id,
    doer: task.doer,
    task: task.task,
    date: matchDate,
    newDate: newDateISO,
  }, "Could not revise the task.");
  markDataStale();
  return res;
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
