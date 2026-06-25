import * as React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import {
  kpis,
  statusBreakdown,
  departmentPerformance,
  frequencyBreakdown,
  dailyCompletions,
  weeklyProductivity,
  activityHeatmap,
  todaySummary,
  insights,
  recentActivity,
} from "@/lib/analytics";

const PRIMARY = "#004ac6";

export function Panel({
  title,
  icon,
  right,
  children,
  className,
}: {
  title?: string;
  icon?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass-card p-5 sm:p-6", className)}>
      {(title || right) && (
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-headline-sm font-semibold text-on-surface">
            {icon && <Icon name={icon} className="text-[20px] text-primary" />}
            {title}
          </h3>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

// ---- KPI cards -------------------------------------------------------------
export function KpiCards({ data }: { data: any }) {
  const k = kpis(data);
  const cards = [
    { label: "Total Tasks", value: k.total, icon: "format_list_bulleted", tint: "bg-primary-fixed text-primary" },
    { label: "Completed", value: k.done, icon: "check_circle", tint: "bg-green-100 text-success" },
    { label: "Pending", value: k.pending, icon: "pending_actions", tint: "bg-amber-100 text-warning" },
    { label: "Week Shifted", value: k.shifted, icon: "update", tint: "bg-purple-100 text-status-shifted" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="glass-card glass-card-hover p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="mb-1 text-label-md uppercase tracking-wider text-on-surface-variant">{c.label}</p>
              <h3 className="text-headline-lg font-bold tabular-nums text-on-surface">{c.value.toLocaleString()}</h3>
            </div>
            <span className={cn("grid h-10 w-10 place-items-center rounded-full", c.tint)}>
              <Icon name={c.icon} className="text-[20px]" />
            </span>
          </div>
        </div>
      ))}
      <div className="glass-card glass-card-hover col-span-2 bg-gradient-to-br from-primary to-primary-fixed-variant p-5 text-white lg:col-span-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-1 text-label-md uppercase tracking-wider text-primary-fixed">Completion %</p>
            <h3 className="text-headline-lg font-bold tabular-nums">{k.pct}%</h3>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 backdrop-blur-sm">
            <Icon name="speed" className="text-[20px]" />
          </span>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/20">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${k.pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ---- Status donut ----------------------------------------------------------
export function StatusDonut({ data }: { data: any }) {
  const { segments, total } = statusBreakdown(data);
  let acc = 0;
  const stops = segments
    .map((s) => {
      const from = (acc / (total || 1)) * 100;
      acc += s.value;
      const to = (acc / (total || 1)) * 100;
      return `${s.color} ${from}% ${to}%`;
    })
    .join(", ");
  return (
    <Panel title="Task Status" icon="donut_large">
      <div className="flex flex-col items-center justify-around gap-8 md:flex-row">
        <div
          className="relative grid h-44 w-44 place-items-center rounded-full"
          style={{ background: total ? `conic-gradient(${stops})` : "#e0e3e5" }}
        >
          <div className="grid h-28 w-28 place-items-center rounded-full bg-surface-container-lowest text-center">
            <div>
              <div className="text-headline-md font-bold text-on-surface">{total}</div>
              <div className="text-label-sm text-on-surface-variant">Tasks</div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {segments.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="w-28 text-body-sm text-on-surface">{s.key}</span>
              <span className="text-label-md font-bold tabular-nums text-on-surface">{s.pct}%</span>
              <span className="text-label-sm text-on-surface-variant">({s.value})</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ---- Department performance (stacked columns) ------------------------------
export function DeptPerformance({ data }: { data: any }) {
  const rows = departmentPerformance(data);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Panel
      title="Department Performance"
      icon="bar_chart"
      right={
        <div className="flex gap-3 text-label-sm text-on-surface-variant">
          <Legend color="bg-primary" label="Done" />
          <Legend color="bg-surface-variant" label="Pending" />
        </div>
      }
    >
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex h-56 items-end justify-between gap-2 overflow-x-auto pb-1">
          {rows.map((r) => {
            const h = (r.total / max) * 100;
            const donePart = r.total ? (r.done / r.total) * 100 : 0;
            return (
              <div key={r.department} className="group flex h-full min-w-[42px] flex-1 flex-col items-center justify-end">
                <div className="relative flex w-9 flex-col justify-end rounded-md lg:w-12" style={{ height: `${h}%` }} title={`${r.done}/${r.total} done`}>
                  <div className="w-full rounded-t-md bg-surface-variant" style={{ height: `${100 - donePart}%` }} />
                  <div className="w-full rounded-b-md bg-primary transition-colors group-hover:bg-primary-container" style={{ height: `${donePart}%` }} />
                </div>
                <span className="mt-2 w-full truncate text-center text-label-sm text-on-surface-variant" title={r.department}>
                  {r.department}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ---- Frequency split -------------------------------------------------------
export function FrequencyChart({ data }: { data: any }) {
  const rows = frequencyBreakdown(data);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <Panel
      title="Checklist Frequency"
      icon="repeat"
      right={
        <div className="flex gap-3 text-label-sm text-on-surface-variant">
          <Legend color="bg-primary" label="Done" />
          <Legend color="bg-warning" label="Pending" />
        </div>
      }
    >
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex h-40 items-end gap-5">
          {rows.map((r) => {
            const h = (r.total / max) * 100;
            const donePart = r.total ? (r.done / r.total) * 100 : 0;
            return (
              <div key={r.frequency} className="flex flex-1 flex-col items-center justify-end">
                <div className="flex w-full max-w-[70px] flex-col justify-end" style={{ height: `${h}%` }}>
                  <div className="w-full rounded-t-md bg-warning" style={{ height: `${100 - donePart}%` }} />
                  <div className="w-full rounded-b-md bg-primary" style={{ height: `${donePart}%` }} />
                </div>
                <span className="mt-2 text-label-sm text-on-surface-variant">{r.frequency}</span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ---- Daily completion line -------------------------------------------------
export function DailyTrend({ data }: { data: any }) {
  const series = dailyCompletions(data, 30);
  const max = Math.max(1, ...series.map((s) => s.value));
  const pts = series
    .map((s, i) => {
      const x = (i / (series.length - 1 || 1)) * 100;
      const y = 100 - (s.value / max) * 90 - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = series[series.length - 1];
  const lastY = 100 - (last.value / max) * 90 - 5;
  return (
    <Panel title="Daily Completion (30d)" icon="show_chart">
      <div className="relative flex h-44 w-full items-end">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline className="animated-trend" fill="none" stroke={PRIMARY} strokeWidth="1.6" points={pts} />
          <circle cx="100" cy={lastY} r="1.8" fill={PRIMARY} />
        </svg>
        <div className="absolute bottom-0 flex w-full justify-between border-t border-border pt-1 text-[10px] text-on-surface-variant">
          <span>{fmtDate(series[0].date)}</span>
          <span>{fmtDate(series[Math.floor(series.length / 2)].date)}</span>
          <span>{fmtDate(last.date)}</span>
        </div>
      </div>
    </Panel>
  );
}

// ---- Weekly productivity area ----------------------------------------------
export function WeeklyProductivity({ data }: { data: any }) {
  const series = weeklyProductivity(data);
  if (series.length === 0)
    return (
      <Panel title="Weekly Productivity" icon="area_chart">
        <Empty />
      </Panel>
    );
  const pts = series.map((s, i) => {
    const x = (i / (series.length - 1 || 1)) * 100;
    const y = 100 - s.pct * 0.9 - 5;
    return { x, y };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `0,100 ${line} 100,100`;
  return (
    <Panel title="Weekly Productivity" icon="area_chart">
      <div className="relative flex h-44 w-full items-end">
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon fill="rgba(0,74,198,0.18)" points={area} />
          <polyline className="animated-trend" fill="none" stroke={PRIMARY} strokeWidth="1.6" points={line} />
        </svg>
        <div className="absolute bottom-0 flex w-full justify-between border-t border-border pt-1 text-[10px] text-on-surface-variant">
          {series.map((s) => (
            <span key={s.key} className="max-w-[3rem] truncate">
              {s.label.split(" ")[0]} {s.label.split(" ")[1]}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ---- Activity heatmap ------------------------------------------------------
export function Heatmap({ data }: { data: any }) {
  const cells = activityHeatmap(data, 90);
  const shade = ["bg-surface-variant", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"];
  return (
    <Panel title="Activity Heatmap (90d)" icon="calendar_view_month">
      <div className="flex flex-wrap gap-1">
        {cells.map((c) => (
          <span
            key={c.date}
            className={cn("heatmap-cell cursor-pointer hover:ring-2 hover:ring-outline", shade[c.intensity])}
            title={`${fmtDate(c.date)}: ${c.count} done`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-label-sm text-on-surface-variant">
        <span>Less</span>
        {shade.map((s, i) => (
          <span key={i} className={cn("h-3 w-3 rounded-sm", s)} />
        ))}
        <span>More</span>
      </div>
    </Panel>
  );
}

// ---- Today's summary -------------------------------------------------------
export function TodaySummary({ data }: { data: any }) {
  const s = todaySummary(data);
  const rows = [
    { label: "Top Performer", value: s.topPerformer, tone: "text-on-surface" },
    { label: "Busy Department", value: s.busyDept, tone: "text-on-surface" },
    { label: "Overdue", value: String(s.overdue), tone: "text-danger" },
    { label: "Critical Pending", value: String(s.criticalPending), tone: "text-warning" },
  ];
  return (
    <Panel title="Today's Summary" icon="insights">
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between rounded-lg px-2 py-2.5 hover:bg-surface-container-low">
            <span className="text-body-md text-on-surface-variant">{r.label}</span>
            <span className={cn("text-label-md font-bold", r.tone)}>{r.value}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---- AI / derived insights -------------------------------------------------
export function AiInsights({ data }: { data: any }) {
  const items = insights(data);
  return (
    <section className="glass-card border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon name="auto_awesome" className="text-[20px] text-status-shifted" />
        <h3 className="text-headline-sm font-semibold text-on-surface">Insights</h3>
      </div>
      {items.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li key={i} className="rounded-lg border border-white bg-white/60 p-3 text-body-sm text-on-surface shadow-sm">
              <strong className="mb-0.5 block font-semibold">{it.title}</strong>
              {it.body}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---- Recent activity timeline ----------------------------------------------
export function RecentActivity({ data }: { data: any }) {
  const events = recentActivity(data, 6);
  const dot = { done: "bg-success", shifted: "bg-status-shifted" } as Record<string, string>;
  return (
    <Panel title="Recent Activity" icon="history">
      {events.length === 0 ? (
        <Empty />
      ) : (
        <div className="relative ml-3 space-y-5 border-l-2 border-surface-container-high">
          {events.map((e, i) => (
            <div key={i} className="relative pl-6">
              <span className={cn("absolute -left-[9px] top-1 h-4 w-4 rounded-full ring-4 ring-white", dot[e.kind])} />
              <p className="text-body-sm text-on-surface">
                {e.kind === "done" ? "Completed" : "Week shifted"}: <span className="font-semibold">{e.task}</span>
                {e.who ? ` · ${e.who}` : ""}
              </p>
              <span className="text-xs text-on-surface-variant">{fmtDate(e.date)}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded", color)} />
      {label}
    </span>
  );
}
function Empty() {
  return <div className="py-8 text-center text-body-sm text-on-surface-variant">Is week ke liye data nahi hai.</div>;
}
