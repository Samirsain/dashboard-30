import * as React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { unifyTasks, todayISO } from "@/lib/analytics";

const STATUS_STYLE: Record<string, string> = {
  Completed: "bg-primary-container text-on-primary border-2 border-primary-container",
  Late: "bg-error text-on-error border-2 border-error",
  Pending: "bg-transparent text-on-surface border-2 border-on-surface",
};
const PRIORITY_STYLE: Record<string, string> = {
  High: "bg-on-surface text-on-primary",
  Urgent: "bg-on-surface text-on-primary",
  Medium: "border border-on-surface text-on-surface",
  Low: "border border-outline text-on-surface-variant",
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
}: {
  data: any;
  source?: "Checklist" | "Task List";
  title?: string;
  todayOnly?: boolean;
}) {
  const all = React.useMemo(() => {
    let t = unifyTasks(data);
    if (source) t = t.filter((x) => x.source === source);
    if (todayOnly) {
      const today = todayISO();
      t = t.filter((x) => String(x.due || x.created || "").trim() === today);
    }
    return t;
  }, [data, source, todayOnly]);

  // Show the "System" column only in the mixed view (no single source picked),
  // e.g. the Today Follow List — so you can see which system each task is from.
  const showSystem = !source;

  const [search, setSearch] = React.useState("");
  const [dept, setDept] = React.useState("All");
  const [status, setStatus] = React.useState("All");
  const [priority, setPriority] = React.useState("All");
  const [system, setSystem] = React.useState("All");
  const [perPage, setPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);

  const depts = React.useMemo(() => uniq(all.map((t) => t.department)), [all]);
  const systems = React.useMemo(() => uniq(all.map((t) => t.source)), [all]);
  const hasPriority = React.useMemo(() => all.some((t) => t.priority), [all]);

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(
      (t) =>
        (dept === "All" || t.department === dept) &&
        (status === "All" || t.status === status) &&
        (priority === "All" || t.priority === priority) &&
        (system === "All" || t.source === system) &&
        (!q || `${t.task} ${t.doer} ${t.id}`.toLowerCase().includes(q))
    );
  }, [all, search, dept, status, priority, system]);

  React.useEffect(() => setPage(1), [search, dept, status, priority, system, perPage, source]);

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b-2 border-on-surface bg-surface-container-low p-5 md:flex-row md:items-center">
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
            className="w-full border-2 border-on-surface bg-surface-container-lowest py-2 pl-10 pr-4 font-mono text-data-mono uppercase outline-none placeholder:text-on-surface-variant focus:bg-surface-container-low sm:w-64"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 border-b-2 border-on-surface px-5 py-3">
        <span className="flex items-center gap-1.5 font-label-sm text-label-sm uppercase text-on-surface">
          <Icon name="filter_alt" className="text-[18px]" /> Filter
        </span>
        {showSystem && systems.length > 1 && (
          <FilterSelect value={system} onChange={setSystem} options={["Checklist", "Task List", "Workflow"]} allLabel="All Systems" />
        )}
        <FilterSelect value={dept} onChange={setDept} options={depts} allLabel="All Departments" />
        <FilterSelect value={status} onChange={setStatus} options={["Completed", "Late", "Pending"]} allLabel="All Statuses" />
        {hasPriority && <FilterSelect value={priority} onChange={setPriority} options={["High", "Medium", "Low"]} allLabel="All Priorities" />}
        {(search || dept !== "All" || status !== "All" || priority !== "All" || system !== "All") && (
          <button
            onClick={() => {
              setSearch("");
              setDept("All");
              setStatus("All");
              setPriority("All");
              setSystem("All");
            }}
            className="ml-auto font-label-sm text-label-sm font-bold uppercase text-error hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

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
              <th className={cn("border-r border-outline-variant px-3 py-3 font-label-sm text-label-sm uppercase text-on-surface", todayOnly ? "hidden" : "hidden xl:table-cell")}>Due</th>
              <th className="hidden border-r border-outline-variant px-3 py-3 font-label-sm text-label-sm uppercase text-on-surface lg:table-cell">Actual</th>
              <th className="px-3 py-3 text-center font-label-sm text-label-sm uppercase text-on-surface">Status</th>
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
                <tr key={t.id} className="table-row-hover group border-b border-outline-variant">
                  <td className="hidden whitespace-nowrap border-r border-outline-variant px-3 py-3 font-mono text-data-mono text-on-surface-variant 2xl:table-cell">{t.id}</td>
                  <td className="max-w-[140px] truncate border-r border-outline-variant px-3 py-3 text-body-md font-medium text-on-surface group-hover:underline sm:max-w-[240px] lg:max-w-[320px]" title={t.task}>
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
                      <span className="hidden max-w-[7rem] truncate font-label-sm text-label-sm uppercase text-on-surface md:inline" title={t.doer}>{t.doer}</span>
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
                  <td className={cn("whitespace-nowrap border-r border-outline-variant px-3 py-3 font-mono text-data-mono text-on-surface-variant", todayOnly ? "hidden" : "hidden xl:table-cell")}>{fmtDate(t.due) || "—"}</td>
                  <td className="hidden whitespace-nowrap border-r border-outline-variant px-3 py-3 font-mono text-data-mono text-on-surface-variant lg:table-cell">{fmtDate(t.actual) || "—"}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={cn("inline-block whitespace-nowrap px-2.5 py-1 font-label-sm text-label-sm uppercase", STATUS_STYLE[t.status])}>{t.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-4 border-t-2 border-on-surface bg-surface-container-low p-4 sm:flex-row">
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
    </div>
  );
}

function FilterSelect({ value, onChange, options, allLabel }: { value: string; onChange: (v: string) => void; options: string[]; allLabel: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border-2 border-on-surface bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm uppercase text-on-surface outline-none focus:bg-surface-container-low"
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
