// =============================================================================
// config.js — configuration for the ThirtyMilestones MIS dashboard.
//
// Real data sources (separate Google Sheets, all owned by the same account):
//   • TASKLIST  → Delegation  (Name, Task, First Date, Total Revisions,
//                 Latest Revision, Status[Completed/Week Shifted/Pending],
//                 Priority).  Scored Red/Yellow/Green by revisions.
//   • CHECKLIST → Checklist   (Master tab: Name, Department, Freq, Task,
//                 Planned, Actual, Status[Done / blank]).  Scored Done/Pending.
//   • FMS       → (to be added later)
//
// The Apps Script export layer (apps-script/Code.gs) reads all sheets by ID,
// normalises them, and emits ONE JSON payload with the keys the frontend uses.
// =============================================================================

// Apps Script Web App URL (doGet). Blank → bundled sample data.
export const APPS_SCRIPT_URL = "";
export const USE_SAMPLE_DATA_FALLBACK = true;

export const BRAND = {
  name: "ThirtyMilestones",
  tagline: "MIS Dashboard",
};

// Status values (exact strings from the sheets).
export const STATUS = {
  DONE: "Done", // Checklist (Actual filled)
  PENDING: "Pending", // Checklist (blank) + Delegation
  COMPLETED: "Completed", // Delegation
  SHIFTED: "Week Shifted", // Delegation (slipped to another week)
};

// Delegation RAG colour from the revision count (the team's own methodology):
//   0 revisions → Green, 1 → Yellow, 2+ → Red.
export const COLOUR = { GREEN: "Green", YELLOW: "Yellow", RED: "Red" };
export const RED_REVISIONS = 2;

// Tabs. FMS stays in place (data wired in later).
export const TABS = [
  { id: "summary", label: "Summary" },
  { id: "fms", label: "FMS" },
  { id: "checklist", label: "Checklist" },
  { id: "delegation", label: "Delegation" },
  { id: "allDoers", label: "All Doers" },
];

// Headline thresholds for percentage scores (completion % / green %).
export const SCORE_THRESHOLDS = { GOOD: 80, WARN: 50 };

export const ALL = "All";
