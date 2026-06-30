// =============================================================================
// config.js — configuration for the ThirtyMilestones MIS dashboard.
//
// Real data sources (separate Google Sheets, all owned by the same account):
//   • TASKLIST  → Delegation  (Name, Task, First Date, Total Revisions,
//                 Latest Revision, Status, Priority).  Only "Completed" counts
//                 as done; anything else (incl. the sheet's old "Week Shifted")
//                 is treated as Pending. Completed-with-revisions = Late.
//   • CHECKLIST → Checklist   (Master tab: Name, Department, Freq, Task,
//                 Planned, Actual, Status[Done / blank]).  Scored Done/Pending.
//   • FMS       → (to be added later)
//
// The Apps Script export layer (apps-script/Code.gs) reads all sheets by ID,
// normalises them, and emits ONE JSON payload with the keys the frontend uses.
// =============================================================================

// Apps Script Web App URL (doGet). This is the DEFAULT baked into the build, but
// it can be overridden at runtime from the dashboard (admin → Sheet Connections,
// or the error screen) and stored in localStorage — so when a new deployment
// mints a new /exec URL you just paste it, no rebuild needed.
const BACKEND_URL_KEY = "tm-mis-backend-url";
const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQgfIzJJAIadH52kU_Vvwbtu-Rte38Ey_DCuqf1TKcTN4eh7s8ExPZ-_GYF7FwPSzC/exec";

function readBackendUrl() {
  try {
    const v = localStorage.getItem(BACKEND_URL_KEY);
    return v && v.trim() ? v.trim() : DEFAULT_APPS_SCRIPT_URL;
  } catch {
    return DEFAULT_APPS_SCRIPT_URL;
  }
}

// Live binding — call sites read this at fetch time, so an override applies on
// the next load. (The settings UI also reloads the page for a clean refetch.)
export let APPS_SCRIPT_URL = readBackendUrl();

export function getBackendUrl() {
  return APPS_SCRIPT_URL;
}
export function getDefaultBackendUrl() {
  return DEFAULT_APPS_SCRIPT_URL;
}
export function isBackendUrlOverridden() {
  return APPS_SCRIPT_URL !== DEFAULT_APPS_SCRIPT_URL;
}

// Save (or clear) the runtime backend URL override. Pass a blank string to reset
// back to the build's default. Returns the URL now in effect.
export function setBackendUrl(url) {
  const clean = String(url || "").trim();
  try {
    if (clean && clean !== DEFAULT_APPS_SCRIPT_URL) localStorage.setItem(BACKEND_URL_KEY, clean);
    else localStorage.removeItem(BACKEND_URL_KEY);
  } catch {
    /* storage unavailable */
  }
  APPS_SCRIPT_URL = clean || DEFAULT_APPS_SCRIPT_URL;
  return APPS_SCRIPT_URL;
}

export const USE_SAMPLE_DATA_FALLBACK = false;

// Shared secret for the "Add Task" write endpoint (doPost in Code.gs). Must match
// WRITE_TOKEN in apps-script/Code.gs. Basic abuse guard only — same client-side
// posture as the login gate (not bank-grade, but blocks casual writes).
export const WRITE_TOKEN = "TM30-WRITE";

// Doers who have left the team — hidden everywhere (dashboard + scoring).
// Canonical UPPERCASE names; matching is case-insensitive. "SAHIL" also covers
// "SAHIL SIR" via the alias map. Add/remove a name here to update the whole app.
export const EXCLUDED_DOERS = ["LAXMI", "KIRTI", "SAHIL"];

export const BRAND = {
  name: "ThirtyMilestones",
  tagline: "MIS Dashboard",
};

// Status values (exact strings from the sheets).
export const STATUS = {
  DONE: "Done", // Checklist (Actual filled)
  PENDING: "Pending", // Checklist (blank) + Delegation
  COMPLETED: "Completed", // Delegation
};

// Delegation RAG colour from the revision count (the team's own methodology):
//   0 revisions → Green, 1 → Yellow, 2+ → Red.
export const COLOUR = { GREEN: "Green", YELLOW: "Yellow", RED: "Red" };
export const RED_REVISIONS = 2;

// Tabs. Public dashboard shows the data tabs; "summary" (Scorecard) is admin-only.
export const TABS = [
  { id: "summary", label: "Scorecard" },
  { id: "fms", label: "Workflow" },
  { id: "checklist", label: "Checklist" },
  { id: "delegation", label: "Task List" },
  { id: "allDoers", label: "All Doers" },
];

// Display names per system — used in headings and the scorecard column groups.
// (Internal data keys stay fms/checklist/delegation; only the labels change.)
export const SYSTEM_LABELS = {
  checklist: "Checklist",
  delegation: "Task List",
  fms: "Workflow",
};

// Headline thresholds for percentage scores (completion % / green %).
export const SCORE_THRESHOLDS = { GOOD: 80, WARN: 50 };

export const ALL = "All";
