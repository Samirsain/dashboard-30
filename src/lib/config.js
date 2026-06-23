// =============================================================================
// config.js — Single source of truth for configuration on the frontend side.
//
// SCHEMA CONTRACT (PRD §5): The `HEADERS` object below mirrors, EXACTLY, the
// header strings in the Google Sheets / Apps Script export layer. These strings
// are a fixed API. Renaming a header is a breaking change that must be made in
// BOTH this file and the Apps Script (apps-script/Code.gs) at the same time.
//
// The rest of the frontend NEVER hard-codes a header string — it always reads
// columns through `HEADERS.*`, so a header rename is a one-place edit here.
// =============================================================================

// -- Backend wiring ----------------------------------------------------------

// Apps Script Web App URL (the doGet endpoint). Leave blank to run the
// dashboard on bundled sample data (useful for local dev / demo / Netlify
// preview before the Sheets are connected).
export const APPS_SCRIPT_URL = "";

// If a real APPS_SCRIPT_URL is set but the fetch fails, fall back to sample
// data instead of showing a hard error. Set false in production once the
// backend is reliable, so outages surface as a retry state (PRD §10).
export const USE_SAMPLE_DATA_FALLBACK = true;

// -- Brand tokens (PRD §11) --------------------------------------------------
// Premium real-estate feel: deep navy/charcoal shell with a gold/amber accent.
// Confirm exact hex against 30milestones.vercel.app and plug in here; these are
// also defined as CSS custom properties in css/styles.css.
export const BRAND = {
  name: "ThirtyMilestones",
  tagline: "MIS Dashboard",
  // Path is relative to index.html. Drop a real logo at this path to show it;
  // if the image is missing the header falls back to a text monogram.
  logo: "assets/logo.svg",
};

// -- Fixed enums (PRD §5.1) --------------------------------------------------
// No free-text status anywhere — these are the only legal values.
export const STATUS = {
  DONE: "Done", // FMS + Checklist
  COMPLETED: "Completed", // Delegation (intentionally different term, PRD §4.3)
  PENDING: "Pending", // all three
};

export const PRIORITY = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" };
export const URGENCY = { URGENT: "Urgent", NORMAL: "Normal" };

// -- Header contract (PRD §5.2 / §5.3) ---------------------------------------
// Keys are stable semantic names used in code; values are the EXACT,
// case-sensitive, trimmed sheet header strings.
export const HEADERS = {
  Doers: {
    doer: "Doer",
    department: "Department",
    active: "Active",
  },
  Departments: {
    department: "Department",
  },
  FMS: {
    fmsName: "FMS Name",
    step: "Step",
    stepNo: "Step No",
    doer: "Doer",
    department: "Department",
    frequency: "Frequency",
    plannedDate: "Planned Date",
    plannedTime: "Planned Time",
    actualDate: "Actual Date",
    status: "Status",
  },
  Checklist: {
    task: "Task",
    doer: "Doer",
    department: "Department",
    date: "Date",
    status: "Status",
  },
  Delegation: {
    task: "Task",
    doer: "Doer",
    givenBy: "Given By",
    department: "Department",
    priority: "Priority",
    urgency: "Urgency",
    plannedDate: "Planned Date",
    completedDate: "Completed Date",
    status: "Status",
    notified: "Notified",
  },
};

// Tabs in the global shell (PRD §7.2, FR-8). `id` is used for routing + per-tab
// filter state; `label` is the visible nav text.
export const TABS = [
  { id: "summary", label: "Summary" },
  { id: "fms", label: "FMS Steps" },
  { id: "checklist", label: "Checklist" },
  { id: "delegation", label: "Delegation" },
  { id: "allDoers", label: "All Doers" },
];

// Completion-% threshold used to flag low performers / high pending (FR-13).
// At or above GOOD = green, at or above WARN = amber, below = red.
export const SCORE_THRESHOLDS = { GOOD: 85, WARN: 60 };

// The literal "All" sentinel used by every dropdown (PRD §8: "All" is default).
export const ALL = "All";
