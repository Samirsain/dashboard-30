/**
 * ThirtyMilestones MIS Dashboard — Apps Script export layer (PRD §7.1).
 *
 * Deploy this bound to the Google Sheets workbook described in PRD §5. It
 * exposes a doGet Web App endpoint that returns a JSON snapshot for a requested
 * week:
 *   { doers, departments, fms[], checklist[], delegation[], weekRange }
 *
 * SCHEMA CONTRACT (PRD §5): the header strings in SCHEMA below are EXACT,
 * case-sensitive, and trimmed. They must stay in lock-step with the frontend's
 * js/config.js HEADERS object. Renaming a header is a breaking change in both
 * places. doGet validates headers before reading and returns a clear error
 * (not silently-wrong data) on any mismatch — this is the guard against the
 * known header-mismatch failure mode (FR-3).
 *
 * Deployment: Deploy → New deployment → Web app → Execute as "Me", access
 * "Anyone". Copy the /exec URL into APPS_SCRIPT_URL in the frontend config.
 */

// ---- Schema contract -------------------------------------------------------
var SCHEMA = {
  Doers: { sheet: 'Doers', headers: ['Doer', 'Department', 'Active'] },
  Departments: { sheet: 'Departments', headers: ['Department'] },
  FMS: {
    sheet: 'FMS',
    headers: ['FMS Name', 'Step', 'Step No', 'Doer', 'Department', 'Frequency', 'Planned Date', 'Planned Time', 'Actual Date', 'Status'],
    dateCols: ['Planned Date', 'Actual Date'],
    timeCols: ['Planned Time'],
    weekCol: 'Planned Date',
  },
  Checklist: {
    sheet: 'Checklist',
    headers: ['Task', 'Doer', 'Department', 'Date', 'Status'],
    dateCols: ['Date'],
    timeCols: [],
    weekCol: 'Date',
  },
  Delegation: {
    sheet: 'Delegation',
    headers: ['Task', 'Doer', 'Given By', 'Department', 'Priority', 'Urgency', 'Planned Date', 'Completed Date', 'Status', 'Notified'],
    dateCols: ['Planned Date', 'Completed Date'],
    timeCols: [],
    boolCols: ['Notified'],
    weekCol: 'Planned Date',
  },
};

// ---- Entry point -----------------------------------------------------------
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    // Accept either ?week=YYYY-MM-DD (Sunday of the week) or ?from=&to=.
    var range = resolveWeek(params);

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Validate every required sheet's headers before reading anything (FR-3).
    var missing = [];
    Object.keys(SCHEMA).forEach(function (key) {
      missing = missing.concat(validateHeaders(ss, SCHEMA[key]));
    });
    if (missing.length) {
      return json({ error: 'Schema mismatch: required header(s) missing.', missingHeaders: missing });
    }

    var doers = readSheet(ss, SCHEMA.Doers);
    var departments = readSheet(ss, SCHEMA.Departments);
    var fms = filterByWeek(readSheet(ss, SCHEMA.FMS), SCHEMA.FMS.weekCol, range);
    var checklist = filterByWeek(readSheet(ss, SCHEMA.Checklist), SCHEMA.Checklist.weekCol, range);
    var delegation = filterByWeek(readSheet(ss, SCHEMA.Delegation), SCHEMA.Delegation.weekCol, range);

    return json({
      doers: doers,
      departments: departments,
      fms: fms,
      checklist: checklist,
      delegation: delegation,
      weekRange: range,
    });
  } catch (err) {
    return json({ error: 'Server error: ' + (err && err.message ? err.message : err) });
  }
}

// ---- Header validation (FR-3) ----------------------------------------------
// Returns an array of "Sheet → Header" strings for any missing required header.
function validateHeaders(ss, spec) {
  var sheet = ss.getSheetByName(spec.sheet);
  if (!sheet) return [spec.sheet + ' (sheet missing)'];
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return spec.headers.map(function (h) { return spec.sheet + ' → ' + h; });
  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(trim);
  var present = {};
  headerRow.forEach(function (h) { if (h) present[h] = true; });
  return spec.headers.filter(function (h) { return !present[h]; }).map(function (h) { return spec.sheet + ' → ' + h; });
}

// ---- Sheet reading ---------------------------------------------------------
// Returns rows as objects keyed by the EXACT header strings, with date/time/
// boolean columns normalised per the schema spec.
function readSheet(ss, spec) {
  var sheet = ss.getSheetByName(spec.sheet);
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return [];

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(trim);

  var dateCols = spec.dateCols || [];
  var timeCols = spec.timeCols || [];
  var boolCols = spec.boolCols || [];

  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var raw = values[r];
    // Skip fully-empty rows.
    if (raw.join('').toString().trim() === '') continue;

    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      if (!key) continue;
      var val = raw[c];
      if (dateCols.indexOf(key) !== -1) obj[key] = toISODate(val);
      else if (timeCols.indexOf(key) !== -1) obj[key] = toHM(val);
      else if (boolCols.indexOf(key) !== -1) obj[key] = toBool(val);
      else if (key === 'Active') obj[key] = toBool(val);
      else if (typeof val === 'number') obj[key] = val;
      else obj[key] = trim(val);
    }
    rows.push(obj);
  }
  return rows;
}

// ---- Week handling (FR-2) --------------------------------------------------
// Weeks are Sun–Sat (PRD Open Question 4 — adjust WEEK_START if the team uses
// Monday). `week` param is the Sunday date key; from/to override if supplied.
var WEEK_START = 0; // 0 = Sunday

function resolveWeek(params) {
  var from, to;
  if (params.from && params.to) {
    from = parseISO(params.from);
    to = parseISO(params.to);
  } else if (params.week) {
    from = parseISO(params.week);
    to = addDays(from, 6);
  } else {
    from = startOfWeek(new Date());
    to = addDays(from, 6);
  }
  return { key: toISODate(from), from: toISODate(from), to: toISODate(to), label: weekLabel(from, to) };
}

function startOfWeek(d) {
  var date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var diff = (date.getDay() - WEEK_START + 7) % 7;
  return addDays(date, -diff);
}

function filterByWeek(rows, weekCol, range) {
  if (!weekCol) return rows;
  return rows.filter(function (row) {
    var d = row[weekCol];
    if (!d) return false; // a row with no date for the week column can't be placed
    return d >= range.from && d <= range.to;
  });
}

// ---- Value normalisation (PRD §5.1) ----------------------------------------
function toISODate(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    var y = value.getFullYear();
    var m = pad(value.getMonth() + 1);
    var d = pad(value.getDate());
    return y + '-' + m + '-' + d;
  }
  var s = trim(value);
  // Already ISO?
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  var parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return toISODate(parsed);
  return s;
}

function toHM(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return pad(value.getHours()) + ':' + pad(value.getMinutes());
  }
  var s = trim(value);
  var m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return pad(parseInt(m[1], 10)) + ':' + m[2];
  return s;
}

function toBool(value) {
  if (value === true || value === false) return value;
  var s = trim(value).toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'y' || s === 'x';
}

// ---- Small utilities -------------------------------------------------------
function trim(v) { return (v === null || v === undefined) ? '' : String(v).trim(); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function parseISO(s) {
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  var d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}
function weekLabel(from, to) {
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var sameYear = from.getFullYear() === to.getFullYear();
  var left = from.getDate() + ' ' + months[from.getMonth()] + (sameYear ? '' : ' ' + from.getFullYear());
  var right = to.getDate() + ' ' + months[to.getMonth()] + ' ' + to.getFullYear();
  return left + ' – ' + right;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
