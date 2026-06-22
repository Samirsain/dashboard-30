// =============================================================================
// tabs.js — Renderers for the five tabs (PRD §7.3–§7.7). Each renderer is a
// pure function of (data, filters, onFilterChange) → DOM node. App.js owns the
// per-tab filter state and re-renders the tab container on any change.
// =============================================================================

import { HEADERS, STATUS, SCORE_THRESHOLDS, ALL } from "./config.js";
import {
  el,
  buildTable,
  statusBadge,
  tag,
  selectControl,
  searchControl,
  dateRangeControl,
  filterBar,
  resultCount,
} from "./ui.js";
import {
  matchesDropdown,
  matchesSearch,
  inDateRange,
  unique,
} from "./filters.js";
import {
  doerSummaries,
  orgTotals,
  isWorkDone,
  isDelegationDone,
  isFmsOverdue,
  isFmsDoneLate,
  isDelegationAtRisk,
} from "./scoring.js";

const H = HEADERS;

// Short, human date for tables. Keeps ISO precision elsewhere; "—" for blanks.
function fmtDate(iso) {
  const s = String(iso ?? "").trim();
  if (!s) return "";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(d)} ${months[Number(m) - 1] || m}`;
}

function scoreClass(pct) {
  if (pct === null || pct === undefined) return "muted";
  if (pct >= SCORE_THRESHOLDS.GOOD) return "good";
  if (pct >= SCORE_THRESHOLDS.WARN) return "warn";
  return "bad";
}

function pctText(pct) {
  return pct === null || pct === undefined ? "—" : `${pct}%`;
}

// Active doer names (for filter dropdowns) — excludes inactive doers (PRD §5.2).
function activeDoerNames(data) {
  return unique(
    (data.doers || [])
      .filter((d) => d[H.Doers.active] !== false)
      .map((d) => d[H.Doers.doer])
  );
}

function departmentNames(data) {
  return unique((data.departments || []).map((d) => d[H.Departments.department]));
}

// =============================================================================
// Summary tab (FR-11, FR-12, FR-13)
// =============================================================================
export function renderSummary(data) {
  const totals = orgTotals(data);
  const summaries = doerSummaries(data).filter((s) => s.total > 0 || s.department);

  // Org headline strip.
  const headline = el("div", { class: "headline" }, [
    statCard("Overall completion", pctText(totals.pct), scoreClass(totals.pct)),
    statCard("Total pending", String(totals.pending), totals.pending ? "warn" : "good"),
    statCard("Committed items", String(totals.total), "muted"),
    statCard("FMS overdue", String(totals.fmsOverdue), totals.fmsOverdue ? "bad" : "good"),
    statCard("Urgent & pending", String(totals.urgentPending), totals.urgentPending ? "bad" : "good"),
  ]);

  const columns = [
    { key: "doer", label: "Doer", className: "col--name", render: (r) => el("div", { class: "cell-stack" }, [el("strong", {}, [r.doer]), el("span", { class: "cell-sub" }, [r.department || "—"])]) },
    { key: "fms", label: "FMS", className: "col--num", render: (r) => bucketCell(r.fms, r.fmsPct) },
    { key: "checklist", label: "Checklist", className: "col--num", render: (r) => bucketCell(r.checklist, r.checklistPct) },
    { key: "delegation", label: "Delegation", className: "col--num", render: (r) => bucketCell(r.delegation, r.delegationPct) },
    { key: "pending", label: "Pending", className: "col--num", render: (r) => el("span", { class: r.pending ? "num num--warn" : "num" }, [String(r.pending)]) },
    { key: "pct", label: "Completion", className: "col--score", render: (r) => completionBar(r.pct) },
  ];

  const table = buildTable({
    columns,
    rows: summaries,
    rowClass: (r) => (r.pct !== null && r.pct < SCORE_THRESHOLDS.WARN ? "row--alert" : null),
  });

  return el("section", { class: "tab-panel" }, [
    headline,
    el("p", { class: "tab-hint" }, [
      "Pooled completion across FMS + Checklist + Delegation for the selected week. Doers needing attention are sorted to the top.",
    ]),
    table,
  ]);
}

function statCard(label, value, kind) {
  return el("div", { class: `stat stat--${kind}` }, [
    el("div", { class: "stat__value" }, [value]),
    el("div", { class: "stat__label" }, [label]),
  ]);
}

function bucketCell(bucket, pct) {
  if (!bucket.total) return el("span", { class: "muted" }, ["—"]);
  return el("div", { class: "cell-stack" }, [
    el("span", {}, [`${bucket.done}/${bucket.total}`]),
    el("span", { class: `cell-sub cell-sub--${scoreClass(pct)}` }, [pctText(pct)]),
  ]);
}

function completionBar(pct) {
  const cls = scoreClass(pct);
  const wrap = el("div", { class: "bar" }, [
    el("div", { class: `bar__fill bar__fill--${cls}`, style: `width:${pct === null ? 0 : pct}%` }),
  ]);
  return el("div", { class: "bar-wrap" }, [el("span", { class: `bar__pct bar__pct--${cls}` }, [pctText(pct)]), wrap]);
}

// =============================================================================
// FMS Steps tab (FR-14, FR-15, FR-16)
// =============================================================================
export function renderFMS(data, filters, onChange) {
  const fmsNames = unique((data.fms || []).map((r) => r[H.FMS.fmsName]));
  const all = data.fms || [];

  const filtered = all
    .filter((r) => matchesDropdown(filters.fms, r[H.FMS.fmsName]))
    .filter((r) => matchesDropdown(filters.doer, r[H.FMS.doer]))
    .filter((r) => inDateRange(r[H.FMS.plannedDate], filters.from, filters.to))
    .filter((r) => matchesSearch(filters.search, [r[H.FMS.fmsName], r[H.FMS.step], r[H.FMS.doer]]))
    .sort((a, b) => {
      const byName = String(a[H.FMS.fmsName]).localeCompare(String(b[H.FMS.fmsName]));
      return byName !== 0 ? byName : Number(a[H.FMS.stepNo]) - Number(b[H.FMS.stepNo]);
    });

  const bar = filterBar([
    selectControl({ label: "FMS", value: filters.fms, options: fmsNames, onChange: (v) => onChange({ fms: v }) }),
    selectControl({ label: "Doer", value: filters.doer, options: activeDoerNames(data), onChange: (v) => onChange({ doer: v }) }),
    dateRangeControl({ from: filters.from, to: filters.to, onChange: (which, v) => onChange({ [which]: v }) }),
    searchControl({ value: filters.search, placeholder: "Search FMS or step…", onInput: (v) => onChange({ search: v }) }),
  ]);

  const columns = [
    { key: "fms", label: "FMS Name", className: "col--name", render: (r) => el("strong", {}, [r[H.FMS.fmsName]]) },
    { key: "step", label: "Step", render: (r) => el("div", { class: "cell-stack" }, [el("span", {}, [r[H.FMS.step]]), el("span", { class: "cell-sub" }, [`Step ${r[H.FMS.stepNo]} · ${r[H.FMS.frequency] || ""}`])]) },
    { key: "doer", label: "Doer", render: (r) => r[H.FMS.doer] },
    { key: "dept", label: "Department", render: (r) => r[H.FMS.department] },
    { key: "planned", label: "Planned", className: "col--date", render: (r) => plannedCell(r[H.FMS.plannedDate], r[H.FMS.plannedTime], isFmsOverdue(r)) },
    { key: "actual", label: "Actual", className: "col--date", render: (r) => actualCell(r) },
    { key: "status", label: "Status", className: "col--status", render: (r) => statusBadge(r[H.FMS.status]) },
  ];

  return el("section", { class: "tab-panel" }, [
    bar,
    resultCount(filtered.length, all.length),
    buildTable({
      columns,
      rows: filtered,
      rowClass: (r) => (isFmsOverdue(r) ? "row--alert" : null),
    }),
  ]);
}

function plannedCell(date, time, overdue) {
  const stack = [el("span", {}, [fmtDate(date) || "—"])];
  if (time) stack.push(el("span", { class: "cell-sub" }, [time]));
  if (overdue) stack.push(el("span", { class: "cell-sub cell-sub--bad" }, ["overdue"]));
  return el("div", { class: "cell-stack" }, stack);
}

function actualCell(r) {
  const actual = fmtDate(r[H.FMS.actualDate]);
  if (!actual) return el("span", { class: "muted" }, ["—"]);
  const stack = [el("span", {}, [actual])];
  if (isFmsDoneLate(r)) stack.push(el("span", { class: "cell-sub cell-sub--warn" }, ["done-late"]));
  return el("div", { class: "cell-stack" }, stack);
}

// =============================================================================
// Checklist tab (FR-17, FR-18)
// =============================================================================
export function renderChecklist(data, filters, onChange) {
  const all = data.checklist || [];

  const filtered = all
    .filter((r) => matchesDropdown(filters.doer, r[H.Checklist.doer]))
    .filter((r) => matchesDropdown(filters.department, r[H.Checklist.department]))
    .filter((r) => matchesStatus(filters.status, r[H.Checklist.status], false))
    .filter((r) => inDateRange(r[H.Checklist.date], filters.from, filters.to))
    .filter((r) => matchesSearch(filters.search, [r[H.Checklist.task], r[H.Checklist.doer]]))
    .sort((a, b) => String(a[H.Checklist.date]).localeCompare(String(b[H.Checklist.date])) || String(a[H.Checklist.task]).localeCompare(String(b[H.Checklist.task])));

  const bar = filterBar([
    selectControl({ label: "Doer", value: filters.doer, options: activeDoerNames(data), onChange: (v) => onChange({ doer: v }) }),
    selectControl({ label: "Department", value: filters.department, options: departmentNames(data), onChange: (v) => onChange({ department: v }) }),
    selectControl({ label: "Status", value: filters.status, options: [STATUS.DONE, STATUS.PENDING], onChange: (v) => onChange({ status: v }) }),
    dateRangeControl({ from: filters.from, to: filters.to, onChange: (which, v) => onChange({ [which]: v }) }),
    searchControl({ value: filters.search, placeholder: "Search task…", onInput: (v) => onChange({ search: v }) }),
  ]);

  const columns = [
    { key: "task", label: "Task", className: "col--name", render: (r) => el("strong", {}, [r[H.Checklist.task]]) },
    { key: "doer", label: "Doer", render: (r) => r[H.Checklist.doer] },
    { key: "dept", label: "Department", render: (r) => r[H.Checklist.department] },
    { key: "date", label: "Date", className: "col--date", render: (r) => fmtDate(r[H.Checklist.date]) },
    { key: "status", label: "Status", className: "col--status", render: (r) => statusBadge(r[H.Checklist.status]) },
  ];

  return el("section", { class: "tab-panel" }, [
    bar,
    resultCount(filtered.length, all.length),
    buildTable({ columns, rows: filtered, rowClass: (r) => (isWorkDone(r) ? null : "row--pending") }),
  ]);
}

// =============================================================================
// Delegation tab (FR-19, FR-20, FR-21)
// =============================================================================
export function renderDelegation(data, filters, onChange) {
  const all = data.delegation || [];

  const filtered = all
    .filter((r) => matchesDropdown(filters.doer, r[H.Delegation.doer]))
    .filter((r) => matchesStatus(filters.status, r[H.Delegation.status], true))
    .filter((r) => matchesDropdown(filters.priority, r[H.Delegation.priority]))
    .filter((r) => matchesDropdown(filters.urgency, r[H.Delegation.urgency]))
    .filter((r) => inDateRange(r[H.Delegation.plannedDate], filters.from, filters.to))
    .filter((r) => matchesSearch(filters.search, [r[H.Delegation.task], r[H.Delegation.doer], r[H.Delegation.givenBy]]))
    .sort(delegationSort);

  const bar = filterBar([
    selectControl({ label: "Doer", value: filters.doer, options: activeDoerNames(data), onChange: (v) => onChange({ doer: v }) }),
    selectControl({ label: "Status", value: filters.status, options: [STATUS.COMPLETED, STATUS.PENDING], onChange: (v) => onChange({ status: v }) }),
    selectControl({ label: "Priority", value: filters.priority, options: ["High", "Medium", "Low"], onChange: (v) => onChange({ priority: v }) }),
    selectControl({ label: "Urgency", value: filters.urgency, options: ["Urgent", "Normal"], onChange: (v) => onChange({ urgency: v }) }),
    dateRangeControl({ from: filters.from, to: filters.to, onChange: (which, v) => onChange({ [which]: v }) }),
    searchControl({ value: filters.search, placeholder: "Search task…", onInput: (v) => onChange({ search: v }) }),
  ]);

  const columns = [
    { key: "task", label: "Task", className: "col--name", render: (r) => el("strong", {}, [r[H.Delegation.task]]) },
    { key: "doer", label: "Doer", render: (r) => r[H.Delegation.doer] },
    { key: "givenBy", label: "Given By", render: (r) => r[H.Delegation.givenBy] },
    { key: "priority", label: "Priority", className: "col--tag", render: (r) => tag(r[H.Delegation.priority]) },
    { key: "urgency", label: "Urgency", className: "col--tag", render: (r) => tag(r[H.Delegation.urgency]) },
    { key: "planned", label: "Planned", className: "col--date", render: (r) => fmtDate(r[H.Delegation.plannedDate]) },
    { key: "completed", label: "Completed", className: "col--date", render: (r) => fmtDate(r[H.Delegation.completedDate]) },
    { key: "status", label: "Status", className: "col--status", render: (r) => statusBadge(r[H.Delegation.status], { atRisk: isDelegationAtRisk(r) }) },
  ];

  return el("section", { class: "tab-panel" }, [
    bar,
    resultCount(filtered.length, all.length),
    buildTable({ columns, rows: filtered, rowClass: (r) => (isDelegationAtRisk(r) ? "row--alert" : null) }),
  ]);
}

// Sort: at-risk (urgent+pending) first, then by priority, then planned date.
function delegationSort(a, b) {
  const riskA = isDelegationAtRisk(a) ? 0 : 1;
  const riskB = isDelegationAtRisk(b) ? 0 : 1;
  if (riskA !== riskB) return riskA - riskB;
  const prio = { High: 0, Medium: 1, Low: 2 };
  const pA = prio[a[H.Delegation.priority]] ?? 3;
  const pB = prio[b[H.Delegation.priority]] ?? 3;
  if (pA !== pB) return pA - pB;
  return String(a[H.Delegation.plannedDate]).localeCompare(String(b[H.Delegation.plannedDate]));
}

// =============================================================================
// All Doers tab (FR-22, FR-23)
// =============================================================================
export function renderAllDoers(data, filters, onChange) {
  const summaries = doerSummaries(data);
  const inScope = summaries.filter((s) => matchesDropdown(filters.doer, s.doer));

  const bar = filterBar([
    selectControl({ label: "Doer", value: filters.doer, options: activeDoerNames(data), onChange: (v) => onChange({ doer: v }) }),
    selectControl({ label: "Show", value: filters.status, options: ["Pending", "Done"], onChange: (v) => onChange({ status: v }) }),
    searchControl({ value: filters.search, placeholder: "Search item…", onInput: (v) => onChange({ search: v }) }),
  ]);

  const sections = inScope
    .map((s) => doerSection(data, s, filters))
    .filter(Boolean);

  const body = sections.length
    ? sections
    : [el("div", { class: "empty-block" }, ["No items match the current filters."])];

  return el("section", { class: "tab-panel" }, [bar, el("div", { class: "doer-sections" }, body)]);
}

// One collapsible-feeling section per doer: score header + unified item table
// combining their FMS, Checklist and Delegation rows (the "complete pending
// picture", FR-22/FR-23).
function doerSection(data, summary, filters) {
  const items = collectDoerItems(data, summary.doer)
    .filter((it) => matchesStatus(filters.status, it.done ? STATUS.DONE : STATUS.PENDING, false))
    .filter((it) => matchesSearch(filters.search, [it.item, it.department]));

  // Hide empty sections when a specific doer isn't pinned, to keep the view tight.
  if (!items.length && filters.doer === ALL) return null;

  const columns = [
    { key: "type", label: "Type", className: "col--tag", render: (it) => el("span", { class: `tag tag--type-${it.type.toLowerCase()}` }, [it.type]) },
    { key: "item", label: "Item", className: "col--name", render: (it) => el("strong", {}, [it.item]) },
    { key: "department", label: "Department", render: (it) => it.department },
    { key: "planned", label: "Planned", className: "col--date", render: (it) => fmtDate(it.planned) },
    { key: "doneOn", label: "Done On", className: "col--date", render: (it) => fmtDate(it.doneOn) },
    { key: "status", label: "Status", className: "col--status", render: (it) => statusBadge(it.status, { atRisk: it.atRisk }) },
  ];

  const header = el("div", { class: "doer-head" }, [
    el("div", { class: "doer-head__name" }, [el("strong", {}, [summary.doer]), el("span", { class: "cell-sub" }, [summary.department || "—"])]),
    el("div", { class: `doer-head__score doer-head__score--${scoreClass(summary.pct)}` }, [
      el("span", { class: "doer-head__pct" }, [pctText(summary.pct)]),
      el("span", { class: "cell-sub" }, [`${summary.done}/${summary.total} done · ${summary.pending} pending`]),
    ]),
  ]);

  return el("div", { class: "doer-card" }, [header, buildTable({ columns, rows: items, rowClass: (it) => (it.atRisk ? "row--alert" : it.done ? null : "row--pending") })]);
}

// Flatten a single doer's rows across all three types into unified records.
function collectDoerItems(data, doer) {
  const items = [];
  for (const r of data.fms || []) {
    if (String(r[H.FMS.doer]).trim() !== doer) continue;
    items.push({
      type: "FMS",
      item: `${r[H.FMS.fmsName]} — ${r[H.FMS.step]}`,
      department: r[H.FMS.department],
      planned: r[H.FMS.plannedDate],
      doneOn: r[H.FMS.actualDate],
      status: r[H.FMS.status],
      done: isWorkDone(r),
      atRisk: isFmsOverdue(r),
    });
  }
  for (const r of data.checklist || []) {
    if (String(r[H.Checklist.doer]).trim() !== doer) continue;
    items.push({
      type: "Checklist",
      item: r[H.Checklist.task],
      department: r[H.Checklist.department],
      planned: r[H.Checklist.date],
      doneOn: "",
      status: r[H.Checklist.status],
      done: isWorkDone(r),
      atRisk: false,
    });
  }
  for (const r of data.delegation || []) {
    if (String(r[H.Delegation.doer]).trim() !== doer) continue;
    items.push({
      type: "Delegation",
      item: r[H.Delegation.task],
      department: r[H.Delegation.department],
      planned: r[H.Delegation.plannedDate],
      doneOn: r[H.Delegation.completedDate],
      status: r[H.Delegation.status],
      done: isDelegationDone(r),
      atRisk: isDelegationAtRisk(r),
    });
  }
  // Pending first, then by planned date.
  return items.sort((a, b) => Number(a.done) - Number(b.done) || String(a.planned).localeCompare(String(b.planned)));
}

// =============================================================================
// Shared status-filter helper
// =============================================================================
// `isDelegation` toggles the "done" term: Delegation uses "Completed", FMS /
// Checklist use "Done". An "All" selection matches everything.
function matchesStatus(selected, value, isDelegation) {
  if (!selected || selected === ALL) return true;
  const v = String(value ?? "").trim() || STATUS.PENDING; // blank → Pending (PRD §9)
  const doneTerm = isDelegation ? STATUS.COMPLETED : STATUS.DONE;
  if (selected === STATUS.PENDING) return v === STATUS.PENDING;
  return v === doneTerm;
}
