// =============================================================================
// data.js — Loads ALL data once from the Apps Script endpoint (which now returns
// every row plus the list of weeks), then the UI filters by week client-side.
// This makes older weeks and the "All weeks" view instant (no re-fetch).
// =============================================================================

import { APPS_SCRIPT_URL, USE_SAMPLE_DATA_FALLBACK } from "./config.js";
import { getAllSampleData } from "./sample-data.js";

export const ALL_WEEKS = { key: "all", label: "All weeks", from: "", to: "" };

// Fetch everything once. Returns { data, source, error }.
export async function loadData() {
  if (!APPS_SCRIPT_URL) {
    return { data: withDataQuality(getAllSampleData()), source: "sample", error: null };
  }
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?week=all`, { method: "GET", redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    if (payload && payload.error) {
      return { data: null, source: "live", error: { message: payload.error, missingHeaders: payload.missingHeaders || [] } };
    }
    return { data: withDataQuality(normalize(payload)), source: "live", error: null };
  } catch (err) {
    if (USE_SAMPLE_DATA_FALLBACK) {
      return {
        data: withDataQuality(getAllSampleData()),
        source: "sample",
        error: { message: `Live data unavailable (${err.message}); showing sample data.` },
      };
    }
    return { data: null, source: "live", error: { message: `Could not reach data source: ${err.message}` } };
  }
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
