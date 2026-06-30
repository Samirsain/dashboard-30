/**
 * ThirtyMilestones MIS — unified export layer (Apps Script Web App).
 *
 * Reads the team's real Google Sheets BY ID, normalises them, and returns ONE
 * JSON payload that the dashboard consumes:
 *   { doers, departments, fms[], checklist[], delegation[], weekRange }
 *
 * Sources (all owned by mis.thirtymilestones@gmail.com):
 *   • TASKLIST  sheet → Delegation  (Task ID, Name, Task, First Date,
 *                       Total Revisions, Latest Revision, Status, Priority)
 *   • CHECKLIST sheet → Checklist   ("Master" tab: Name, Department, Freq,
 *                       Task, Planned, Actual, Status)
 *   • FMS       sheet → (add the ID below when ready)
 *
 * DEPLOY: create a STANDALONE Apps Script project (script.google.com → New
 * project), paste this file, then Deploy → New deployment → Web app →
 * Execute as "Me" (an account that can open all three sheets) → Access
 * "Anyone". Put the /exec URL into APPS_SCRIPT_URL in src/lib/config.js.
 */

// ---- CONFIG: sheet IDs (from each sheet's URL) -----------------------------
var SHEET_IDS = {
  delegation: "18oRnMXPB8A18rQxIcQr4iAPA2yTGrkebJXsNOBPSRkQ", // TASKLIST
  checklist: "1_KqWP8imc199iwjJ_ZOZc0tQeb-XkfSukgrSsEV_-ls", // CHECKLIST
  fms: "", // add the FMS sheet ID later
  doers: "1v0rd9bLwj_-z9r5TzlNl1bsIYjfE-BtooRpAtyhndBc", // DOERS LIST sheet
};

// Doers spelt differently across sheets are merged to one canonical name.
var DOER_ALIAS = { SANDEP: "SANDEEP", "SAHIL SIR": "SAHIL" };

// Ex-staff — dropped from the output entirely (canonical UPPERCASE names).
// "SAHIL" also covers "SAHIL SIR" via DOER_ALIAS.
var EXCLUDED_DOERS = { LAXMI: true, KIRTI: true, SAHIL: true };
function isExcludedDoer(name) { return !!EXCLUDED_DOERS[canonical(name)]; }

var WEEK_START = 0; // 0 = Sunday

// Bump this whenever Code.gs changes. To confirm a deployment is actually live,
// open  <web-app-url>?version=1  in a browser — it should echo this string.
// If it shows an older value (or 404s), the /exec URL is still serving old code
// and you must redeploy: Deploy > Manage deployments > (edit) > New version.
var SCRIPT_VERSION = "2026-06-30-cache-v5";

// ---- Entry point -----------------------------------------------------------
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};

    // Deploy check: ?version=1 (or ?ping=1) echoes the running code version so
    // you can verify the live /exec URL has the latest code.
    if (params.version || params.ping) {
      return json({ ok: true, version: SCRIPT_VERSION });
    }

    // Dynamic sheet read: ?sheetId=XXX&type=tasklist|checklist
    // Used by the Sheet Connections manager to read additional linked sheets.
    if (params.sheetId && params.type) {
      return handleDynamicSheet(params.sheetId, params.type);
    }

    // Default = ALL data (frontend does week filtering). A specific ?week=KEY
    // still filters server-side for back-compat (and skips the cache).
    var wantAll = !params.week || params.week === "all";

    // FAST PATH: serve the cached full payload, skipping the slow sheet read.
    // The cache is cleared on every write (doPost) and refreshed by the keepWarm
    // time-trigger, so it stays fresh. ?nocache=1 forces a rebuild.
    if (wantAll && params.nocache !== "1") {
      var cachedStr = getCachedPayload();
      if (cachedStr) return jsonRaw(cachedStr);
    }

    var payloadStr = buildMainPayloadString(params, wantAll);
    if (wantAll) setCachedPayload(payloadStr);
    return jsonRaw(payloadStr);
  } catch (err) {
    return json({ error: "Server error: " + (err && err.message ? err.message : err) });
  }
}

// Build the full dashboard payload as a JSON STRING (so it can be cached as-is).
// This is the expensive part — it reads the Checklist + Task List sheets.
function buildMainPayloadString(params, wantAll) {
  var doerMap = {}; // canonical doer -> { doer, department, email }
  var checklist = readChecklist(doerMap);
  var delegation = readDelegation(doerMap);
  var fms = readFms(doerMap);

  // Drop ex-staff from rows and the doer list.
  checklist = checklist.filter(function (r) { return !isExcludedDoer(r.doer); });
  delegation = delegation.filter(function (r) { return !isExcludedDoer(r.doer); });
  fms = fms.filter(function (r) { return !isExcludedDoer(r.doer); });
  Object.keys(doerMap).forEach(function (k) { if (isExcludedDoer(k)) delete doerMap[k]; });

  // Recurring checklists are pre-expanded months ahead; keep only up to the end
  // of the current week so future blank rows don't flood the view.
  var horizon = toISODate(addDays(startOfWeek(new Date()), 6));
  checklist = checklist.filter(function (r) { return r.planned && r.planned <= horizon; });

  var doers = Object.keys(doerMap).map(function (k) { return doerMap[k]; }).sort(byDoer);
  var departments = uniqueDepartments(doers);
  var weeks = buildWeeks(checklist, delegation);

  var range = wantAll ? { key: "all", label: "All weeks", from: "", to: "" } : resolveWeek(params);
  var filt = function (rows, field) { return wantAll ? rows : filterByDate(rows, field, range); };

  // Shared config (connections + per-doer access) so every device renders the
  // same modules/permissions. Connection ROW data is fetched lazily by the client.
  var config = getSharedConfig();

  return JSON.stringify({
    scriptVersion: SCRIPT_VERSION,
    config: config,
    doers: doers,
    departments: departments,
    fms: filt(fms, "plannedOrFirst"),
    checklist: filt(checklist, "planned"),
    delegation: filt(delegation, "firstDate"),
    availableWeeks: weeks,
    weekRange: range,
    cachedAt: new Date().toISOString(),
  });
}

function jsonRaw(str) {
  return ContentService.createTextOutput(str).setMimeType(ContentService.MimeType.JSON);
}

// ---- Payload cache (CacheService) ------------------------------------------
// The built payload can exceed CacheService's 100KB-per-key limit, so it's
// stored in ~95KB chunks plus a count key. Cleared on every write; refreshed by
// the keepWarm trigger. This is what makes repeat loads near-instant.
var PAYLOAD_CACHE_PREFIX = "pl_v1_";
var PAYLOAD_CACHE_TTL = 21600; // seconds (6h max) — kept fresh by writes + keepWarm

function getCachedPayload() {
  try {
    var cache = CacheService.getScriptCache();
    var meta = cache.get(PAYLOAD_CACHE_PREFIX + "n");
    if (!meta) return null;
    var n = parseInt(meta, 10);
    if (!n || n < 1) return null;
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(PAYLOAD_CACHE_PREFIX + i);
    var parts = cache.getAll(keys);
    var out = "";
    for (var j = 0; j < n; j++) {
      var p = parts[PAYLOAD_CACHE_PREFIX + j];
      if (p == null) return null; // a chunk expired → treat as a full miss
      out += p;
    }
    return out;
  } catch (e) {
    return null;
  }
}

function setCachedPayload(str) {
  try {
    var cache = CacheService.getScriptCache();
    var CHUNK = 95000; // stay under the 100KB-per-key limit
    var n = Math.ceil(str.length / CHUNK) || 1;
    var obj = {};
    for (var i = 0; i < n; i++) obj[PAYLOAD_CACHE_PREFIX + i] = str.substring(i * CHUNK, (i + 1) * CHUNK);
    obj[PAYLOAD_CACHE_PREFIX + "n"] = String(n);
    cache.putAll(obj, PAYLOAD_CACHE_TTL);
  } catch (e) {
    /* cache unavailable — fall back to live build */
  }
}

function clearCachedPayload() {
  try {
    var cache = CacheService.getScriptCache();
    var meta = cache.get(PAYLOAD_CACHE_PREFIX + "n");
    var n = meta ? parseInt(meta, 10) : 0;
    var keys = [PAYLOAD_CACHE_PREFIX + "n"];
    for (var i = 0; i < n; i++) keys.push(PAYLOAD_CACHE_PREFIX + i);
    cache.removeAll(keys);
  } catch (e) {
    /* ignore */
  }
}

// Time-trigger target. Add a 5-minute time-driven trigger on this function
// (Apps Script → Triggers → Add Trigger → keepWarm → Time-driven → Minutes →
// Every 5 minutes). It rebuilds the cache so loads always hit a warm cache and
// edits made directly in the sheet appear within ~5 minutes.
function keepWarm() {
  try { setCachedPayload(buildMainPayloadString({}, true)); } catch (e) { /* ignore */ }
}

// Read a dynamically-linked sheet (from the Sheet Connections admin panel).
// Returns { delegation: [...] } or { checklist: [...] } — same row shapes as
// the main readDelegation / readChecklist so the frontend can reuse all the
// same analytics and table components.
function handleDynamicSheet(sheetId, type) {
  try {
    var doerMap = {};
    var rows;
    if (type === "tasklist" || type === "delegation") {
      rows = readDelegationFromId(sheetId, doerMap);
      rows = rows.filter(function (r) { return !isExcludedDoer(r.doer); });
      return json({ delegation: rows });
    } else if (type === "checklist") {
      rows = readChecklistFromId(sheetId, doerMap);
      rows = rows.filter(function (r) { return !isExcludedDoer(r.doer); });
      return json({ checklist: rows });
    }
    return json({ error: "Unknown type: " + type });
  } catch (err) {
    return json({ error: "Dynamic sheet error: " + (err && err.message ? err.message : err) });
  }
}

function readDelegationFromId(sheetId, doerMap) {
  var ss = openOrNull(sheetId);
  if (!ss) return [];
  registerDoerList(ss, doerMap);
  var rows = tryReadTable(ss, ["Task ID", "Total Revisions", "Status", "First Date"]);
  var mapped = rows.map(function (r) {
    var doer = canonical(r["Name"]);
    return {
      taskId: trim(r["Task ID"]),
      task: trim(r["Task"]),
      doer: doer,
      department: deptOf(doerMap, doer),
      firstDate: toISODate(r["First Date"]),
      latestRevision: toISODate(r["Latest Revision"]),
      revisions: toInt(r["Total Revisions"]),
      status: trim(r["Status"]) || "Pending",
      priority: trim(r["Priority"]),
    };
  });
  return deduplicateDelegation(mapped);
}

function readChecklistFromId(sheetId, doerMap) {
  var ss = openOrNull(sheetId);
  if (!ss) return [];
  registerDoerList(ss, doerMap);
  var rows = tryReadTable(ss, ["Task ID", "Planned", "Actual", "Status", "Task"]);
  var horizon = toISODate(addDays(startOfWeek(new Date()), 6));
  return rows
    .map(function (r) {
      var doer = canonical(r["Name"]);
      var status = String(r["Status"]).trim() === "Done" || trim(r["Actual"]) ? "Done" : "Pending";
      return {
        taskId: trim(r["Task ID"]),
        task: trim(r["Task"]),
        doer: doer,
        department: trim(r["Department"]) || deptOf(doerMap, doer),
        frequency: expandFreq(r["Freq"]),
        planned: toISODate(r["Planned"]),
        actual: toISODate(r["Actual"]),
        status: status,
      };
    })
    .filter(function (r) { return r.planned && r.planned <= horizon; });
}

// ---- Write: add a task (doPost) --------------------------------------------
// The dashboard's "Add Task" form POSTs JSON here. We append one row to the
// correct sheet/tab, mapping values to columns by their header name (so column
// order or extra columns don't matter). A shared token blocks casual abuse.
var WRITE_TOKEN = "TM30-WRITE"; // must match WRITE_TOKEN in src/lib/config.js

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);

    if (WRITE_TOKEN && String(body.token) !== WRITE_TOKEN) {
      return json({ ok: false, error: "Unauthorized" });
    }

    var action = String(body.action || "add").toLowerCase();
    var result;
    if (action === "complete") result = completeTask(body);
    else if (action === "revise") result = reviseTask(body);
    else if (action === "adddoer") result = addDoerRow(body);
    else if (action === "removedoer") result = removeDoerRow(body);
    else if (action === "saveconfig") result = saveSharedConfig(body);
    else result = addTaskRow(body);

    // Data (or config) changed — drop the cached payload so the next load
    // rebuilds fresh instead of serving stale rows.
    clearCachedPayload();
    return result;
  } catch (err) {
    return json({ ok: false, error: "Server error: " + (err && err.message ? err.message : err) });
  }
}

// ---- Shared app config (cross-device) --------------------------------------
// The dashboard's sheet connections and per-doer access used to live only in
// each browser's localStorage, so an assignment made on the admin's laptop was
// invisible on a doer's laptop. We now persist that config server-side in
// ScriptProperties (shared across every web-app user) and hand it back on each
// load, so every device sees the same connections and permissions.
var CONFIG_KEY = "APP_CONFIG_V1";

function getSharedConfig() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(CONFIG_KEY);
    if (!raw) return { connections: [], access: {} };
    var parsed = JSON.parse(raw);
    return {
      connections: parsed && parsed.connections ? parsed.connections : [],
      access: parsed && parsed.access ? parsed.access : {},
    };
  } catch (e) {
    return { connections: [], access: {} };
  }
}

// Persist the config sent by an admin device. Only known keys are stored.
function saveSharedConfig(body) {
  var cfg = body.config;
  if (!cfg || typeof cfg !== "object") return json({ ok: false, error: "No config provided." });
  var clean = {
    connections: (cfg.connections && cfg.connections.length) ? cfg.connections : [],
    access: (cfg.access && typeof cfg.access === "object") ? cfg.access : {},
  };
  try {
    PropertiesService.getScriptProperties().setProperty(CONFIG_KEY, JSON.stringify(clean));
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "Could not save config: " + (e && e.message ? e.message : e) });
  }
}

// Read every active connected sheet server-side and return its rows keyed by
// moduleSlug. Doing this in the same request the dashboard already makes turns
// N+1 round-trips (one per connection) into one — the main reason the board felt
// slow when sheets were attached.
function readConnectionsData(config) {
  var out = {};
  var conns = (config && config.connections) ? config.connections : [];
  for (var i = 0; i < conns.length; i++) {
    var c = conns[i];
    if (!c || !c.active || !c.sheetId || !c.moduleSlug) continue;
    // Only sheets served by THIS web app (no custom scriptUrl) can be read here.
    if (c.scriptUrl) continue;
    try {
      var doerMap = {};
      var rows = (c.sheetType === "checklist")
        ? readChecklistFromId(c.sheetId, doerMap)
        : readDelegationFromId(c.sheetId, doerMap);
      out[c.moduleSlug] = rows.filter(function (r) { return !isExcludedDoer(r.doer); });
    } catch (e) {
      // A bad sheet ID shouldn't break the whole dashboard load.
      out[c.moduleSlug] = [];
    }
  }
  return out;
}

// Append a brand-new task row (Status = Pending).
function addTaskRow(body) {
  var system = String(body.system || "tasklist").toLowerCase();
  var task = trim(body.task);
  var doer = trim(body.doer);
  if (!task) return json({ ok: false, error: "Task description is required." });
  if (!doer) return json({ ok: false, error: "Please choose who the task is for." });

  var id = trim(body.taskId) || genId();
  var iso = body.date ? toISODate(body.date) : toISODate(new Date());
  var dateVal = isoToDate(iso); // real Date so the sheet stores a date cell

  // Pull the doer's phone + email from the Doer List so the existing Task List
  // tool's reminders fire on dashboard-added tasks too (columns filled only if
  // the target tab actually has "Number" / "Email").
  var contact = lookupDoerContact(doer);

  // Use a custom sheetId when adding to a connected sheet (Sheet Connections feature).
  var customSheetId = trim(body.sheetId);

  if (system === "checklist") {
    var cs = openOrNull(customSheetId || SHEET_IDS.checklist);
    if (!cs) return json({ ok: false, error: "Checklist sheet not configured." });
    appendByHeaders(cs, ["Task ID", "Planned", "Actual", "Status", "Task"], {
      "Task ID": id,
      "Name": doer,
      "Number": contact.number,
      "Email": contact.email,
      "Email Address": contact.email,
      "Department": trim(body.department) || contact.department,
      "Freq": freqCode(body.frequency),
      "Task": task,
      "Planned": dateVal,
      "Actual": "",
      "Status": "Pending",
    });
  } else {
    var ds = openOrNull(customSheetId || SHEET_IDS.delegation);
    if (!ds) return json({ ok: false, error: "Task List sheet not configured." });
    appendByHeaders(ds, ["Task ID", "Total Revisions", "Status", "First Date"], {
      "Task ID": id,
      "Name": doer,
      "Number": contact.number,
      "Email": contact.email,
      "Email Address": contact.email,
      "Task": task,
      "First Date": dateVal,
      "Total Revisions": 0,
      "Latest Revision": "",
      "Status": "Pending",
      "Priority": trim(body.priority),
    });
  }

  return json({ ok: true, taskId: id });
}

// Add a new doer to the Doers sheet.
// body: { name, department, mobile, email, username, password }
function addDoerRow(body) {
  var ds = openOrNull(SHEET_IDS.doers);
  if (!ds) return json({ ok: false, error: "Doers sheet not configured." });
  var name = trim(body.name);
  if (!name) return json({ ok: false, error: "Doer name is required." });
  try {
    appendByHeaders(ds, ["NAME"], {
      "NAME": name,
      "DEPARTMENT": trim(body.department),
      "MOBILE NO": trim(body.mobile),
      "EMAIL ID": trim(body.email),
      "USER ID": trim(body.username),
      "PASSWORD": trim(body.password),
    });
    return json({ ok: true });
  } catch (err) {
    // If tab has no headers yet, create them first
    var sheets = ds.getSheets();
    var sheet = sheets[0];
    sheet.appendRow(["NAME", "DEPARTMENT", "EMAIL ID", "MOBILE NO", "USER ID", "PASSWORD"]);
    sheet.appendRow([name, trim(body.department), trim(body.email), trim(body.mobile), trim(body.username), trim(body.password)]);
    return json({ ok: true });
  }
}

// Remove a doer row from the Doers sheet (by NAME match).
// body: { name }
function removeDoerRow(body) {
  var ds = openOrNull(SHEET_IDS.doers);
  if (!ds) return json({ ok: false, error: "Doers sheet not configured." });
  var name = canonical(body.name);
  if (!name) return json({ ok: false, error: "Doer name is required." });
  var sheets = ds.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;
    var values = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
    var headerIdx = -1;
    // find header row that has NAME column
    for (var i = 0; i < Math.min(values.length, 8); i++) {
      var hdrs = values[i].map(trim);
      if (hdrs.indexOf("NAME") !== -1 || hdrs.indexOf("Name") !== -1) { headerIdx = i; break; }
    }
    if (headerIdx === -1) continue;
    var headers = values[headerIdx].map(trim);
    var nameCol = headers.indexOf("NAME") !== -1 ? headers.indexOf("NAME") : headers.indexOf("Name");
    for (var r = lastRow - 1; r > headerIdx; r--) {
      if (canonical(values[r][nameCol]) === name) {
        sheet.deleteRow(r + 1);
        return json({ ok: true });
      }
    }
  }
  return json({ ok: false, error: "Doer not found in sheet." });
}

// Look up a doer's phone number, email and department from the Doer Lists.
// TASKLIST Doer List has Name+Number(+Email); CHECKLIST has Name+Department+Email.
function lookupDoerContact(doerName) {
  var out = { number: "", email: "", department: "" };
  var canon = canonical(doerName);
  if (!canon) return out;

  // Phone + email come from the TASKLIST Doer List (Name + Number).
  var ds = openOrNull(SHEET_IDS.delegation);
  if (ds) {
    var rows = tryReadTable(ds, ["Name", "Number"]);
    for (var i = 0; i < rows.length; i++) {
      if (canonical(rows[i]["Name"]) === canon) {
        out.number = trim(rows[i]["Number"]);
        out.email = trim(rows[i]["Email"]) || trim(rows[i]["Email Address"]);
        break;
      }
    }
  }
  // Department (and a fallback email) come from the CHECKLIST Doer List.
  var cs = openOrNull(SHEET_IDS.checklist);
  if (cs) {
    var rows2 = tryReadTable(cs, ["Name", "Email Address"]);
    for (var j = 0; j < rows2.length; j++) {
      if (canonical(rows2[j]["Name"]) === canon) {
        out.department = trim(rows2[j]["Department"]);
        if (!out.email) out.email = trim(rows2[j]["Email Address"]) || trim(rows2[j]["Email"]);
        break;
      }
    }
  }
  return out;
}

// Mark an existing task complete. Finds the row by Task ID; if that's missing
// (some checklist rows have no ID), falls back to matching Name + Task + date.
// Writes the proper "done" values back to the master sheet.
function completeTask(body) {
  var system = String(body.system || "tasklist").toLowerCase();
  var matcher = {
    taskId: trim(body.taskId),
    doer: canonical(body.doer),
    task: trim(body.task),
    dateVal: body.date ? toISODate(body.date) : "",
  };
  var doneDate = isoToDate(toISODate(new Date()));

  var customSheetId = trim(body.sheetId);
  var ss, headers, setVals;
  if (system === "checklist") {
    ss = openOrNull(customSheetId || SHEET_IDS.checklist);
    headers = ["Task ID", "Planned", "Actual", "Status", "Task"];
    matcher.dateField = "Planned";
    setVals = { "Status": "Done", "Actual": doneDate };
  } else {
    ss = openOrNull(customSheetId || SHEET_IDS.delegation);
    headers = ["Task ID", "Total Revisions", "Status", "First Date"];
    matcher.dateField = "First Date";
    setVals = { "Status": "Completed", "Latest Revision": doneDate };
  }
  if (!ss) return json({ ok: false, error: "Sheet not configured." });

  var ok = updateRow(ss, headers, matcher, setVals);
  return ok ? json({ ok: true }) : json({ ok: false, error: "Task row not found to mark done." });
}

// Reschedule a pending task to a new date. Task List → bumps "Latest Revision"
// to the new date and increments "Total Revisions"; Checklist → moves "Planned".
// Status stays as-is (still pending).
function reviseTask(body) {
  var system = String(body.system || "tasklist").toLowerCase();
  var newIso = body.newDate ? toISODate(body.newDate) : "";
  if (!newIso) return json({ ok: false, error: "New date is required to revise." });
  var newDateVal = isoToDate(newIso);

  var matcher = {
    taskId: trim(body.taskId),
    doer: canonical(body.doer),
    task: trim(body.task),
    dateVal: body.date ? toISODate(body.date) : "",
  };

  var customSheetId = trim(body.sheetId);
  var ss, headers, setVals, incHeaders;
  if (system === "checklist") {
    ss = openOrNull(customSheetId || SHEET_IDS.checklist);
    headers = ["Task ID", "Planned", "Actual", "Status", "Task"];
    matcher.dateField = "Planned";
    setVals = { "Planned": newDateVal };
    incHeaders = [];
  } else {
    ss = openOrNull(customSheetId || SHEET_IDS.delegation);
    headers = ["Task ID", "Total Revisions", "Status", "First Date"];
    matcher.dateField = "First Date";
    // Latest Revision = the new (revised) date — this becomes the task's due in
    // the dashboard. Status -> "Week Shifted" matches the sheet's own convention
    // for a revised/pending task, so the row reads consistently in both places
    // and is never mistaken for Completed.
    setVals = { "Latest Revision": newDateVal, "Status": "Week Shifted" };
    incHeaders = ["Total Revisions"];
  }
  if (!ss) return json({ ok: false, error: "Sheet not configured." });

  var ok = updateRow(ss, headers, matcher, setVals, incHeaders);
  return ok ? json({ ok: true }) : json({ ok: false, error: "Task row not found to revise." });
}

// Find a row (by Task ID, else by Name+Task+date) and set the given columns.
// Headers listed in incrementHeaders get their numeric value bumped by 1.
// Matching strategy (in order):
//   1. Task ID (exact) — fastest, most reliable.
//   2. Name + Task + Date — handles rows without a Task ID.
//   3. Name + Task only  — fallback when date is blank or mismatched; picks the
//      first non-completed row so we don't accidentally touch a done duplicate.
function updateRow(ss, requiredHeaders, matcher, valuesByHeader, incrementHeaders) {
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) continue;
    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var hIdx = findHeaderRow(values, requiredHeaders);
    if (hIdx === -1) continue;
    var headers = values[hIdx].map(trim);
    var idCol = headers.indexOf("Task ID");
    var nameCol = headers.indexOf("Name");
    var taskCol = headers.indexOf("Task");
    var dateCol = headers.indexOf(matcher.dateField);
    var statusCol = headers.indexOf("Status");

    var foundRow = -1;

    // --- Strategy 1: Task ID match ---
    if (matcher.taskId && idCol !== -1) {
      for (var r = hIdx + 1; r < values.length; r++) {
        if (trim(values[r][idCol]) === matcher.taskId) { foundRow = r; break; }
      }
    }

    // --- Strategy 2: Name + Task + Date ---
    if (foundRow === -1 && matcher.doer && nameCol !== -1 && taskCol !== -1 && matcher.dateVal && dateCol !== -1) {
      for (var r2 = hIdx + 1; r2 < values.length; r2++) {
        var nameOk2 = canonical(values[r2][nameCol]) === matcher.doer;
        var taskOk2 = trim(values[r2][taskCol]).toUpperCase() === matcher.task.toUpperCase();
        var dateOk2 = toISODate(values[r2][dateCol]) === matcher.dateVal;
        if (nameOk2 && taskOk2 && dateOk2) { foundRow = r2; break; }
      }
    }

    // --- Strategy 3: Name + Task only (date-agnostic fallback) ---
    // Picks the first non-completed row to avoid touching a done duplicate.
    if (foundRow === -1 && matcher.doer && nameCol !== -1 && taskCol !== -1) {
      var lastResortRow = -1;
      for (var r3 = hIdx + 1; r3 < values.length; r3++) {
        var nameOk3 = canonical(values[r3][nameCol]) === matcher.doer;
        var taskOk3 = trim(values[r3][taskCol]).toUpperCase() === matcher.task.toUpperCase();
        if (!nameOk3 || !taskOk3) continue;
        var rowStatus = statusCol !== -1 ? trim(values[r3][statusCol]).toUpperCase() : "";
        var isDone = rowStatus === "COMPLETED" || rowStatus === "DONE";
        if (!isDone) { foundRow = r3; break; }           // prefer pending row
        if (lastResortRow === -1) lastResortRow = r3;     // remember done row as fallback
      }
      if (foundRow === -1) foundRow = lastResortRow;      // nothing pending found
    }

    if (foundRow === -1) continue;

    for (var c = 0; c < headers.length; c++) {
      var h = headers[c];
      if (!h) continue;
      if (valuesByHeader.hasOwnProperty(h)) {
        sheet.getRange(foundRow + 1, c + 1).setValue(valuesByHeader[h]);
      }
      if (incrementHeaders && incrementHeaders.indexOf(h) !== -1) {
        sheet.getRange(foundRow + 1, c + 1).setValue(toInt(values[foundRow][c]) + 1);
      }
    }
    return true;
  }
  return false;
}

// Append a row to the tab that has requiredHeaders, placing each value under the
// column whose header matches its key (unmapped columns stay blank).
function appendByHeaders(ss, requiredHeaders, valuesByHeader) {
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) continue;
    var head = sheet.getRange(1, 1, Math.min(lastRow, 8), lastCol).getValues();
    var headerRowIdx = findHeaderRow(head, requiredHeaders);
    if (headerRowIdx === -1) continue;
    var headers = head[headerRowIdx].map(trim);
    var row = [];
    for (var c = 0; c < lastCol; c++) {
      var h = headers[c];
      row.push(h && valuesByHeader.hasOwnProperty(h) ? valuesByHeader[h] : "");
    }
    sheet.getRange(lastRow + 1, 1, 1, lastCol).setValues([row]);
    return true;
  }
  throw new Error('No tab has headers: ' + requiredHeaders.join(", "));
}

function genId() { return "t" + Math.random().toString(36).slice(2, 9); }

function freqCode(v) {
  var s = trim(v).toUpperCase();
  if (s === "DAILY" || s === "D") return "D";
  if (s === "WEEKLY" || s === "W") return "W";
  if (s === "MONTHLY" || s === "M") return "M";
  return ""; // One-time / blank
}

function isoToDate(iso) {
  var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date();
}

// Weeks (Sunday-start) spanning the data, newest first — drives the selector.
function buildWeeks(checklist, delegation) {
  var dates = [];
  checklist.forEach(function (r) { if (r.planned) dates.push(r.planned); });
  delegation.forEach(function (r) { if (r.firstDate) dates.push(r.firstDate); });
  if (!dates.length) return [];
  dates.sort();
  var start = startOfWeek(parseISO(dates[0]));
  var weeks = [];
  var cur = startOfWeek(parseISO(dates[dates.length - 1])); // newest
  var guard = 0;
  while (cur >= start && guard++ < 400) {
    var to = addDays(cur, 6);
    weeks.push({ key: toISODate(cur), from: toISODate(cur), to: toISODate(to), label: weekLabel(cur, to) });
    cur = addDays(cur, -7);
  }
  return weeks;
}

// ---- Checklist (CHECKLIST sheet → "Master" tab) ----------------------------
function readChecklist(doerMap) {
  var ss = openOrNull(SHEET_IDS.checklist);
  if (!ss) return [];
  registerDoerList(ss, doerMap); // CHECKLIST Doer List has departments

  var rows = readTable(ss, ["Task ID", "Planned", "Actual", "Status", "Task"]); // → "Master"
  return rows.map(function (r) {
    var doer = canonical(r["Name"]);
    var status = String(r["Status"]).trim() === "Done" || trim(r["Actual"]) ? "Done" : "Pending";
    return {
      taskId: trim(r["Task ID"]),
      task: trim(r["Task"]),
      doer: doer,
      department: trim(r["Department"]) || deptOf(doerMap, doer),
      frequency: expandFreq(r["Freq"]),
      planned: toISODate(r["Planned"]),
      actual: toISODate(r["Actual"]),
      status: status,
    };
  });
}

// ---- Delegation (TASKLIST sheet → tasklist tab) ----------------------------
function readDelegation(doerMap) {
  var ss = openOrNull(SHEET_IDS.delegation);
  if (!ss) return [];
  registerDoerList(ss, doerMap);

  var rows = readTable(ss, ["Task ID", "Total Revisions", "Status", "First Date"]);
  var mapped = rows.map(function (r) {
    var doer = canonical(r["Name"]);
    return {
      taskId: trim(r["Task ID"]),
      task: trim(r["Task"]),
      doer: doer,
      department: deptOf(doerMap, doer),
      firstDate: toISODate(r["First Date"]),
      latestRevision: toISODate(r["Latest Revision"]),
      revisions: toInt(r["Total Revisions"]),
      status: trim(r["Status"]) || "Pending",
      priority: trim(r["Priority"]),
    };
  });
  return deduplicateDelegation(mapped);
}

// Deduplicate delegation rows: when the same Task ID appears multiple times
// (happens after retry clicks create duplicate rows), keep the "best" row —
// Completed > Week Shifted > Pending. On equal status, prefer the row with
// the most recent activity (max of firstDate and latestRevision).
function deduplicateDelegation(rows) {
  var statusScore = function(s) {
    s = String(s || "").trim().toUpperCase();
    if (s === "COMPLETED") return 3;
    if (s === "WEEK SHIFTED") return 2;
    return 1; // Pending or anything else
  };
  var activityOf = function(r) {
    var a = r.firstDate || "";
    var b = r.latestRevision || "";
    return a > b ? a : b;
  };

  // Deduplicate by Task ID (for rows that have a non-blank ID).
  var byId = {};
  var noId = [];
  rows.forEach(function(r) {
    var id = r.taskId;
    if (!id) { noId.push(r); return; }
    var existing = byId[id];
    if (!existing) { byId[id] = r; return; }
    var rScore = statusScore(r.status);
    var eScore = statusScore(existing.status);
    if (rScore > eScore || (rScore === eScore && activityOf(r) > activityOf(existing))) {
      byId[id] = r;
    }
  });

  // For no-ID rows, deduplicate by canonical Doer+Task key.
  var byKey = {};
  noId.forEach(function(r) {
    var key = String(r.doer || "").toUpperCase() + "||" + String(r.task || "").toUpperCase();
    var existing = byKey[key];
    if (!existing) { byKey[key] = r; return; }
    var rScore = statusScore(r.status);
    var eScore = statusScore(existing.status);
    if (rScore > eScore || (rScore === eScore && activityOf(r) >= activityOf(existing))) {
      byKey[key] = r;
    }
  });

  // Merge: ID-keyed rows override no-ID rows on the same Doer+Task.
  var finalByKey = {};
  Object.keys(byKey).forEach(function(k) { finalByKey[k] = byKey[k]; });
  Object.keys(byId).forEach(function(id) {
    var r = byId[id];
    var key = String(r.doer || "").toUpperCase() + "||" + String(r.task || "").toUpperCase();
    var existing = finalByKey[key];
    if (!existing) { finalByKey[key] = r; return; }
    var rScore = statusScore(r.status);
    var eScore = statusScore(existing.status);
    if (rScore > eScore || (rScore === eScore && activityOf(r) >= activityOf(existing))) {
      finalByKey[key] = r;
    }
  });

  return Object.keys(finalByKey).map(function(k) { return finalByKey[k]; });
}


// ---- FMS (optional; wired in once the sheet ID is set) ---------------------
function readFms(doerMap) {
  var ss = openOrNull(SHEET_IDS.fms);
  if (!ss) return [];
  registerDoerList(ss, doerMap);
  // TODO: map the FMS sheet's columns here when its structure is known.
  return [];
}

// ---- Doer registry ---------------------------------------------------------
// Reads a sheet's "Doer List" tab (headers vary) and folds doers into doerMap.
function registerDoerList(ss, doerMap) {
  // Match the Doer List by columns unique to it ("Number" in TASKLIST,
  // "Email Address" in CHECKLIST) so we don't pick up Master/Tasklist tabs,
  // which also have a "Name" column.
  var rows = tryReadTable(ss, ["Name", "Number"]);
  if (!rows.length) rows = tryReadTable(ss, ["Name", "Email Address"]);
  rows.forEach(function (r) {
    var name = canonical(r["Name"]);
    if (!name) return;
    if (!doerMap[name]) doerMap[name] = { doer: name, department: "", email: "", active: true };
    var dept = trim(r["Department"]);
    var email = trim(r["Email"]) || trim(r["Email Address"]);
    if (dept && !doerMap[name].department) doerMap[name].department = dept;
    if (email && !doerMap[name].email) doerMap[name].email = email;
  });
}

function deptOf(doerMap, doer) {
  return doerMap[doer] ? doerMap[doer].department : "";
}

function canonical(raw) {
  var s = trim(raw);
  if (!s) return "";
  s = s.replace(/\s*-\s*\d{6,}\s*$/, ""); // strip " - 9876543210" phone suffix
  s = s.toUpperCase().replace(/\s+/g, " ").trim();
  return DOER_ALIAS[s] || s;
}

function uniqueDepartments(doers) {
  var seen = {};
  var out = [];
  doers.forEach(function (d) {
    var dep = trim(d.department);
    if (dep && !seen[dep]) { seen[dep] = true; out.push({ department: dep }); }
  });
  out.sort(function (a, b) { return a.department.localeCompare(b.department); });
  return out;
}

function byDoer(a, b) { return String(a.doer).localeCompare(String(b.doer)); }

// ---- Generic table reader (auto-detects the right tab by required headers) --
function readTable(ss, requiredHeaders) {
  var rows = tryReadTable(ss, requiredHeaders);
  if (!rows.length) {
    throw new Error('No tab in "' + ss.getName() + '" has headers: ' + requiredHeaders.join(", "));
  }
  return rows;
}

function tryReadTable(ss, requiredHeaders) {
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol < 1) continue;
    var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    var headerRowIdx = findHeaderRow(values, requiredHeaders);
    if (headerRowIdx === -1) continue;
    var headers = values[headerRowIdx].map(trim);
    var out = [];
    for (var r = headerRowIdx + 1; r < values.length; r++) {
      var raw = values[r];
      if (raw.join("").toString().trim() === "") continue;
      var obj = {};
      for (var c = 0; c < headers.length; c++) if (headers[c]) obj[headers[c]] = raw[c];
      out.push(obj);
    }
    return out;
  }
  return [];
}

// Header row may not be row 1 (some tabs have title rows above it).
function findHeaderRow(values, requiredHeaders) {
  var limit = Math.min(values.length, 8);
  for (var i = 0; i < limit; i++) {
    var set = {};
    values[i].forEach(function (v) { var t = trim(v); if (t) set[t] = true; });
    var all = true;
    for (var h = 0; h < requiredHeaders.length; h++) if (!set[requiredHeaders[h]]) { all = false; break; }
    if (all) return i;
  }
  return -1;
}

// ---- Week handling ---------------------------------------------------------
function resolveWeek(params) {
  var from, to;
  if (params.from && params.to) { from = parseISO(params.from); to = parseISO(params.to); }
  else if (params.week) { from = parseISO(params.week); to = addDays(from, 6); }
  else { from = startOfWeek(new Date()); to = addDays(from, 6); }
  return { key: toISODate(from), from: toISODate(from), to: toISODate(to), label: weekLabel(from, to) };
}

function startOfWeek(d) {
  var date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return addDays(date, -(((date.getDay() - WEEK_START) + 7) % 7));
}

function filterByDate(rows, field, range) {
  return rows.filter(function (row) {
    var d = field === "plannedOrFirst" ? (row.planned || row.firstDate) : row[field];
    if (!d) return false;
    return d >= range.from && d <= range.to;
  });
}

// ---- Value helpers ---------------------------------------------------------
function expandFreq(v) {
  var s = trim(v).toUpperCase();
  return { D: "Daily", W: "Weekly", M: "Monthly" }[s] || (s ? trim(v) : "");
}

// Dates in these sheets are DD/MM/YYYY (or real Date cells).
function toISODate(value) {
  if (value === "" || value === null || value === undefined) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return value.getFullYear() + "-" + pad(value.getMonth() + 1) + "-" + pad(value.getDate());
  }
  var s = trim(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // DD/MM/YYYY
  if (m) return m[3] + "-" + pad(+m[2]) + "-" + pad(+m[1]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? s : toISODate(d);
}

function parseISO(s) {
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

function weekLabel(from, to) {
  var mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var sameYear = from.getFullYear() === to.getFullYear();
  var left = from.getDate() + " " + mo[from.getMonth()] + (sameYear ? "" : " " + from.getFullYear());
  return left + " – " + to.getDate() + " " + mo[to.getMonth()] + " " + to.getFullYear();
}

function openOrNull(id) { return id ? SpreadsheetApp.openById(id) : null; }
function trim(v) { return (v === null || v === undefined) ? "" : String(v).trim(); }
function toInt(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
function pad(n) { return n < 10 ? "0" + n : "" + n; }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
// NOTE: isoToDate(iso) is defined once near the value helpers above (returns a
// real Date for date cells). Do not redefine it here — duplicate declarations
// silently shadow each other and make the active one ambiguous.
