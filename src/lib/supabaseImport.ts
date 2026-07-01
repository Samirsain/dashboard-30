// =============================================================================
// supabaseImport.ts — one-time (repeatable) import of the current Google Sheet
// data into Supabase. Runs in the browser: it reuses loadData() (which fetches
// the already-normalised data from Apps Script) and writes rows into the
// doers / tasks tables. De-duplicates in code so re-running is safe.
// =============================================================================

import { supabase } from "./supabase";
import { loadData } from "./data";

type Progress = (msg: string) => void;

const norm = (s: any) => String(s ?? "").trim();
const up = (s: any) => norm(s).toUpperCase();
const isoOrNull = (s: any) => {
  const v = norm(s);
  return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
};

// Sheet status → our 3-state task status.
function taskStatus(raw: any): "Pending" | "Completed" | "Week Shifted" {
  const s = up(raw);
  if (s === "COMPLETED" || s === "DONE") return "Completed";
  if (s === "WEEK SHIFTED") return "Week Shifted";
  return "Pending";
}

export async function importFromSheets(onProgress: Progress = () => {}): Promise<{ doers: number; tasks: number }> {
  onProgress("Google Sheet se data la rahe hain…");
  const res: any = await loadData();
  const data = res?.data;
  if (!data) throw new Error("Sheet data load nahi hua. Backend URL check karein.");

  // 1) Resolve the two default list ids.
  const { data: lists, error: listErr } = await supabase
    .from("lists")
    .select("id, kind, is_default");
  if (listErr) throw new Error("Lists read error: " + listErr.message);
  const taskListId = lists?.find((l: any) => l.kind === "tasklist" && l.is_default)?.id;
  const checkListId = lists?.find((l: any) => l.kind === "checklist" && l.is_default)?.id;
  if (!taskListId || !checkListId) throw new Error("Default lists nahi mili — schema.sql chalao.");

  // 2) Doers.
  onProgress("Doers import kar rahe hain…");
  const doerRows = (data.doers || [])
    .map((d: any) => ({
      name: norm(d.doer),
      department: norm(d.department) || null,
      email: norm(d.email) || null,
      active: d.active !== false,
    }))
    .filter((d: any) => d.name);
  if (doerRows.length) {
    const { error } = await supabase.from("doers").upsert(doerRows, { onConflict: "name", ignoreDuplicates: true });
    if (error && !/duplicate|conflict/i.test(error.message)) throw new Error("Doers import error: " + error.message);
  }

  // 3) Tasks (delegation → Task List, checklist → Checklist). De-dupe in code.
  onProgress("Tasks taiyaar kar rahe hain…");
  const seen = new Set<string>();
  const taskRows: any[] = [];
  const pushTask = (r: any) => {
    const key = `${r.list_id}||${up(r.doer_name)}||${up(r.title)}||${r.planned_date || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    taskRows.push(r);
  };

  for (const r of data.delegation || []) {
    const status = taskStatus(r.status);
    const planned = isoOrNull(r.firstDate);
    const revised = isoOrNull(r.latestRevision);
    pushTask({
      list_id: taskListId,
      doer_name: norm(r.doer),
      title: norm(r.task),
      department: norm(r.department) || null,
      priority: norm(r.priority) || null,
      planned_date: planned,
      revised_date: revised && revised !== planned ? revised : null,
      revisions: Number(r.revisions) || 0,
      actual_date: status === "Completed" ? revised : null,
      status,
    });
  }

  for (const r of data.checklist || []) {
    const done = up(r.status) === "DONE" || norm(r.actual);
    pushTask({
      list_id: checkListId,
      doer_name: norm(r.doer),
      title: norm(r.task),
      department: norm(r.department) || null,
      frequency: norm(r.frequency) || null,
      planned_date: isoOrNull(r.planned),
      actual_date: isoOrNull(r.actual),
      status: done ? "Completed" : "Pending",
    });
  }

  const valid = taskRows.filter((t) => t.title && t.doer_name);
  onProgress(`${valid.length} tasks import kar rahe hain…`);

  // Insert in batches so a large history doesn't hit request limits.
  let inserted = 0;
  const BATCH = 200;
  for (let i = 0; i < valid.length; i += BATCH) {
    const chunk = valid.slice(i, i + BATCH);
    const { error } = await supabase.from("tasks").upsert(chunk, {
      onConflict: "list_id,doer_name,title,planned_date",
      ignoreDuplicates: true,
    });
    if (error && !/duplicate|conflict/i.test(error.message)) throw new Error("Tasks import error: " + error.message);
    inserted += chunk.length;
    onProgress(`${Math.min(inserted, valid.length)} / ${valid.length} tasks…`);
  }

  onProgress("Ho gaya ✅");
  return { doers: doerRows.length, tasks: valid.length };
}
