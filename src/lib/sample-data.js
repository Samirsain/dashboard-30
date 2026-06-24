// =============================================================================
// sample-data.js — bundled demo data for ThirtyMilestones, shaped exactly like
// the Apps Script output. Real doers/departments + a representative slice of
// real Checklist (CHECKLIST sheet) and Delegation (TASKLIST sheet) rows so the
// dashboard is fully demonstrable before the live endpoint is connected.
// =============================================================================

// Canonical departments (role-based, from the CHECKLIST Doer List).
export const SAMPLE_DEPARTMENTS = [
  { department: "MIS" },
  { department: "EA" },
  { department: "HR" },
  { department: "SITE INCHARGE" },
  { department: "PS" },
  { department: "CRM" },
  { department: "SUPERVISOR" },
  { department: "ACCOUNTS" },
  { department: "DRIVER" },
];

// Canonical doers (merged from both sheets; names normalised).
export const SAMPLE_DOERS = [
  { doer: "SAMIR", department: "MIS", active: true },
  { doer: "PRIYA", department: "EA", active: true },
  { doer: "SHIKHA", department: "HR", active: true },
  { doer: "SAHIL", department: "SITE INCHARGE", active: true },
  { doer: "SANDEEP", department: "PS", active: true },
  { doer: "LAXMI", department: "CRM", active: true },
  { doer: "DEEPAK", department: "SUPERVISOR", active: true },
  { doer: "KIRTI", department: "ACCOUNTS", active: true },
  { doer: "DRIVER", department: "DRIVER", active: true },
];

// Weeks (Sunday–Saturday). Current week first.
export const SAMPLE_WEEKS = [
  { key: "2026-06-21", label: "21 Jun – 27 Jun 2026", from: "2026-06-21", to: "2026-06-27" },
  { key: "2026-06-14", label: "14 Jun – 20 Jun 2026", from: "2026-06-14", to: "2026-06-20" },
  { key: "2026-06-07", label: "7 Jun – 13 Jun 2026", from: "2026-06-07", to: "2026-06-13" },
  { key: "2026-05-31", label: "31 May – 6 Jun 2026", from: "2026-05-31", to: "2026-06-06" },
];

// --- Checklist rows per week (CHECKLIST → Master): status Done | Pending -----
const CHECKLIST_BY_WEEK = {
  "2026-06-21": [
    { task: "OFFICE WIFI KA BILL", doer: "PRIYA", department: "EA", frequency: "Monthly", planned: "2026-06-25", actual: "", status: "Pending" },
    { task: "HAR 30 MINT ME SECURITY GUARD PHOTO KA UPDATE LENA HAI", doer: "PRIYA", department: "EA", frequency: "Daily", planned: "2026-06-22", actual: "2026-06-22", status: "Done" },
    { task: "RAJENDRA & HITESH JI KO CALL & MSG DROP", doer: "SHIKHA", department: "HR", frequency: "Daily", planned: "2026-06-22", actual: "2026-06-23", status: "Done" },
    { task: "SITE EXPENSE KA DAILY UPDATE", doer: "DEEPAK", department: "SUPERVISOR", frequency: "Daily", planned: "2026-06-22", actual: "", status: "Pending" },
  ],
  "2026-06-14": [
    { task: "EMPORIO KA BIJLI KA BILL", doer: "PRIYA", department: "EA", frequency: "Monthly", planned: "2026-06-15", actual: "2026-06-15", status: "Done" },
    { task: "GHAR KA BIJLI KA BILL", doer: "PRIYA", department: "EA", frequency: "Monthly", planned: "2026-06-18", actual: "2026-06-19", status: "Done" },
    { task: "HAR SATURDAY KO SABHI STAFF KA TYPE OF WORK LIKHNA HAI", doer: "PRIYA", department: "EA", frequency: "Weekly", planned: "2026-06-20", actual: "", status: "Pending" },
    { task: "RAJENDRA & HITESH JI KO CALL & MSG DROP", doer: "SHIKHA", department: "HR", frequency: "Daily", planned: "2026-06-16", actual: "2026-06-16", status: "Done" },
  ],
  "2026-06-07": [
    { task: "RAJENDRA & HITESH JI KO CALL & MSG DROP", doer: "SHIKHA", department: "HR", frequency: "Daily", planned: "2026-06-09", actual: "2026-06-09", status: "Done" },
    { task: "SITE EXPENSE KA DAILY UPDATE", doer: "DEEPAK", department: "SUPERVISOR", frequency: "Daily", planned: "2026-06-09", actual: "", status: "Pending" },
  ],
  "2026-05-31": [
    { task: "SANDEEP SE SHOWROOM KA BILL MANGWANA HAI", doer: "PRIYA", department: "EA", frequency: "Monthly", planned: "2026-06-01", actual: "2026-06-01", status: "Done" },
    { task: "MAYANK GARG KO BILL BHEJNA HAI", doer: "PRIYA", department: "EA", frequency: "Monthly", planned: "2026-06-01", actual: "2026-06-02", status: "Done" },
    { task: "HAR 30 MINT ME SECURITY GUARD PHOTO KA UPDATE LENA HAI", doer: "PRIYA", department: "EA", frequency: "Daily", planned: "2026-06-02", actual: "", status: "Pending" },
  ],
};

// --- Delegation rows per week (TASKLIST): revisions → RAG; Status ------------
const DELEGATION_BY_WEEK = {
  "2026-06-21": [
    { taskId: "qh9a8lx", task: "ENGINEER KA RESUME DENA HAI SIR KO", doer: "SHIKHA", department: "HR", firstDate: "2026-06-22", latestRevision: "2026-06-24", revisions: 2, status: "Pending", priority: "Normal" },
    { taskId: "sf6jdgz", task: "WHITE DRESS KA REMINDER SABHI KO DALNA HAI", doer: "PRIYA", department: "EA", firstDate: "2026-06-22", latestRevision: "2026-06-22", revisions: 0, status: "Completed", priority: "" },
    { taskId: "klxubuh", task: "METER LAGNE KE BAAD COLONY KA SARA CONNECTION US PER KARNA HAI", doer: "SANDEEP", department: "PS", firstDate: "2026-06-22", latestRevision: "2026-06-23", revisions: 2, status: "Week Shifted", priority: "" },
    { taskId: "v9c9e3c", task: "BIKANERWALA KA GRANITE CONFIRM KARNA HAI", doer: "DEEPAK", department: "SUPERVISOR", firstDate: "2026-06-22", latestRevision: "2026-06-22", revisions: 0, status: "Completed", priority: "" },
  ],
  "2026-06-14": [
    { taskId: "7kfkvp2", task: "OVERALL TASKLIST SCORING SEND KRNI HAI SAHIL SIR KO", doer: "SAMIR", department: "MIS", firstDate: "2026-06-15", latestRevision: "2026-06-15", revisions: 0, status: "Completed", priority: "" },
    { taskId: "w20qqdn", task: "3 NO KA POSSESSION", doer: "DEEPAK", department: "SUPERVISOR", firstDate: "2026-06-18", latestRevision: "2026-06-20", revisions: 2, status: "Week Shifted", priority: "" },
    { taskId: "swywo9v", task: "PHOTOGRAPHER KO CALL", doer: "SHIKHA", department: "HR", firstDate: "2026-06-18", latestRevision: "2026-06-20", revisions: 2, status: "Week Shifted", priority: "" },
    { taskId: "ysqh0bw", task: "PARAMJEET BALAJI COMPUTER SE GHAR KA CAMERA CHANGE KRVANA HAI", doer: "SANDEEP", department: "PS", firstDate: "2026-06-17", latestRevision: "2026-06-19", revisions: 2, status: "Week Shifted", priority: "" },
    { taskId: "lyaf3cd", task: "THIRTY MILESTONES KA LOGO BNANA HAI", doer: "KIRTI", department: "ACCOUNTS", firstDate: "2026-06-16", latestRevision: "2026-06-17", revisions: 1, status: "Completed", priority: "" },
  ],
  "2026-06-07": [
    { taskId: "qczqqgq", task: "OFFICE KI WOODEN FLOORING", doer: "SANDEEP", department: "PS", firstDate: "2026-06-07", latestRevision: "2026-06-09", revisions: 1, status: "Completed", priority: "" },
    { taskId: "9u9619h", task: "FIRE WALO SE NOC LENA HAI", doer: "DEEPAK", department: "SUPERVISOR", firstDate: "2026-06-07", latestRevision: "2026-06-09", revisions: 2, status: "Completed", priority: "" },
    { taskId: "ts17xqv", task: "CALLING MANAGEMENT (GIRL) HIRING", doer: "SHIKHA", department: "HR", firstDate: "2026-06-08", latestRevision: "2026-06-09", revisions: 1, status: "Completed", priority: "" },
    { taskId: "w0g2pkn", task: "VIDEO EDIT KARNA HAI", doer: "KIRTI", department: "ACCOUNTS", firstDate: "2026-06-08", latestRevision: "2026-06-10", revisions: 2, status: "Completed", priority: "" },
  ],
  "2026-05-31": [
    { taskId: "t2dhspz", task: "SEWERAGE WALA CONNECTION LAGWANA HAI", doer: "DEEPAK", department: "SUPERVISOR", firstDate: "2026-06-02", latestRevision: "2026-06-02", revisions: 0, status: "Completed", priority: "" },
    { taskId: "eu661ln", task: "ACCOUNTANT HIRING", doer: "SHIKHA", department: "HR", firstDate: "2026-06-01", latestRevision: "2026-06-03", revisions: 2, status: "Week Shifted", priority: "" },
    { taskId: "p1alfwu", task: "CHECKLIST (WITH DESKBOARD)", doer: "SAMIR", department: "MIS", firstDate: "2026-06-01", latestRevision: "2026-06-01", revisions: 0, status: "Completed", priority: "" },
    { taskId: "1na78fk", task: "VISHNU SAROI KO BULA KAR CUSHION DIKHANE HAI", doer: "SANDEEP", department: "PS", firstDate: "2026-06-03", latestRevision: "2026-06-06", revisions: 1, status: "Completed", priority: "" },
    { taskId: "qsmat7d", task: "THIRTY MILESTONES KA LOGO BNANA HAI", doer: "KIRTI", department: "ACCOUNTS", firstDate: "2026-06-04", latestRevision: "2026-06-04", revisions: 0, status: "Completed", priority: "" },
    { taskId: "5uc4afk", task: "AASIM OR RAJENDRA SE (B-BLOCK) 13-18 NUMBER KA LIST LE KAR TASK ADD KRNE HAI", doer: "LAXMI", department: "CRM", firstDate: "2026-06-04", latestRevision: "2026-06-05", revisions: 2, status: "Week Shifted", priority: "" },
  ],
};

// All rows across every sample week + the week list (matches the live "all"
// payload shape). The UI filters by week client-side.
export function getAllSampleData() {
  const checklist = [];
  const delegation = [];
  for (const k of Object.keys(CHECKLIST_BY_WEEK)) checklist.push(...CHECKLIST_BY_WEEK[k]);
  for (const k of Object.keys(DELEGATION_BY_WEEK)) delegation.push(...DELEGATION_BY_WEEK[k]);
  return {
    doers: SAMPLE_DOERS,
    departments: SAMPLE_DEPARTMENTS,
    fms: [],
    checklist,
    delegation,
    availableWeeks: SAMPLE_WEEKS,
  };
}
