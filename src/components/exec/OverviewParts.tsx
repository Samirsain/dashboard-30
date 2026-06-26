import * as React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import { kpis, statusBreakdown, departmentPerformance } from "@/lib/analytics";

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
    <section className={cn("glass-card flex flex-col", className)}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 border-b-2 border-on-surface bg-surface-container-low px-5 py-3">
          <h3 className="flex items-center gap-2 font-headline-md text-headline-md uppercase tracking-tight text-on-surface">
            {icon && <Icon name={icon} className="text-[20px]" />}
            {title}
          </h3>
          {right}
        </div>
      )}
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

// ---- Hero metric — full-width black banner ---------------------------------
export function HeroMetric({ data }: { data: any }) {
  const k = kpis(data);
  return (
    <div className="relative overflow-hidden border-2 border-on-surface bg-on-surface p-6 sm:p-8">
      <span className="font-label-sm text-label-sm uppercase tracking-[0.2em] text-surface-variant">System Status</span>
      <h2 className="mt-3 font-mono text-[clamp(34px,6vw,52px)] font-extrabold leading-none tracking-tighter text-surface-container-lowest">
        {k.pct}% <span className="font-sans font-bold">Overall Completion</span>
      </h2>
      <div className="mt-5 h-2 w-full max-w-xl border border-surface-variant/40">
        <div className="h-full bg-surface-container-lowest" style={{ width: `${k.pct}%` }} />
      </div>
    </div>
  );
}

// ---- KPI cards — bordered Swiss tiles ---------------------------------------
export function KpiCards({ data }: { data: any }) {
  const k = kpis(data);
  const cards = [
    { label: "Total Tasks", value: k.total, tone: "text-on-surface" },
    { label: "Completed", value: k.done, tone: "text-on-surface" },
    { label: "Late", value: k.late, tone: "text-error" },
    { label: "Pending", value: k.pending, tone: "text-on-surface-variant" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="glass-card glass-card-hover flex flex-col justify-between p-4">
          <span className="mb-4 border-b-2 border-on-surface pb-2 font-label-sm text-label-sm uppercase text-on-surface-variant">
            {c.label}
          </span>
          <div className={cn("font-mono text-4xl font-bold tabular-nums", c.tone)}>{String(c.value).padStart(2, "0")}</div>
        </div>
      ))}
    </div>
  );
}

// ---- SVG donut helpers -----------------------------------------------------
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const gap = 1.2; // degrees gap between segments
  const s = startDeg + (startDeg === 0 ? 0 : gap / 2);
  const e = endDeg - gap / 2;
  const large = e - s > 180 ? 1 : 0;
  const o1 = polarToCartesian(cx, cy, outerR, s);
  const o2 = polarToCartesian(cx, cy, outerR, e);
  const i1 = polarToCartesian(cx, cy, innerR, s);
  const i2 = polarToCartesian(cx, cy, innerR, e);
  return [
    `M ${o1.x.toFixed(3)} ${o1.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(3)} ${o2.y.toFixed(3)}`,
    `L ${i2.x.toFixed(3)} ${i2.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i1.x.toFixed(3)} ${i1.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

// ---- Status donut (warm beige/espresso) ------------------------------------
export function StatusDonut({ data, className }: { data: any; className?: string }) {
  const { segments, total } = statusBreakdown(data);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const active = hovered ? segments.find((s) => s.key === hovered) : null;

  const CX = 80, CY = 80, OR = 74, IR = 50;
  let acc = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const startDeg = (acc / (total || 1)) * 360;
      acc += s.value;
      const endDeg = (acc / (total || 1)) * 360;
      return { ...s, path: arcPath(CX, CY, OR, IR, startDeg, endDeg) };
    });

  return (
    <Panel title="Task Status" icon="donut_large" className={className}>
      <div className="flex flex-col items-center gap-5 xl:flex-row xl:items-center xl:gap-6">
        <div className="relative shrink-0">
          <svg width="150" height="150" viewBox="0 0 160 160">
            {total === 0 ? (
              <circle cx={CX} cy={CY} r={OR} fill="#d8cdb6" stroke="#281c15" strokeWidth={2} />
            ) : (
              arcs.map((arc) => (
                <path
                  key={arc.key}
                  d={arc.path}
                  fill={arc.color}
                  stroke="#281c15"
                  strokeWidth={1.5}
                  opacity={hovered && hovered !== arc.key ? 0.3 : 1}
                  style={{ cursor: "pointer", transition: "opacity 0.12s" }}
                  onMouseEnter={() => setHovered(arc.key)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))
            )}
            <circle cx={CX} cy={CY} r={IR} fill="#fbf8f1" stroke="#281c15" strokeWidth={2} />
            {active ? (
              <>
                <text x={CX} y={CY - 8} textAnchor="middle" style={{ fontSize: 26, fontWeight: 800, fontFamily: "JetBrains Mono", fill: "#281c15" }}>
                  {active.pct}%
                </text>
                <text x={CX} y={CY + 10} textAnchor="middle" style={{ fontSize: 11, fontFamily: "JetBrains Mono", fill: "#6b584a" }}>
                  {active.value} TASKS
                </text>
                <text x={CX} y={CY + 24} textAnchor="middle" style={{ fontSize: 9, letterSpacing: "0.08em", fill: "#281c15", fontWeight: 700 }}>
                  {active.key.toUpperCase()}
                </text>
              </>
            ) : (
              <>
                <text x={CX} y={CY - 2} textAnchor="middle" style={{ fontSize: 30, fontWeight: 800, fontFamily: "JetBrains Mono", fill: "#281c15" }}>
                  {total}
                </text>
                <text x={CX} y={CY + 16} textAnchor="middle" style={{ fontSize: 10, letterSpacing: "0.1em", fontFamily: "JetBrains Mono", fill: "#6b584a" }}>
                  TASKS
                </text>
              </>
            )}
          </svg>
        </div>
        <div className="w-full min-w-0 border-t-2 border-on-surface xl:border-t-0">
          {segments.map((s) => (
            <div
              key={s.key}
              className="flex cursor-pointer items-center gap-2.5 border-b border-outline-variant px-1 py-2 transition-colors last:border-0 hover:bg-surface-container-low"
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="h-3 w-3 shrink-0 border border-on-surface" style={{ backgroundColor: s.color }} />
              <span className="min-w-0 flex-1 truncate font-label-sm text-label-sm uppercase text-on-surface">{s.key}</span>
              <span className="shrink-0 text-right font-mono text-data-mono font-bold text-on-surface">{s.value}</span>
              <span className="w-11 shrink-0 text-right font-mono text-data-mono text-on-surface-variant">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ---- Department performance (Swiss bars) -----------------------------------
export function DeptPerformance({ data, className }: { data: any; className?: string }) {
  const rows = departmentPerformance(data);
  return (
    <Panel title="Department Performance" icon="bar_chart" right={<span className="font-label-sm text-label-sm uppercase text-on-surface-variant">By Completion %</span>} className={className}>
      {rows.length === 0 ? (
        <div className="py-8 text-center font-mono text-data-mono uppercase text-on-surface-variant">No data for this week.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => (
            <div key={r.department} className="flex items-center gap-4">
              <span className="w-28 shrink-0 truncate font-mono text-data-mono uppercase text-on-surface" title={r.department}>
                {r.department}
              </span>
              <div className="relative h-4 flex-1 border-2 border-on-surface bg-surface-container">
                <div className={cn("absolute left-0 top-0 h-full", r.pct < 50 ? "bg-error" : "bg-on-surface")} style={{ width: `${r.pct}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right font-mono text-data-mono text-on-surface-variant">
                {r.done}/{r.total}
              </span>
              <span className="w-10 shrink-0 text-right font-mono text-data-mono font-bold text-on-surface">{r.pct}%</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
