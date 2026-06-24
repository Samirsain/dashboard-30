// =============================================================================
// data.js — Data-loading layer. Fetches the unified JSON from the Apps Script
// doGet endpoint (which reads the TASKLIST + CHECKLIST sheets by ID) and falls
// back to bundled sample data when no endpoint is configured or it's offline.
// =============================================================================

import { APPS_SCRIPT_URL, USE_SAMPLE_DATA_FALLBACK } from "./config.js";
import { getSampleWeekData, SAMPLE_WEEKS } from "./sample-data.js";

export function availableWeeks() {
  return SAMPLE_WEEKS;
}

export function defaultWeekKey() {
  return SAMPLE_WEEKS[0].key;
}

// Load one week. Returns { data, source, error }.
export async function loadWeek(weekKey) {
  if (!APPS_SCRIPT_URL) {
    return { data: withDataQuality(getSampleWeekData(weekKey)), source: "sample", error: null };
  }

  try {
    const url = `${APPS_SCRIPT_URL}?week=${encodeURIComponent(weekKey)}`;
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();

    if (payload && payload.error) {
      return { data: null, source: "live", error: { message: payload.error, missingHeaders: payload.missingHeaders || [] } };
    }
    return { data: withDataQuality(normalize(payload, weekKey)), source: "live", error: null };
  } catch (err) {
    if (USE_SAMPLE_DATA_FALLBACK) {
      return {
        data: withDataQuality(getSampleWeekData(weekKey)),
        source: "sample",
        error: { message: `Live data unavailable (${err.message}); showing sample data.` },
      };
    }
    return { data: null, source: "live", error: { message: `Could not reach data source: ${err.message}` } };
  }
}

function normalize(payload, weekKey) {
  const week = SAMPLE_WEEKS.find((w) => w.key === weekKey);
  return {
    doers: payload.doers || [],
    departments: payload.departments || [],
    fms: payload.fms || [],
    checklist: payload.checklist || [],
    delegation: payload.delegation || [],
    weekRange: payload.weekRange || (week ? { key: week.key, label: week.label, from: week.from, to: week.to } : { label: weekKey }),
  };
}

// Flag — never drop — any work row whose doer is not in the canonical list.
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
