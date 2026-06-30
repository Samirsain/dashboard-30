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

// Apps Script Web App URL (doGet). Blank → bundled sample data.
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwqCCQ8IRoIExDcWQ1mUqFl5vV4YlURiimm4_duqVkipk15Wj0irfNnrsUIXY47K2bw/exec";
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
