/**
 * ThirtyMilestones MIS Dashboard — Delegation notifications (PRD §7.8).
 *
 * A time-driven trigger that emails a doer when a Delegation is at-risk
 * (Urgent urgency OR High priority) and still Pending as its Planned Date
 * approaches, then sets `Notified = TRUE` to prevent duplicate emails
 * (FR-24, FR-25). This logic lives in Apps Script, not the static frontend
 * (FR-26).
 *
 * Setup: run installDailyTrigger() once (authorise when prompted). It schedules
 * notifyDelegations() to run every morning.
 *
 * Email lookup: this reads an OPTIONAL `Email` column on the Doers sheet. That
 * column is not part of the required schema contract (doGet does not need it),
 * but notifications require an address. If a doer has no email, the item is
 * reported to MANAGER_EMAIL instead so nothing is silently dropped.
 */

// ---- Config ----------------------------------------------------------------
var MANAGER_EMAIL = Session.getActiveUser().getEmail(); // fallback recipient
var NOTIFY_WINDOW_DAYS = 1; // notify when Planned Date is within N days (incl. overdue)
var DELEGATION_SHEET = 'Delegation';
var DOERS_SHEET = 'Doers';

// ---- Trigger installer (run once) ------------------------------------------
function installDailyTrigger() {
  // Remove any existing triggers for this function to avoid duplicates.
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'notifyDelegations') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('notifyDelegations').timeBased().everyDays(1).atHour(8).create();
}

// ---- Main job --------------------------------------------------------------
function notifyDelegations() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DELEGATION_SHEET);
  if (!sheet) return;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var col = indexMap(headers, ['Task', 'Doer', 'Priority', 'Urgency', 'Planned Date', 'Status', 'Notified']);
  if (col['Notified'] === -1 || col['Status'] === -1) return; // contract not met; doGet will flag

  var emailByDoer = buildEmailMap(ss);
  var today = startOfDay(new Date());
  var cutoff = addDays(today, NOTIFY_WINDOW_DAYS);

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var status = String(row[col['Status']]).trim();
    var notified = toBool(row[col['Notified']]);
    if (status === 'Completed' || notified) continue;

    var priority = String(row[col['Priority']]).trim();
    var urgency = String(row[col['Urgency']]).trim();
    var atRisk = (urgency === 'Urgent') || (priority === 'High');
    if (!atRisk) continue;

    var plannedISO = toISODate(row[col['Planned Date']]);
    var planned = plannedISO ? parseISO(plannedISO) : null;
    if (!planned || planned > cutoff) continue; // not due yet

    var doer = String(row[col['Doer']]).trim();
    var task = String(row[col['Task']]).trim();
    var recipient = emailByDoer[doer] || MANAGER_EMAIL;

    sendNotification(recipient, doer, task, priority, urgency, plannedISO, !emailByDoer[doer]);

    // Mark Notified = TRUE so we never email twice (FR-25). +1 for 1-based rows.
    sheet.getRange(r + 1, col['Notified'] + 1).setValue(true);
  }
}

// ---- Helpers ---------------------------------------------------------------
function sendNotification(to, doer, task, priority, urgency, plannedISO, viaManager) {
  var subject = '[ThirtyMilestones] Action needed: ' + task;
  var lines = [
    'Hi ' + (viaManager ? 'Manager' : doer) + ',',
    '',
    (viaManager ? 'No email on file for ' + doer + '. ' : '') + 'The following delegated task is still pending and approaching its target date:',
    '',
    '  Task:     ' + task,
    '  Assigned: ' + doer,
    '  Priority: ' + priority,
    '  Urgency:  ' + urgency,
    '  Target:   ' + plannedISO,
    '',
    'Please complete it or update its status in the sheet.',
    '',
    '— ThirtyMilestones MIS Dashboard (automated)',
  ];
  MailApp.sendEmail(to, subject, lines.join('\n'));
}

function buildEmailMap(ss) {
  var map = {};
  var sheet = ss.getSheetByName(DOERS_SHEET);
  if (!sheet) return map;
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return map;
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var di = headers.indexOf('Doer');
  var ei = headers.indexOf('Email'); // optional column
  if (di === -1 || ei === -1) return map;
  for (var r = 1; r < values.length; r++) {
    var name = String(values[r][di]).trim();
    var email = String(values[r][ei]).trim();
    if (name && email) map[name] = email;
  }
  return map;
}

function indexMap(headers, names) {
  var m = {};
  names.forEach(function (n) { m[n] = headers.indexOf(n); });
  return m;
}

// Date utilities (kept local so this file is self-contained alongside Code.gs).
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function parseISO(s) {
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)) : new Date(s);
}
function toISODate(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return value.getFullYear() + '-' + p(value.getMonth() + 1) + '-' + p(value.getDate());
  }
  var s = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.substring(0, 10) : s;
}
function toBool(value) {
  if (value === true || value === false) return value;
  var s = String(value).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'y' || s === 'x';
}
