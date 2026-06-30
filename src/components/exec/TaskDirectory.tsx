import * as React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { unifyTasks, todayISO } from "@/lib/analytics";
import { completeTask, reviseTask } from "@/lib/data";

// Add n days to an ISO date string ("YYYY-MM-DD"), returning ISO.
function addDaysISO(iso: string, n: number) {
  const [y, m, d] = String(iso || todayISO()).split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

const STATUS_STYLE: Record<string, string> = {
  Completed: "bg-primary-container text-on-primary border border-primary-container",
  Late: "bg-error text-on-error border border-error",
  Pending: "bg-transparent text-on-surface border border-on-surface",
  "Week Shifted": "bg-surface-container border border-on-surface text-on-surface",
};

// Tasks that can still be actioned (Done / Revise)
const isActionable = (status: string) => status === "Pending" || status === "Week Shifted";
const PRIORITY_STYLE: Record<string, string> = {
  Urgent: "bg-error text-on-error font-bold shadow-sm",
  Normal: "border border-outline text-on-surface-variant",
};

// Which system a task belongs to — icon + label so it's scannable at a glance.
const SYSTEM_META: Record<string, { icon: string; label: string }> = {
  Checklist: { icon: "checklist", label: "Checklist" },
  "Task List": { icon: "assignment", label: "Task List" },
  Workflow: { icon: "account_tree", label: "Workflow" },
  FMS: { icon: "account_tree", label: "Workflow" },
};
function SystemTag({ source }: { source: string }) {
  const m = SYSTEM_META[source] || { icon: "folder", label: source || "—" };
  return (
    <span
      title={m.label}
      className="inline-flex items-center gap-1 whitespace-nowrap border border-on-surface px-1.5 py-0.5 font-label-sm text-label-sm uppercase text-on-surface sm:px-2"
    >
      <Icon name={m.icon} className="text-[14px]" />
      <span className="hidden sm:inline">{m.label}</span>
    </span>
  );
}

function initials(name: string) {
  return (
    String(name || "")
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "—"
  );
}

function uniq(vals: any[]) {
  return [...new Set(vals.map((v) => String(v || "").trim()).filter(Boolean))].sort();
}

export function TaskDirectory({
  data,
  source,
  title = "Active Task Directory",
  todayOnly = false,
  onChanged,
}: {
  data: any;
  source?: "Checklist" | "Task List";
  title?: string;
  todayOnly?: boolean;
  onChanged?: () => void;
}) {
  const [optimisticDone, setOptimisticDone] = React.useState<Set<string>>(new Set());
  React.useEffect(() => setOptimisticDone(new Set()), [data]);

  const all = React.useMemo(() => {
    let t = unifyTasks(data);
    if (source) t = t.filter((x) => x.source === source);
    if (todayOnly) {
      const today = todayISO();
      t = t.filter((x) => String(x.due || x.created || "").trim() === today);
    }
    if (optimisticDone.size > 0) {
      t = t.map((x) => optimisticDone.has(x.id) ? { ...x, status: "Completed", actual: todayISO() } : x);
    }
    return t;
  }, [data, source, todayOnly, optimisticDone]);

  // Show the "System" column only in the mixed view (no single source picked),
  // e.g. Today's Followup — so you can see which system each task is from.
  const showSystem = !source;

  const [search, setSearch] = React.useState("");
  const [dept, setDept] = React.useState("All");
  const [status, setStatus] = React.useState("All");
  const [priority, setPriority] = React.useState("All");
  const [system, setSystem] = React.useState("All");
  const [perPage, setPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState("");
  const [revising, setRevising] = React.useState<any | null>(null);

  async function markDone(t: any) {
    if (busyId) return;
    if (!window.confirm(`Mark this task as DONE?\n\n${t.task}`)) return;
    setBusyId(t.id);
    setOptimisticDone((prev) => new Set(prev).add(t.id));
    setActionError("");
    try {
      await completeTask(t);
      onChanged && onChanged();
    } catch (e: any) {
      setOptimisticDone((prev) => {
        const next = new Set(prev);
        next.delete(t.id);
        return next;
      });
      setActionError(e?.message || "Could not mark the task done. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function doRevise(t: any, newDate: string) {
    setBusyId(t.id);
    setActionError("");
    try {
      await reviseTask(t, newDate);
      setRevising(null);
      onChanged && onChanged();
    } catch (e: any) {
      setActionError(e?.message || "Could not revise the task. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  const depts = React.useMemo(() => uniq(all.map((t) => t.department)), [all]);
  const systems = React.useMemo(() => uniq(all.map((t) => t.source)), [all]);
  const hasPriority = React.useMemo(() => all.some((t) => t.priority), [all]);

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = all.filter(
      (t) =>
        (dept === "All" || t.department === dept) &&
        (status === "All" || t.status === status || (status === "Completed" && t.status === "Late")) &&
        (priority === "All" || t.priority === priority) &&
        (system === "All" || t.source === system) &&
        (!q || `${t.task} ${t.doer} ${t.id}`.toLowerCase().includes(q))
    );
    
    return filtered.sort((a, b) => {
      const aDone = a.status === "Completed" || a.status === "Late";
      const bDone = b.status === "Completed" || b.status === "Late";
      if (aDone && !bDone) return 1;
      if (!aDone && bDone) return -1;
      return 0;
    });
  }, [all, search, dept, status, priority, system]);

  React.useEffect(() => setPage(1), [search, dept, status, priority, system, perPage, source]);

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col justify-between gap-3 border-b-2 border-on-surface bg-surface-container-low px-4 py-4 sm:gap-4 sm:px-5 md:flex-row md:items-center">
        <div>
          <h3 className="font-headline-md text-headline-md uppercase tracking-tight text-on-surface">{title}</h3>
          <p className="font-mono text-data-mono uppercase text-on-surface-variant">
            {rows.length} Entries • {todayOnly ? fmtDate(todayISO()) : "System Live"}
          </p>
        </div>
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="QUERY DATABASE"
            className="w-full border-2 border-on-surface bg-surface-container-lowest py-2 pl-10 pr-4 font-mono text-data-mono uppercase outline-none placeholder:text-on-surface-variant focus:bg-surface-container-low md:w-56"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-2 border-b-2 border-on-surface px-4 py-3 sm:px-5">
        <div className="flex w-full sm:w-auto items-center justify-between">
          <span className="flex shrink-0 items-center gap-1.5 font-label-sm text-label-sm uppercase text-on-surface">
            <Icon name="filter_alt" className="text-[18px]" /> Filter
          </span>
          {(search || dept !== "All" || status !== "All" || priority !== "All" || system !== "All") && (
            <button
              onClick={() => {
                setSearch("");
                setDept("All");
                setStatus("All");
                setPriority("All");
                setSystem("All");
              }}
              className="sm:hidden font-label-sm text-label-sm font-bold uppercase text-error hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap w-full sm:w-auto items-center gap-2">
          {showSystem && systems.length > 1 && (
            <FilterSelect value={system} onChange={setSystem} options={["Checklist", "Task List", "Workflow"]} allLabel="All Systems" className="flex-1 sm:flex-none min-w-[130px]" />
          )}
          <FilterSelect value={dept} onChange={setDept} options={depts} allLabel="All Departments" className="flex-1 sm:flex-none min-w-[130px]" />
          <FilterSelect value={status} onChange={setStatus} options={["Completed", "Pending"]} allLabel="All Statuses" className="flex-1 sm:flex-none min-w-[130px]" />
          {hasPriority && <FilterSelect value={priority} onChange={setPriority} options={["Normal", "Urgent"]} allLabel="All Priorities" className="flex-1 sm:flex-none min-w-[130px]" />}
        </div>
        
        {(search || dept !== "All" || status !== "All" || priority !== "All" || system !== "All") && (
          <button
            onClick={() => {
              setSearch("");
              setDept("All");
              setStatus("All");
              setPriority("All");
              setSystem("All");
            }}
            className="hidden sm:block ml-auto font-label-sm text-label-sm font-bold uppercase text-error hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 border-b-2 border-error bg-error/5 px-5 py-2 font-label-sm text-label-sm uppercase text-error">
          <Icon name="error" className="text-[16px]" />
          {actionError}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-on-surface bg-surface-container">
              <th className="hidden border-r border-outline-variant px-3 py-3 font-label-sm text-label-sm uppercase text-on-surface 2xl:table-cell">ID</th>
              <th className="border-r border-outline-variant px-3 py-3 font-label-sm text-label-sm uppercase text-on-surface">Description</th>
              {showSystem && <th className="border-r border-outline-variant px-3 py-3 font-label-sm text-label-sm uppercase text-on-surface">System</th>}
              <th className="border-r border-outline-variant px-3 py-3 font-label-sm text-label-sm uppercase text-on-surface">Doer</th>
              <th className="hidden border-r border-outline-variant px-3 py-3 font-label-sm text-label-sm uppercase text-on-surface md:table-cell">Dept</th>
              <th className="hidden border-r border-outline-variant px-3 py-3 text-center font-label-sm text-label-sm uppercase text-on-surface xl:table-cell">
                {source === "Task List" ? "Priority" : "Freq"}
              </th>
              <th className="border-r border-outline-variant px-3 py-3 font-label-sm text-label-sm uppercase text-on-surface">Due</th>
              <th className="hidden border-r border-outline-variant px-3 py-3 font-label-sm text-label-sm uppercase text-on-surface lg:table-cell">Actual</th>
              <th className="px-2 py-3 text-center font-label-sm text-label-sm uppercase text-on-surface w-20 min-w-[80px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={showSystem ? 9 : 8} className="px-3 py-12 text-center font-mono text-data-mono uppercase text-on-surface-variant">
                  No matching records.
                </td>
              </tr>
            ) : (
              pageRows.map((t) => (
                <tr key={t.id} className={cn("table-row-hover group border-b border-outline-variant", t.priority === "Urgent" && "bg-error/5 border-l-2 border-l-error")}>
                  <td className="hidden whitespace-nowrap border-r border-outline-variant px-3 py-3 font-mono text-data-mono text-on-surface-variant 2xl:table-cell">{t.id}</td>
                  <td className="border-r border-outline-variant px-3 py-3 text-body-md font-medium text-on-surface group-hover:underline">
                    {t.task}
                  </td>
                  {showSystem && (
                    <td className="border-r border-outline-variant px-3 py-3">
                      <SystemTag source={t.source} />
                    </td>
                  )}
                  <td className="border-r border-outline-variant px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center border border-on-surface bg-surface-container font-mono text-[10px] font-bold text-on-surface">
                        {initials(t.doer)}
                      </span>
                      <span className="font-label-sm text-label-sm uppercase text-on-surface">{t.doer}</span>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap border-r border-outline-variant px-3 py-3 font-mono text-data-mono uppercase text-on-surface-variant md:table-cell">{t.department || "—"}</td>
                  <td className="hidden border-r border-outline-variant px-3 py-3 text-center font-mono text-data-mono uppercase text-on-surface-variant xl:table-cell">
                    {source === "Task List" ? (
                      t.priority ? (
                        <span className={cn("inline-block px-2 py-0.5 font-label-sm text-label-sm uppercase", PRIORITY_STYLE[t.priority] || "border border-outline text-on-surface-variant")}>
                          {t.priority}
                        </span>
                      ) : (
                        "—"
                      )
                    ) : (
                      t.frequency || "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap border-r border-outline-variant px-3 py-3 font-mono text-data-mono text-on-surface-variant">{fmtDate(t.due) || "—"}</td>
                  <td className="hidden whitespace-nowrap border-r border-outline-variant px-3 py-3 font-mono text-data-mono text-on-surface-variant lg:table-cell">{fmtDate(t.actual) || "—"}</td>
                  <td className="px-2 py-2 text-center w-20 min-w-[80px]">
                    <div className="flex flex-col items-stretch gap-1">
                      {isActionable(t.status) && onChanged ? (
                        <>
                          <button
                            onClick={() => markDone(t)}
                            disabled={busyId === t.id}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1 border-2 border-on-surface bg-on-surface text-on-primary font-label-sm text-label-sm uppercase hover:bg-surface hover:text-on-surface transition-colors disabled:opacity-50 w-full"
                            title="Mark this task done"
                          >
                            {busyId === t.id ? <Icon name="progress_activity" className="text-[11px] animate-spin" /> : null}
                            Done
                          </button>
                          {t.source === "Task List" && (
                            <button
                              onClick={() => setRevising(t)}
                              disabled={busyId === t.id}
                              className="inline-flex items-center justify-center gap-1 px-2 py-1 border-2 border-on-surface text-on-surface font-label-sm text-label-sm uppercase hover:bg-on-surface hover:text-on-primary transition-colors disabled:opacity-50 w-full"
                              title="Reschedule this task"
                            >
                              Revise
                            </button>
                          )}
                        </>
                      ) : (
                        <span className={cn("inline-block whitespace-nowrap px-2 py-0.5 font-label-sm text-label-sm uppercase text-center", STATUS_STYLE[t.status === "Late" ? "Completed" : t.status] || "border border-on-surface text-on-surface")}>{t.status === "Late" ? "Completed" : t.status}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 border-t-2 border-on-surface bg-surface-container-low px-4 py-3 sm:flex-row sm:px-5">
        <span className="font-mono text-data-mono uppercase text-on-surface-variant">
          Showing {rows.length === 0 ? 0 : start + 1}–{Math.min(start + perPage, rows.length)} of {rows.length}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="border-2 border-on-surface bg-surface-container-lowest px-2 py-1 font-mono text-data-mono uppercase outline-none"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <div className="flex">
            <PageBtn disabled={clampedPage <= 1} onClick={() => setPage(clampedPage - 1)}>
              Prev
            </PageBtn>
            <span className="grid place-items-center border-y-2 border-on-surface bg-on-surface px-3 font-mono text-data-mono font-bold text-on-primary">{clampedPage}</span>
            <span className="grid place-items-center border-y-2 border-on-surface px-2 font-mono text-data-mono text-on-surface-variant">/ {totalPages}</span>
            <PageBtn disabled={clampedPage >= totalPages} onClick={() => setPage(clampedPage + 1)}>
              Next
            </PageBtn>
          </div>
        </div>
      </div>

      {revising && (
        <ReviseModal
          task={revising}
          busy={busyId === revising.id}
          onClose={() => setRevising(null)}
          onConfirm={(newDate) => doRevise(revising, newDate)}
        />
      )}
    </div>
  );
}

// Small date-picker modal for rescheduling a pending task.
function ReviseModal({
  task,
  busy,
  onClose,
  onConfirm,
}: {
  task: any;
  busy: boolean;
  onClose: () => void;
  onConfirm: (newDate: string) => void;
}) {
  const base = String(task.due || task.created || todayISO());
  const [date, setDate] = React.useState(addDaysISO(base, 1));

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const quick = [
    { label: "Tomorrow", iso: addDaysISO(base, 1) },
    { label: "+2 Days", iso: addDaysISO(base, 2) },
    { label: "Next Week", iso: addDaysISO(base, 7) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card w-full max-w-md">
        <div className="flex items-center justify-between gap-3 border-b-2 border-on-surface bg-surface-container-low px-5 py-4">
          <div className="flex items-center gap-2">
            <Icon name="event_repeat" className="text-[22px] text-on-surface" />
            <h3 className="font-headline-md text-headline-md uppercase tracking-tight text-on-surface">Revise Date</h3>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border-2 border-on-surface text-on-surface transition-colors hover:bg-on-surface hover:text-on-primary"
            aria-label="Close"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="border-l-4 border-on-surface pl-3 text-body-md font-medium text-on-surface" title={task.task}>
            {task.task}
          </p>
          <p className="font-mono text-data-mono uppercase text-on-surface-variant">
            Current date: {fmtDate(base) || "—"}
          </p>

          <div className="flex flex-wrap gap-2">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setDate(q.iso)}
                className={cn(
                  "border-2 px-3 py-1.5 font-label-sm text-label-sm uppercase transition-colors",
                  date === q.iso ? "border-on-surface bg-on-surface text-on-primary" : "border-on-surface bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                )}
              >
                {q.label}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="mb-1.5 block font-label-sm text-label-sm uppercase text-on-surface-variant">Or pick a date</span>
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border-2 border-on-surface bg-surface-container-lowest px-3 py-2.5 font-mono text-data-mono uppercase text-on-surface outline-none focus:bg-surface-container-low"
            />
          </label>

          <div className="flex items-center justify-end gap-2 border-t-2 border-on-surface pt-4">
            <button
              type="button"
              onClick={onClose}
              className="border-2 border-on-surface px-4 py-2.5 font-label-sm text-label-sm uppercase text-on-surface transition-colors hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !date}
              onClick={() => onConfirm(date)}
              className="inline-flex items-center gap-2 border-2 border-on-surface bg-on-surface px-5 py-2.5 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface disabled:opacity-50"
            >
              <Icon name={busy ? "progress_activity" : "event_available"} className={cn("text-[18px]", busy && "animate-spin")} />
              {busy ? "Saving…" : "Shift Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, allLabel, className }: { value: string; onChange: (v: string) => void; options: string[]; allLabel: string; className?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("border-2 border-on-surface bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm uppercase text-on-surface outline-none focus:bg-surface-container-low", className)}
    >
      <option value="All">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function PageBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="border-2 border-on-surface px-3 py-1 font-label-sm text-label-sm uppercase text-on-surface transition-colors hover:bg-on-surface hover:text-on-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-on-surface"
    >
      {children}
    </button>
  );
}
