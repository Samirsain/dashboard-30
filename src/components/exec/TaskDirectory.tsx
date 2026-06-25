import * as React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { unifyTasks } from "@/lib/analytics";

const STATUS_STYLE: Record<string, string> = {
  Completed: "bg-green-100 text-success border-green-200",
  Late: "bg-red-100 text-danger border-red-200",
  Pending: "bg-amber-100 text-warning border-amber-200",
  "Week Shifted": "bg-purple-100 text-status-shifted border-purple-200",
};
const PRIORITY_STYLE: Record<string, string> = {
  High: "bg-red-50 text-danger",
  Urgent: "bg-red-50 text-danger",
  Medium: "bg-amber-50 text-warning",
  Low: "bg-blue-50 text-primary",
};
const AVATAR = ["bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-purple-100 text-purple-700", "bg-teal-100 text-teal-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
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

export function TaskDirectory({ data, source, title = "Enterprise Task Directory" }: { data: any; source?: "Checklist" | "Task List"; title?: string }) {
  const all = React.useMemo(() => {
    const t = unifyTasks(data);
    return source ? t.filter((x) => x.source === source) : t;
  }, [data, source]);

  const [search, setSearch] = React.useState("");
  const [dept, setDept] = React.useState("All");
  const [status, setStatus] = React.useState("All");
  const [priority, setPriority] = React.useState("All");
  const [perPage, setPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);

  const depts = React.useMemo(() => uniq(all.map((t) => t.department)), [all]);
  const hasPriority = React.useMemo(() => all.some((t) => t.priority), [all]);

  const rows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(
      (t) =>
        (dept === "All" || t.department === dept) &&
        (status === "All" || t.status === status) &&
        (priority === "All" || t.priority === priority) &&
        (!q || `${t.task} ${t.doer} ${t.id}`.toLowerCase().includes(q))
    );
  }, [all, search, dept, status, priority]);

  React.useEffect(() => setPage(1), [search, dept, status, priority, perPage, source]);

  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-border bg-surface-container-lowest p-5 md:flex-row md:items-center">
        <div>
          <h3 className="text-headline-sm font-semibold text-on-surface">{title}</h3>
          <p className="text-label-sm text-on-surface-variant">{rows.length} tasks</p>
        </div>
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full rounded-lg border border-border bg-surface-container-low py-2 pl-10 pr-4 text-body-sm outline-none focus:border-primary sm:w-60"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-5 py-3">
        <span className="flex items-center gap-1.5 text-label-md font-semibold text-on-surface-variant">
          <Icon name="filter_alt" className="text-[18px] text-outline" /> Filters
        </span>
        <FilterSelect value={dept} onChange={setDept} options={depts} allLabel="All Departments" />
        <FilterSelect value={status} onChange={setStatus} options={["Completed", "Pending", "Late", "Week Shifted"]} allLabel="All Statuses" />
        {hasPriority && <FilterSelect value={priority} onChange={setPriority} options={["High", "Medium", "Low"]} allLabel="All Priorities" />}
        {(search || dept !== "All" || status !== "All" || priority !== "All") && (
          <button
            onClick={() => {
              setSearch("");
              setDept("All");
              setStatus("All");
              setPriority("All");
            }}
            className="ml-auto text-label-md font-semibold text-primary hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface-container-low/80">
              {["Task ID", "Task", "Doer", "Department", source === "Task List" ? "Priority" : "Frequency", "Due Date", "Actual", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-label-md font-semibold uppercase tracking-wider text-on-surface-variant">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-body-sm text-on-surface-variant">
                  Koi task nahi mila.
                </td>
              </tr>
            ) : (
              pageRows.map((t) => (
                <tr key={t.id} className="table-row-hover group">
                  <td className="px-4 py-3 text-body-sm font-medium text-on-surface-variant">{t.id}</td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-body-sm font-medium text-on-surface group-hover:text-primary" title={t.task}>
                    {t.task}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("grid h-6 w-6 place-items-center rounded-full text-label-sm font-bold", AVATAR[hash(String(t.doer)) % AVATAR.length])}>
                        {initials(t.doer)}
                      </span>
                      <span className="whitespace-nowrap text-body-sm text-on-surface">{t.doer}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant">{t.department || "—"}</td>
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant">
                    {source === "Task List" ? (
                      t.priority ? (
                        <span className={cn("rounded px-2 py-1 text-xs font-semibold", PRIORITY_STYLE[t.priority] || "bg-surface-container text-on-surface-variant")}>{t.priority}</span>
                      ) : (
                        "—"
                      )
                    ) : (
                      t.frequency || "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant">{fmtDate(t.due) || "—"}</td>
                  <td className="px-4 py-3 text-body-sm text-on-surface-variant">{fmtDate(t.actual) || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-label-sm font-medium", STATUS_STYLE[t.status])}>{t.status}</span>
                      {t.shifts > 0 && t.status !== "Week Shifted" && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-label-sm font-medium text-status-shifted" title="Week shifted">
                          <Icon name="update" className="text-[13px]" />×{t.shifts}
                        </span>
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
      <div className="flex flex-col items-center justify-between gap-4 border-t border-border bg-surface-container-lowest p-4 sm:flex-row">
        <span className="text-body-sm text-on-surface-variant">
          Showing {rows.length === 0 ? 0 : start + 1}–{Math.min(start + perPage, rows.length)} of {rows.length}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="rounded border border-border bg-surface-container-lowest px-2 py-1 text-sm outline-none focus:border-primary"
          >
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <PageBtn disabled={clampedPage <= 1} onClick={() => setPage(clampedPage - 1)}>
              Prev
            </PageBtn>
            <span className="grid place-items-center rounded bg-primary px-3 text-sm font-medium text-white">{clampedPage}</span>
            <span className="grid place-items-center px-1 text-sm text-on-surface-variant">/ {totalPages}</span>
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
      className="rounded-lg border border-border bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary"
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
      className="rounded border border-border px-3 py-1 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
    >
      {children}
    </button>
  );
}
