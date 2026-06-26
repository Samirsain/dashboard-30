// =============================================================================
// analytics.js — derives all Executive Dashboard metrics from the real data
// (Checklist + Task List/Delegation). Pure functions over the normalised payload.
// =============================================================================

import {
  isChecklistDone,
  isChecklistLate,
  isDelegationDone,
  delegationColour,
  delegationReworked,
  doerSummaries,
} from "./scoring.js";

// Unified task rows for the directory + analytics. Status ∈ Completed | Late |
// Pending. "Late" = done but not clean: checklist finished after its planned
// date, or a delegation task that needed revisions/rework.
export function unifyTasks(data) {
  const out = [];
  (data.checklist || []).forEach((r, i) => {
    const done = isChecklistDone(r);
    const late = isChecklistLate(r);
    out.push({
      id: r.taskId || `CL-${i + 1}`,
      source: "Checklist",
      task: r.task,
      doer: r.doer,
      department: r.department,
      priority: "",
      frequency: r.frequency || "",
      created: r.planned || "",
      due: r.planned || "",
      actual: r.actual || "",
      status: done ? (late ? "Late" : "Completed") : "Pending",
    });
  });
  (data.delegation || []).forEach((r, i) => {
    const done = isDelegationDone(r);
    const status = done ? (delegationReworked(r) ? "Late" : "Completed") : "Pending";
    out.push({
      id: r.taskId || `TL-${i + 1}`,
      source: "Task List",
      task: r.task,
      doer: r.doer,
      department: r.department,
      priority: r.priority || "",
      frequency: "",
      created: r.firstDate || "",
      due: r.firstDate || "",
      actual: done ? r.latestRevision || "" : "",
      status,
      red: delegationColour(r) === "Red",
    });
  });
  return out;
}

const isDone = (t) => t.status === "Completed" || t.status === "Late";

export function kpis(data) {
  const tasks = unifyTasks(data);
  const total = tasks.length;
  const done = tasks.filter(isDone).length;
  const pending = tasks.filter((t) => t.status === "Pending").length;
  const late = tasks.filter((t) => t.status === "Late").length;
  return { total, done, pending, late, pct: total ? Math.round((done / total) * 100) : 0 };
}

// Status split for the donut.
export function statusBreakdown(data) {
  const tasks = unifyTasks(data);
  const total = tasks.length || 1;
  const count = (s) => tasks.filter((t) => t.status === s).length;
  const completed = count("Completed");
  const late = count("Late");
  const pending = count("Pending");
  const pctOf = (n) => Math.round((n / total) * 100);
  return {
    total: tasks.length,
    segments: [
      { key: "Completed", value: completed, pct: pctOf(completed), color: "#4f5a6b" },
      { key: "Late", value: late, pct: pctOf(late), color: "#ba1a1a" },
      { key: "Pending", value: pending, pct: pctOf(pending), color: "#c9cbcf" },
    ],
  };
}

// Per-department done vs total (for the bar chart).
export function departmentPerformance(data) {
  const tasks = unifyTasks(data);
  const map = new Map();
  for (const t of tasks) {
    const dep = String(t.department || "").trim() || "—";
    if (!map.has(dep)) map.set(dep, { department: dep, total: 0, done: 0 });
    const rec = map.get(dep);
    rec.total += 1;
    if (isDone(t)) rec.done += 1;
  }
  return [...map.values()]
    .map((r) => ({ ...r, pending: r.total - r.done, pct: r.total ? Math.round((r.done / r.total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total);
}

// Checklist frequency split (Daily/Weekly/Monthly) done vs pending.
export function frequencyBreakdown(data) {
  const order = ["Daily", "Weekly", "Monthly"];
  const map = new Map(order.map((f) => [f, { frequency: f, total: 0, done: 0 }]));
  for (const r of data.checklist || []) {
    const f = String(r.frequency || "").trim();
    if (!map.has(f)) map.set(f, { frequency: f || "Other", total: 0, done: 0 });
    const rec = map.get(f);
    rec.total += 1;
    if (isChecklistDone(r)) rec.done += 1;
  }
  return [...map.values()].filter((r) => r.total > 0).map((r) => ({ ...r, pending: r.total - r.done }));
}

// Daily completions (by actual date) — last `days` calendar days up to today.
export function dailyCompletions(data, days = 30) {
  const today = todayISO();
  const tasks = unifyTasks(data).filter((t) => isDone(t) && t.actual);
  const counts = new Map();
  for (const t of tasks) counts.set(t.actual, (counts.get(t.actual) || 0) + 1);
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDaysISO(today, -i);
    series.push({ date: d, value: counts.get(d) || 0 });
  }
  return series;
}

// Weekly productivity: completion % per available week (oldest→newest).
export function weeklyProductivity(data) {
  const weeks = [...(data.availableWeeks || [])].slice().reverse();
  const tasks = unifyTasks(data);
  return weeks.map((w) => {
    const inWeek = tasks.filter((t) => {
      const d = t.due || t.created;
      return d && d >= w.from && d <= w.to;
    });
    const total = inWeek.length;
    const done = inWeek.filter(isDone).length;
    return { key: w.key, label: w.label, pct: total ? Math.round((done / total) * 100) : 0, total };
  });
}

// 90-day activity heatmap (completions per day → intensity 0..4).
export function activityHeatmap(data, days = 90) {
  const today = todayISO();
  const tasks = unifyTasks(data).filter((t) => isDone(t) && t.actual);
  const counts = new Map();
  for (const t of tasks) counts.set(t.actual, (counts.get(t.actual) || 0) + 1);
  let max = 1;
  counts.forEach((v) => (max = Math.max(max, v)));
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDaysISO(today, -i);
    const n = counts.get(d) || 0;
    const intensity = n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
    cells.push({ date: d, count: n, intensity });
  }
  return cells;
}

// Headline highlights for the "Today's Summary" panel.
export function todaySummary(data) {
  const tasks = unifyTasks(data);
  const today = todayISO();
  const summaries = doerSummaries(data).filter((s) => s.total > 0);
  const topPerformer = summaries.slice().sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1))[0];
  const dept = departmentPerformance(data)[0];
  const overdue = tasks.filter((t) => t.status === "Pending" && t.due && t.due < today).length;
  const criticalPending = tasks.filter(
    (t) => t.status === "Pending" && /high|urgent/i.test(String(t.priority))
  ).length;
  return {
    topPerformer: topPerformer ? topPerformer.doer : "—",
    busyDept: dept ? dept.department : "—",
    overdue,
    criticalPending,
  };
}

// Lightweight derived "insights" (no ML — just honest heuristics over the data).
export function insights(data) {
  const out = [];
  const dep = departmentPerformance(data).filter((d) => d.pending > 0).sort((a, b) => b.pending - a.pending)[0];
  if (dep) {
    out.push({
      title: "Most pending work",
      body: `${dep.department} ke paas sabse zyada pending hai — ${dep.pending} task baaki (${dep.pct}% done).`,
    });
  }
  const wp = weeklyProductivity(data);
  if (wp.length >= 2) {
    const last = wp[wp.length - 1];
    const prev = wp[wp.length - 2];
    const diff = last.pct - prev.pct;
    out.push({
      title: diff >= 0 ? "Positive trend" : "Needs attention",
      body:
        diff >= 0
          ? `Completion ${diff}% behtar hua pichhle week se (${prev.pct}% → ${last.pct}%).`
          : `Completion ${Math.abs(diff)}% gira pichhle week se (${prev.pct}% → ${last.pct}%).`,
    });
  }
  const k = kpis(data);
  if (k.late > 0) out.push({ title: "Late completions", body: `${k.late} task der se ya rework ke saath complete hue — follow-up zaroori.` });
  return out.slice(0, 3);
}

// Recent activity feed (latest dated events first).
export function recentActivity(data, limit = 6) {
  const tasks = unifyTasks(data);
  const events = [];
  for (const t of tasks) {
    if (isDone(t) && t.actual) events.push({ date: t.actual, kind: "done", task: t.task, who: t.doer, id: t.id });
  }
  events.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return events.slice(0, limit);
}

// ---- date helpers ----------------------------------------------------------
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDaysISO(iso, n) {
  const [y, m, d] = String(iso).split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}
