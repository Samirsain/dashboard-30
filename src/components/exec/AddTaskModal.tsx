import * as React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import { addTask } from "@/lib/data";
import { todayISO } from "@/lib/analytics";
import { getActiveConnections } from "@/lib/sheets";

type System = "tasklist" | "checklist";

const PRIORITIES = ["Normal", "Urgent"];
const FREQUENCIES = ["One-time", "Daily", "Weekly", "Monthly"];

export function AddTaskModal({
  doers: _legacyDoers,
  data,
  allowedModules = [],
  onClose,
  onAdded,
  sheetId: lockedSheetId,
  sheetType: lockedSheetType,
  lockedDoer,
}: {
  doers: { doer: string; department?: string }[];
  data?: any;
  allowedModules?: string[];
  onClose: () => void;
  onAdded: () => void;
  sheetId?: string;
  sheetType?: System;
  lockedDoer?: string;
}) {
  const connections = React.useMemo(() => getActiveConnections(), []);

  // Determine default target
  const defaultTarget = React.useMemo(() => {
    let t = "master:tasklist";
    if (lockedSheetId) t = `conn:${lockedSheetId}`;
    else if (lockedSheetType) t = `master:${lockedSheetType}`;

    // If the preferred target is not allowed, pick the first allowed one
    const isAllowed = (tgt: string) => {
      if (tgt === "master:tasklist") return allowedModules.includes("tasklist");
      if (tgt === "master:checklist") return allowedModules.includes("checklist");
      if (tgt.startsWith("conn:")) {
        const id = tgt.replace("conn:", "");
        const conn = connections.find((c) => c.sheetId === id);
        return conn && allowedModules.includes(conn.moduleSlug);
      }
      return false;
    };

    if (isAllowed(t)) return t;

    if (allowedModules.includes("tasklist")) return "master:tasklist";
    if (allowedModules.includes("checklist")) return "master:checklist";
    const firstConn = connections.find((c) => allowedModules.includes(c.moduleSlug));
    if (firstConn) return `conn:${firstConn.sheetId}`;
    return t; // fallback
  }, [lockedSheetId, lockedSheetType, allowedModules, connections]);

  const [target, setTarget] = React.useState<string>(defaultTarget);
  const [task, setTask] = React.useState("");
  const [doer, setDoer] = React.useState(lockedDoer || "");
  const [priority, setPriority] = React.useState("Normal");
  const [frequency, setFrequency] = React.useState("One-time");
  const [date, setDate] = React.useState(todayISO());
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState(false);

  // Derive system and sheetId from the selected target
  const { system, activeSheetId } = React.useMemo(() => {
    if (target.startsWith("conn:")) {
      const id = target.replace("conn:", "");
      const conn = connections.find((c) => c.sheetId === id);
      return { system: (conn?.sheetType || "tasklist") as System, activeSheetId: id };
    }
    return { system: target.replace("master:", "") as System, activeSheetId: "" };
  }, [target, connections]);

  // Extract doers dynamically based on the active sheet
  const doerList = React.useMemo(() => {
    let sourceRows: any[] = [];
    if (activeSheetId) {
      const conn = connections.find((c) => c.sheetId === activeSheetId);
      if (conn && data && data[conn.moduleSlug]) {
        sourceRows = data[conn.moduleSlug];
      }
    } else {
      sourceRows = _legacyDoers || [];
    }
    // Extract doers specifically from this sheet's rows
    const names = sourceRows.map((r: any) => r.doer).filter(Boolean);
    return [...new Set(names)].map((n) => String(n).trim()).sort();
  }, [activeSheetId, connections, data, _legacyDoers]);

  const deptOf = (name: string) => {
    if (activeSheetId) {
      const conn = connections.find((c) => c.sheetId === activeSheetId);
      if (conn && data && data[conn.moduleSlug]) {
        const row = data[conn.moduleSlug].find((r: any) => r.doer === name);
        return row?.department || "";
      }
      return "";
    }
    return (_legacyDoers || []).find((d) => d.doer === name)?.department || "";
  };

  // Close on Escape.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!task.trim()) return setError("Task description likhna zaroori hai.");
    if (!doer.trim()) return setError("Kis doer ke liye task hai, choose karein.");

    setBusy(true);
    try {
      await addTask({
        system,
        task: task.trim(),
        doer: doer.trim(),
        date,
        sheetId: activeSheetId,
        ...(system === "tasklist" ? { priority } : { frequency, department: deptOf(doer) }),
      });
      setDone(true);
      onAdded();
      setTimeout(onClose, 900);
    } catch (err: any) {
      setError(err?.message || "Task add nahi ho paya. Dobara try karein.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card max-h-[92vh] w-full max-w-lg overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-on-surface bg-surface-container-low px-5 py-4">
          <div className="flex items-center gap-2">
            <Icon name="add_task" className="text-[22px] text-on-surface" />
            <h3 className="font-headline-md text-headline-md uppercase tracking-tight text-on-surface">Add Task</h3>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border-2 border-on-surface text-on-surface transition-colors hover:bg-on-surface hover:text-on-primary"
            aria-label="Close"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center border-2 border-primary-container bg-primary-container text-on-primary">
              <Icon name="check" className="text-[24px]" />
            </span>
            <div className="font-headline-md text-headline-md uppercase text-on-surface">Task Added</div>
            <p className="font-mono text-data-mono uppercase text-on-surface-variant">Sheet me save ho gaya.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5">
            {/* Target List Dropdown */}
            <label className="block">
              <Label>Save to List</Label>
              <Field as="select" value={target} onChange={(e: any) => setTarget(e.target.value)}>
                {allowedModules.includes("tasklist") && <option value="master:tasklist">Main Task List (Master)</option>}
                {allowedModules.includes("checklist") && <option value="master:checklist">Main Checklist (Master)</option>}
                {connections
                  .filter((c) => allowedModules.includes(c.moduleSlug))
                  .map((c) => (
                    <option key={c.sheetId} value={`conn:${c.sheetId}`}>
                      {c.name} ({c.sheetType === "tasklist" ? "Task List" : "Checklist"})
                    </option>
                  ))}
              </Field>
            </label>

            {/* Task description */}
            <label className="block">
              <Label>Task Description</Label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                rows={2}
                autoFocus
                placeholder="Kya karna hai…"
                className="w-full resize-none border-2 border-on-surface bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface outline-none focus:bg-surface-container-low"
              />
            </label>

            {/* Doer — read-only when lockedDoer is set (employee adding to their own sheet) */}
            <label className="block">
              <Label>Assign To (Doer)</Label>
              {lockedDoer ? (
                <Field value={lockedDoer} readOnly className="cursor-not-allowed opacity-70" />
              ) : (
                <Field as="select" value={doer} onChange={(e: any) => setDoer(e.target.value)}>
                  <option value="">— Select doer —</option>
                  {doerList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Field>
              )}
            </label>

            {/* Priority (Task List) / Frequency (Checklist) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {system === "tasklist" ? (
                <label className="block">
                  <Label>Priority</Label>
                  <Field as="select" value={priority} onChange={(e: any) => setPriority(e.target.value)}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Field>
                </label>
              ) : (
                <label className="block">
                  <Label>Frequency</Label>
                  <Field as="select" value={frequency} onChange={(e: any) => setFrequency(e.target.value)}>
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Field>
                </label>
              )}

              <label className="block">
                <Label>{system === "tasklist" ? "First Date" : "Planned Date"}</Label>
                <Field type="date" value={date} onChange={(e: any) => setDate(e.target.value)} />
              </label>
            </div>

            {system === "checklist" && doer && (
              <p className="font-mono text-data-mono uppercase text-on-surface-variant">
                Department: {deptOf(doer) || "—"}
              </p>
            )}

            {error && (
              <div className="border-2 border-error bg-error/5 px-3 py-2 font-label-sm text-label-sm uppercase text-error">{error}</div>
            )}

            <div className="flex items-center justify-end gap-2 border-t-2 border-on-surface pt-4">
              <button
                type="button"
                onClick={onClose}
                className="border-2 border-on-surface px-4 py-2.5 font-label-sm text-label-sm uppercase text-on-surface transition-colors hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 border-2 border-on-surface bg-on-surface px-5 py-2.5 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface disabled:opacity-50"
              >
                <Icon name={busy ? "progress_activity" : "add"} className={cn("text-[18px]", busy && "animate-spin")} />
                {busy ? "Saving…" : "Add Task"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block font-label-sm text-label-sm uppercase text-on-surface-variant">{children}</span>;
}

function Field({ as, className, ...props }: any) {
  const cls =
    "w-full border-2 border-on-surface bg-surface-container-lowest px-3 py-2.5 font-mono text-data-mono uppercase text-on-surface outline-none focus:bg-surface-container-low";
  if (as === "select") return <select className={cn(cls, className)} {...props} />;
  return <input className={cn(cls, className)} {...props} />;
}
