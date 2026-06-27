// =============================================================================
// scoring.js — Metrics & scoring for the real ThirtyMilestones data.
//
//   Checklist  : Done / Pending (on-time = Actual <= Planned).
//   Delegation : Completed / Pending; plus a Red/Yellow/Green colour derived
//                from Total Revisions (0 = Green, 1 = Yellow, 2+ = Red) — the
//                team's existing scoring. Both signals are surfaced.
//
// Operates on the NORMALISED objects emitted by data.js / Apps Script:
//   checklist : { task, doer, department, frequency, planned, actual, status }
//   delegation: { taskId, task, doer, department, firstDate, latestRevision,
//                 revisions, status, priority }
// =============================================================================

import { STATUS, COLOUR, RED_REVISIONS } from "./config.js";

// --- Per-row predicates ------------------------------------------------------
export function isChecklistDone(row) {
  return String(row.status ?? "").trim() === STATUS.DONE;
}

export function isChecklistLate(row) {
  if (!isChecklistDone(row)) return false;
  const p = String(row.planned ?? "").trim();
  const a = String(row.actual ?? "").trim();
  return p && a && a > p;
}

export function isDelegationDone(row) {
  return String(row.status ?? "").trim() === STATUS.COMPLETED;
}

export function delegationRevisions(row) {
  const n = Number(row.revisions);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// A delegation task that needed one or more revisions = "reworked". This is the
// signal behind a Late completion (done, but it took extra rounds).
export function delegationReworked(row) {
  return delegationRevisions(row) > 0;
}

// Red/Yellow/Green from revision count.
export function delegationColour(row) {
  const r = delegationRevisions(row);
  if (r >= RED_REVISIONS) return COLOUR.RED;
  if (r === 1) return COLOUR.YELLOW;
  return COLOUR.GREEN;
}

// --- Aggregation -------------------------------------------------------------
function pct(done, total) {
  if (!total) return null; // null → rendered as "—"
  return Math.round((done / total) * 100);
}

// Per-doer summary across every system (Checklist · Delegation · FMS). Each
// system carries Done / Late / Pending so the scorecard shows "kitna hua, kitna
// late, kitna baaki". Sorted worst-first by overall completion %.
export function doerSummaries(data) {
  const byDoer = new Map();

  const ensure = (name, department) => {
    const key = String(name ?? "").trim();
    if (!byDoer.has(key)) {
      byDoer.set(key, {
        doer: key,
        department: department || "",
        checklist: { total: 0, done: 0, late: 0 },
        delegation: {
          total: 0,
          done: 0,
          late: 0,
          green: 0,
          yellow: 0,
          red: 0,
          revisions: 0,
          completedGreen: 0,
          completedYellow: 0,
          completedRed: 0,
          pendingClean: 0,
          pendingRevised: 0
        },
        fms: { total: 0, done: 0, late: 0 },
      });
    }
    const rec = byDoer.get(key);
    if (!rec.department && department) rec.department = department;
    return rec;
  };

  // Seed from the canonical doer list so a zero-row doer still appears.
  for (const d of data.doers || []) {
    if (d.active === false) continue;
    ensure(d.doer, d.department);
  }

  // Checklist + FMS share the same Done/Late shape (planned vs actual).
  const tallyPlan = (rows, pick) => {
    for (const r of rows || []) {
      const rec = pick(ensure(r.doer, r.department));
      rec.total += 1;
      if (isChecklistDone(r)) rec.done += 1;
      if (isChecklistLate(r)) rec.late += 1;
    }
  };
  tallyPlan(data.checklist, (rec) => rec.checklist);
  tallyPlan(data.fms, (rec) => rec.fms);

  for (const r of data.delegation || []) {
    const rec = ensure(r.doer, r.department).delegation;
    rec.total += 1;
    
    const done = isDelegationDone(r);
    const revs = delegationRevisions(r);
    rec.revisions = (rec.revisions || 0) + revs;

    if (done) {
      rec.done += 1;
      if (revs === 0) rec.completedGreen += 1;
      else if (revs === 1) rec.completedYellow += 1;
      else rec.completedRed += 1;
      if (revs > 0) rec.late += 1;
    } else {
      if (revs === 0) rec.pendingClean += 1;
      else rec.pendingRevised += 1;
    }

    const c = delegationColour(r);
    if (c === COLOUR.RED) rec.red += 1;
    else if (c === COLOUR.YELLOW) rec.yellow += 1;
    else rec.green += 1;
  }

  const withPending = (b) => ({ ...b, pending: b.total - b.done });

  const rows = [...byDoer.values()].map((rec) => {
    const checklist = withPending(rec.checklist);
    const delegation = withPending(rec.delegation);
    const fms = withPending(rec.fms);
    const total = checklist.total + delegation.total + fms.total;
    const done = checklist.done + delegation.done + fms.done;
    const late = checklist.late + delegation.late + fms.late;

    // Quality-adjusted score calculation:
    // - Checklist On-Time = 1.0, Checklist Late = 0.5, Pending = 0
    // - Delegation completed with 0 revisions (completedGreen) = 1.0
    // - Delegation completed with 1 revision (completedYellow) = 0.5
    // - Delegation completed with 2+ revisions (completedRed) = 0.0
    // - Pending = 0.0
    // - FMS On-Time = 1.0, FMS Late = 0.5, Pending = 0
    const checklistPoints = (checklist.done - checklist.late) * 1.0 + checklist.late * 0.5;
    const delegationPoints = (delegation.completedGreen || 0) * 1.0 + (delegation.completedYellow || 0) * 0.5;
    const fmsPoints = (fms.done - fms.late) * 1.0 + fms.late * 0.5;

    const points = checklistPoints + delegationPoints + fmsPoints;
    const qualityPct = total ? Math.round((points / total) * 100) : null;

    return {
      ...rec,
      checklist,
      delegation,
      fms,
      total,
      done,
      late,
      pending: total - done,
      pct: qualityPct,
      checklistPct: pct(checklist.done, checklist.total),
      delegationPct: pct(delegation.done, delegation.total),
      fmsPct: pct(fms.done, fms.total),
      greenPct: pct(delegation.green, delegation.total),
    };
  });

  rows.sort((a, b) => {
    if (a.pct === null && b.pct === null) return a.doer.localeCompare(b.doer);
    if (a.pct === null) return 1;
    if (b.pct === null) return -1;
    if (a.pct !== b.pct) return a.pct - b.pct;
    return b.pending - a.pending;
  });

  return rows;
}

// Org-level totals for the headline strip.
export function orgTotals(data) {
  const summaries = doerSummaries(data);
  let total = 0;
  let done = 0;
  let late = 0;
  let cTotal = 0;
  let cDone = 0;
  let dTotal = 0;
  let green = 0;
  let red = 0;
  let totalRevisions = 0;

  for (const s of summaries) {
    total += s.total;
    done += s.done;
    late += s.late;
    cTotal += s.checklist.total;
    cDone += s.checklist.done;
    dTotal += s.delegation.total;
    green += s.delegation.green;
    red += s.delegation.red;
    totalRevisions += s.delegation.revisions || 0;
  }

  // Quality-adjusted overall score
  let overallPoints = 0;
  for (const s of summaries) {
    const checklistPoints = (s.checklist.done - s.checklist.late) * 1.0 + s.checklist.late * 0.5;
    const delegationPoints = (s.delegation.completedGreen || 0) * 1.0 + (s.delegation.completedYellow || 0) * 0.5;
    const fmsPoints = (s.fms.done - s.fms.late) * 1.0 + s.fms.late * 0.5;
    overallPoints += checklistPoints + delegationPoints + fmsPoints;
  }
  const overallPct = total ? Math.round((overallPoints / total) * 100) : 0;

  return {
    total,
    done,
    late,
    pending: total - done,
    pct: overallPct,
    checklistDonePct: pct(cDone, cTotal),
    delegationGreenPct: pct(green, dTotal),
    redCount: red,
    doerCount: summaries.filter((s) => s.total > 0).length,
    totalRevisions,
  };
}

export function isoToday() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
