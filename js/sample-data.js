// =============================================================================
// sample-data.js — Bundled demo data for ThirtyMilestones (Real Estate,
// Hanumangarh). Used when APPS_SCRIPT_URL is blank or the backend is
// unreachable, so the dashboard is fully demonstrable before the Sheets are
// wired up.
//
// IMPORTANT: rows are keyed by the EXACT sheet header strings (PRD §5), i.e.
// the same shape the Apps Script doGet emits. This keeps the demo honest — the
// frontend reads sample data through HEADERS.* exactly as it reads live data.
//
// This is ThirtyMilestones-specific *structure* with placeholder content
// (PRD §5.4). Replace with the real team / processes when connecting Sheets.
// =============================================================================

// Canonical departments (PRD §5.4).
export const SAMPLE_DEPARTMENTS = [
  { Department: "Sales" },
  { Department: "Site/Operations" },
  { Department: "Marketing" },
  { Department: "Accounts" },
  { Department: "Admin" },
];

// Canonical doers. One inactive doer (Manoj Yadav) demonstrates the Active flag.
export const SAMPLE_DOERS = [
  { Doer: "Rohit Sharma", Department: "Sales", Active: true },
  { Doer: "Priya Verma", Department: "Sales", Active: true },
  { Doer: "Anil Kumar", Department: "Site/Operations", Active: true },
  { Doer: "Neha Gupta", Department: "Marketing", Active: true },
  { Doer: "Suresh Mehta", Department: "Accounts", Active: true },
  { Doer: "Kavita Singh", Department: "Admin", Active: true },
  { Doer: "Manoj Yadav", Department: "Sales", Active: false },
];

// Weeks available in the selector (Sun–Sat, matching the PRD example
// "14 Jun – 20 Jun 2026"). `key` is what the Apps Script `week` param expects.
export const SAMPLE_WEEKS = [
  { key: "2026-06-21", label: "21 Jun – 27 Jun 2026", from: "2026-06-21", to: "2026-06-27" },
  { key: "2026-06-14", label: "14 Jun – 20 Jun 2026", from: "2026-06-14", to: "2026-06-20" },
];

const GIVEN_BY = "Samir Sain"; // Owner/manager who delegates (PRD personas).

// --- FMS rows per week -------------------------------------------------------
const FMS_BY_WEEK = {
  "2026-06-14": [
    // New Lead Handling (Sales)
    { "FMS Name": "New Lead Handling", Step: "Lead Capture", "Step No": 1, Doer: "Rohit Sharma", Department: "Sales", Frequency: "Daily", "Planned Date": "2026-06-15", "Planned Time": "10:00", "Actual Date": "2026-06-15", Status: "Done" },
    { "FMS Name": "New Lead Handling", Step: "First Call", "Step No": 2, Doer: "Priya Verma", Department: "Sales", Frequency: "Daily", "Planned Date": "2026-06-15", "Planned Time": "12:00", "Actual Date": "2026-06-16", Status: "Done" },
    { "FMS Name": "New Lead Handling", Step: "Site Visit Scheduling", "Step No": 3, Doer: "Rohit Sharma", Department: "Sales", Frequency: "Daily", "Planned Date": "2026-06-16", "Planned Time": "11:00", "Actual Date": "", Status: "Pending" },
    // Site Visit Process (Site/Operations + Sales)
    { "FMS Name": "Site Visit Process", Step: "Confirm Visit", "Step No": 1, Doer: "Priya Verma", Department: "Sales", Frequency: "Weekly", "Planned Date": "2026-06-16", "Planned Time": "09:30", "Actual Date": "2026-06-16", Status: "Done" },
    { "FMS Name": "Site Visit Process", Step: "Conduct Visit", "Step No": 2, Doer: "Anil Kumar", Department: "Site/Operations", Frequency: "Weekly", "Planned Date": "2026-06-17", "Planned Time": "16:00", "Actual Date": "2026-06-17", Status: "Done" },
    { "FMS Name": "Site Visit Process", Step: "Feedback Logging", "Step No": 3, Doer: "Anil Kumar", Department: "Site/Operations", Frequency: "Weekly", "Planned Date": "2026-06-18", "Planned Time": "18:00", "Actual Date": "", Status: "Pending" },
    // Booking & Documentation (Sales + Admin)
    { "FMS Name": "Booking & Documentation", Step: "Negotiation", "Step No": 1, Doer: "Rohit Sharma", Department: "Sales", Frequency: "Monthly", "Planned Date": "2026-06-17", "Planned Time": "", "Actual Date": "2026-06-17", Status: "Done" },
    { "FMS Name": "Booking & Documentation", Step: "Booking Form", "Step No": 2, Doer: "Kavita Singh", Department: "Admin", Frequency: "Monthly", "Planned Date": "2026-06-18", "Planned Time": "", "Actual Date": "2026-06-18", Status: "Done" },
    { "FMS Name": "Booking & Documentation", Step: "Agreement Drafting", "Step No": 3, Doer: "Kavita Singh", Department: "Admin", Frequency: "Monthly", "Planned Date": "2026-06-19", "Planned Time": "", "Actual Date": "", Status: "Pending" },
    // Monthly Collection (Accounts)
    { "FMS Name": "Monthly Collection", Step: "Invoice Generation", "Step No": 1, Doer: "Suresh Mehta", Department: "Accounts", Frequency: "Monthly", "Planned Date": "2026-06-15", "Planned Time": "", "Actual Date": "2026-06-15", Status: "Done" },
    { "FMS Name": "Monthly Collection", Step: "Payment Follow-up", "Step No": 2, Doer: "Suresh Mehta", Department: "Accounts", Frequency: "Weekly", "Planned Date": "2026-06-18", "Planned Time": "", "Actual Date": "2026-06-19", Status: "Done" },
    { "FMS Name": "Monthly Collection", Step: "Receipt Issuance", "Step No": 3, Doer: "Suresh Mehta", Department: "Accounts", Frequency: "Monthly", "Planned Date": "2026-06-19", "Planned Time": "", "Actual Date": "", Status: "Pending" },
  ],
  "2026-06-21": [
    { "FMS Name": "New Lead Handling", Step: "Lead Capture", "Step No": 1, Doer: "Rohit Sharma", Department: "Sales", Frequency: "Daily", "Planned Date": "2026-06-22", "Planned Time": "10:00", "Actual Date": "2026-06-22", Status: "Done" },
    { "FMS Name": "New Lead Handling", Step: "First Call", "Step No": 2, Doer: "Priya Verma", Department: "Sales", Frequency: "Daily", "Planned Date": "2026-06-22", "Planned Time": "12:00", "Actual Date": "", Status: "Pending" },
    { "FMS Name": "New Lead Handling", Step: "Site Visit Scheduling", "Step No": 3, Doer: "Rohit Sharma", Department: "Sales", Frequency: "Daily", "Planned Date": "2026-06-23", "Planned Time": "11:00", "Actual Date": "", Status: "Pending" },
    { "FMS Name": "Monthly Collection", Step: "Invoice Generation", "Step No": 1, Doer: "Suresh Mehta", Department: "Accounts", Frequency: "Monthly", "Planned Date": "2026-06-22", "Planned Time": "", "Actual Date": "", Status: "Pending" },
  ],
};

// --- Checklist rows per week -------------------------------------------------
const CHECKLIST_BY_WEEK = {
  "2026-06-14": [
    { Task: "Update lead tracker", Doer: "Rohit Sharma", Department: "Sales", Date: "2026-06-15", Status: "Done" },
    { Task: "Update lead tracker", Doer: "Rohit Sharma", Department: "Sales", Date: "2026-06-16", Status: "Done" },
    { Task: "Update lead tracker", Doer: "Rohit Sharma", Department: "Sales", Date: "2026-06-17", Status: "Pending" },
    { Task: "Log follow-up calls", Doer: "Priya Verma", Department: "Sales", Date: "2026-06-15", Status: "Done" },
    { Task: "Log follow-up calls", Doer: "Priya Verma", Department: "Sales", Date: "2026-06-16", Status: "Pending" },
    { Task: "Reconcile cash register", Doer: "Suresh Mehta", Department: "Accounts", Date: "2026-06-15", Status: "Done" },
    { Task: "Reconcile cash register", Doer: "Suresh Mehta", Department: "Accounts", Date: "2026-06-16", Status: "Done" },
    { Task: "Reconcile cash register", Doer: "Suresh Mehta", Department: "Accounts", Date: "2026-06-17", Status: "Done" },
    { Task: "Site safety walkthrough", Doer: "Anil Kumar", Department: "Site/Operations", Date: "2026-06-16", Status: "Done" },
    { Task: "Site safety walkthrough", Doer: "Anil Kumar", Department: "Site/Operations", Date: "2026-06-17", Status: "Pending" },
    { Task: "Update social media calendar", Doer: "Neha Gupta", Department: "Marketing", Date: "2026-06-16", Status: "Pending" },
  ],
  "2026-06-21": [
    { Task: "Update lead tracker", Doer: "Rohit Sharma", Department: "Sales", Date: "2026-06-22", Status: "Done" },
    { Task: "Log follow-up calls", Doer: "Priya Verma", Department: "Sales", Date: "2026-06-22", Status: "Pending" },
    { Task: "Reconcile cash register", Doer: "Suresh Mehta", Department: "Accounts", Date: "2026-06-22", Status: "Done" },
    { Task: "Site safety walkthrough", Doer: "Anil Kumar", Department: "Site/Operations", Date: "2026-06-22", Status: "Pending" },
  ],
};

// --- Delegation rows per week ------------------------------------------------
const DELEGATION_BY_WEEK = {
  "2026-06-14": [
    { Task: "Prepare brochure for Green Valley project", Doer: "Neha Gupta", "Given By": GIVEN_BY, Department: "Marketing", Priority: "High", Urgency: "Urgent", "Planned Date": "2026-06-18", "Completed Date": "", Status: "Pending", Notified: true },
    { Task: "Get RERA documents notarized", Doer: "Kavita Singh", "Given By": GIVEN_BY, Department: "Admin", Priority: "High", Urgency: "Normal", "Planned Date": "2026-06-19", "Completed Date": "2026-06-19", Status: "Completed", Notified: false },
    { Task: "Arrange site banners", Doer: "Anil Kumar", "Given By": GIVEN_BY, Department: "Site/Operations", Priority: "Medium", Urgency: "Normal", "Planned Date": "2026-06-20", "Completed Date": "", Status: "Pending", Notified: false },
    { Task: "Prepare June collection report", Doer: "Suresh Mehta", "Given By": GIVEN_BY, Department: "Accounts", Priority: "High", Urgency: "Urgent", "Planned Date": "2026-06-20", "Completed Date": "2026-06-20", Status: "Completed", Notified: true },
    { Task: "Design Diwali campaign teaser", Doer: "Neha Gupta", "Given By": GIVEN_BY, Department: "Marketing", Priority: "Low", Urgency: "Normal", "Planned Date": "2026-06-20", "Completed Date": "", Status: "Pending", Notified: false },
  ],
  "2026-06-21": [
    { Task: "Follow up with bank for loan tie-up", Doer: "Rohit Sharma", "Given By": GIVEN_BY, Department: "Sales", Priority: "High", Urgency: "Urgent", "Planned Date": "2026-06-23", "Completed Date": "", Status: "Pending", Notified: true },
    { Task: "Update website listings", Doer: "Neha Gupta", "Given By": GIVEN_BY, Department: "Marketing", Priority: "Medium", Urgency: "Urgent", "Planned Date": "2026-06-24", "Completed Date": "", Status: "Pending", Notified: false },
    { Task: "Prepare client welcome kits", Doer: "Kavita Singh", "Given By": GIVEN_BY, Department: "Admin", Priority: "Low", Urgency: "Normal", "Planned Date": "2026-06-26", "Completed Date": "", Status: "Pending", Notified: false },
  ],
};

// Build the full doGet-shaped payload for a given week key.
export function getSampleWeekData(weekKey) {
  const week = SAMPLE_WEEKS.find((w) => w.key === weekKey) || SAMPLE_WEEKS[0];
  return {
    doers: SAMPLE_DOERS,
    departments: SAMPLE_DEPARTMENTS,
    fms: FMS_BY_WEEK[week.key] || [],
    checklist: CHECKLIST_BY_WEEK[week.key] || [],
    delegation: DELEGATION_BY_WEEK[week.key] || [],
    weekRange: { key: week.key, label: week.label, from: week.from, to: week.to },
  };
}
