// =============================================================================
// scoring.js — Metrics & scoring logic (PRD §9). Kept pure and explicit so the
// headline numbers are trustworthy and auditable.
//
// Rules:
//  - Completion % (per type) = done-or-completed / total committed.
//  - Overall doer score = pooled across all three types (total completed across
//    all types ÷ total committed across all types) so one heavy type does not
//    distort the score. (PRD §9, recommended weighting.)
//  - A blank/unknown Status is treated as Pending, never silently dropped.
//  - FMS: a Done row whose Actual Date > Planned Date is "Done-late" — still
//    counted as Done, but surfaced so on-time discipline is visible.
//  - FMS: a Pending row whose Planned Date < today is "overdue".
// =============================================================================

import { HEADERS, STATUS } from "./config.js";

// --- Per-row predicates ------------------------------------------------------

// True when an FMS or Checklist row counts as completed.
export function isWorkDone(row) {
  return String(row[HEADERS.FMS.status] ?? "").trim() === STATUS.DONE;
}

// True when a Delegation row counts as completed (note: "Completed", not "Done").
export function isDelegationDone(row) {
  return String(row[HEADERS.Delegation.status] ?? "").trim() === STATUS.COMPLETED;
}

// FMS done-late: completed, but the actual date slipped past the planned date.
export function isFmsDoneLate(row) {
  if (!isWorkDone(row)) return false;
  const planned = String(row[HEADERS.FMS.plannedDate] ?? "").trim();
  const actual = String(row[HEADERS.FMS.actualDate] ?? "").trim();
  return planned && actual && actual > planned;
}

// FMS overdue: still pending and the planned date is in the past.
export function isFmsOverdue(row, today = isoToday()) {
  if (isWorkDone(row)) return false;
  const planned = String(row[HEADERS.FMS.plannedDate] ?? "").trim();
  return planned && planned < today;
}

// Delegation at-risk: urgent and still pending (FR-21).
export function isDelegationAtRisk(row) {
  const urgency = String(row[HEADERS.Delegation.urgency] ?? "").trim();
  return urgency === "Urgent" && !isDelegationDone(row);
}

// --- Aggregation -------------------------------------------------------------

function blankBucket() {
  return { total: 0, done: 0, pending: 0 };
}

function add(bucket, done) {
  bucket.total += 1;
  if (done) bucket.done += 1;
  else bucket.pending += 1;
}

function pct(done, total) {
  if (!total) return null; // null = "no committed work", rendered as "—"
  return Math.round((done / total) * 100);
}

// Per-doer summary across FMS + Checklist + Delegation for the loaded week.
// Returns an array sorted by completion % ascending (worst first → the people
// who need attention surface at the top of the management view).
export function doerSummaries(data) {
  const byDoer = new Map();

  const ensure = (name, department) => {
    if (!byDoer.has(name)) {
      byDoer.set(name, {
        doer: name,
        department: department || "",
        fms: blankBucket(),
        checklist: blankBucket(),
        delegation: blankBucket(),
      });
    }
    const rec = byDoer.get(name);
    if (!rec.department && department) rec.department = department;
    return rec;
  };

  // Seed from the canonical doer list so a doer with zero rows still shows up.
  for (const d of data.doers || []) {
    if (d[HEADERS.Doers.active] === false) continue; // inactive hidden (PRD §5.2)
    ensure(d[HEADERS.Doers.doer], d[HEADERS.Doers.department]);
  }

  for (const r of data.fms || []) {
    add(ensure(r[HEADERS.FMS.doer], r[HEADERS.FMS.department]).fms, isWorkDone(r));
  }
  for (const r of data.checklist || []) {
    add(ensure(r[HEADERS.Checklist.doer], r[HEADERS.Checklist.department]).checklist, isWorkDone(r));
  }
  for (const r of data.delegation || []) {
    add(ensure(r[HEADERS.Delegation.doer], r[HEADERS.Delegation.department]).delegation, isDelegationDone(r));
  }

  const rows = [...byDoer.values()].map((rec) => {
    const total = rec.fms.total + rec.checklist.total + rec.delegation.total;
    const done = rec.fms.done + rec.checklist.done + rec.delegation.done;
    const pending = total - done;
    return {
      ...rec,
      total,
      done,
      pending,
      pct: pct(done, total),
      fmsPct: pct(rec.fms.done, rec.fms.total),
      checklistPct: pct(rec.checklist.done, rec.checklist.total),
      delegationPct: pct(rec.delegation.done, rec.delegation.total),
    };
  });

  rows.sort((a, b) => {
    // No-work doers sink to the bottom; otherwise worst completion first.
    if (a.pct === null && b.pct === null) return a.doer.localeCompare(b.doer);
    if (a.pct === null) return 1;
    if (b.pct === null) return -1;
    if (a.pct !== b.pct) return a.pct - b.pct;
    return b.pending - a.pending;
  });

  return rows;
}

// Org-level totals for the headline strip (FR-12).
export function orgTotals(data) {
  const summaries = doerSummaries(data);
  let total = 0;
  let done = 0;
  for (const s of summaries) {
    total += s.total;
    done += s.done;
  }
  const fmsOverdue = (data.fms || []).filter((r) => isFmsOverdue(r)).length;
  const urgentPending = (data.delegation || []).filter(isDelegationAtRisk).length;
  return {
    total,
    done,
    pending: total - done,
    pct: pct(done, total),
    doerCount: summaries.filter((s) => s.total > 0).length,
    fmsOverdue,
    urgentPending,
  };
}

// Today as ISO YYYY-MM-DD (local). Centralised so "overdue" is computed one way.
export function isoToday() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
