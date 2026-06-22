// =============================================================================
// data.js — Data-loading layer. Talks to the Apps Script doGet endpoint
// (PRD §7.1) and normalises the payload for the UI. Falls back to bundled
// sample data when no endpoint is configured or the fetch fails.
// =============================================================================

import { APPS_SCRIPT_URL, USE_SAMPLE_DATA_FALLBACK, HEADERS } from "./config.js";
import { getSampleWeekData, SAMPLE_WEEKS } from "./sample-data.js";

// Weeks offered by the Week selector (FR-7). With a live backend this could be
// served by the endpoint; for now the sample week list drives it.
export function availableWeeks() {
  return SAMPLE_WEEKS;
}

export function defaultWeekKey() {
  return SAMPLE_WEEKS[0].key;
}

// Load one week. Returns { data, source, error }.
//   source: "live" | "sample"
//   error:  null | { message, missingHeaders? }  (non-fatal if data present)
export async function loadWeek(weekKey) {
  if (!APPS_SCRIPT_URL) {
    return { data: withDataQuality(getSampleWeekData(weekKey)), source: "sample", error: null };
  }

  try {
    const url = `${APPS_SCRIPT_URL}?week=${encodeURIComponent(weekKey)}`;
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();

    // Header-validation error surfaced by Apps Script (FR-3): show it loudly.
    if (payload && payload.error) {
      return {
        data: null,
        source: "live",
        error: { message: payload.error, missingHeaders: payload.missingHeaders || [] },
      };
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

// Ensure the payload has the arrays the UI expects, even if the backend omits
// an empty section.
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

// Data-quality pass (FR-5): flag — never drop — any work row whose Doer is not
// in the canonical Doers list. The flagged set drives the data-quality banner.
function withDataQuality(data) {
  const known = new Set((data.doers || []).map((d) => String(d[HEADERS.Doers.doer] ?? "").trim()));
  const unknown = new Set();

  const check = (rows, doerHeader) => {
    for (const r of rows || []) {
      const name = String(r[doerHeader] ?? "").trim();
      if (name && !known.has(name)) unknown.add(name);
    }
  };
  check(data.fms, HEADERS.FMS.doer);
  check(data.checklist, HEADERS.Checklist.doer);
  check(data.delegation, HEADERS.Delegation.doer);

  data.unknownDoers = [...unknown].sort();
  return data;
}
