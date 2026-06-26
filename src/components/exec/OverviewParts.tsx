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
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
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

// ---- SVG donut helpers -----------------------------------------------------
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number) {
  const gap = 0.8; // degrees gap between segments
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

// ---- Status donut (the pie chart) ------------------------------------------
export function StatusDonut({ data, className }: { data: any; className?: string }) {
  const { segments, total } = statusBreakdown(data);
  const [hovered, setHovered] = React.useState<string | null>(null);

  const active = hovered ? segments.find((s) => s.key === hovered) : null;

  // Build SVG arcs
  const CX = 80, CY = 80, OR = 72, IR = 48;
  let acc = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const startDeg = (acc / (total || 1)) * 360;
      acc += s.value;
      const endDeg = (acc / (total || 1)) * 360;
      return { ...s, startDeg, endDeg, path: arcPath(CX, CY, OR, IR, startDeg, endDeg) };
    });

  return (
    <Panel title="Task Status" icon="donut_large" className={className}>
      <div className="flex flex-col items-center gap-7 sm:flex-row sm:justify-around">
        <div className="relative shrink-0">
          <svg width="160" height="160" viewBox="0 0 160 160" style={{ overflow: "visible" }}>
            {total === 0 ? (
              <circle cx={CX} cy={CY} r={OR} fill="#e0e3e5" />
            ) : (
              arcs.map((arc) => (
                <path
                  key={arc.key}
                  d={arc.path}
                  fill={arc.color}
                  opacity={hovered && hovered !== arc.key ? 0.35 : 1}
                  style={{ cursor: "pointer", transition: "opacity 0.15s" }}
                  onMouseEnter={() => setHovered(arc.key)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))
            )}
            {/* center hole */}
            <circle cx={CX} cy={CY} r={IR} className="fill-surface-container-lowest" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.1))" }} />
            {/* center label */}
            {active ? (
              <>
                <text x={CX} y={CY - 10} textAnchor="middle" className="fill-on-surface" style={{ fontSize: 22, fontWeight: 700, fontFamily: "inherit" }}>
                  {active.pct}%
                </text>
                <text x={CX} y={CY + 9} textAnchor="middle" className="fill-on-surface-variant" style={{ fontSize: 10, fontFamily: "inherit" }}>
                  {active.value} tasks
                </text>
                <text x={CX} y={CY + 22} textAnchor="middle" style={{ fontSize: 9, fill: active.color, fontFamily: "inherit", fontWeight: 600 }}>
                  {active.key}
                </text>
              </>
            ) : (
              <>
                <text x={CX} y={CY - 4} textAnchor="middle" className="fill-on-surface" style={{ fontSize: 26, fontWeight: 700, fontFamily: "inherit" }}>
                  {total}
                </text>
                <text x={CX} y={CY + 14} textAnchor="middle" className="fill-on-surface-variant" style={{ fontSize: 11, fontFamily: "inherit" }}>
                  Tasks
                </text>
              </>
            )}
          </svg>
        </div>
        <div className="w-full space-y-2.5 sm:w-auto">
          {segments.map((s) => (
            <div
              key={s.key}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1 transition-colors"
              style={{ background: hovered === s.key ? `${s.color}18` : "transparent" }}
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="w-28 text-body-sm text-on-surface">{s.key}</span>
              <span className="ml-auto w-9 text-right text-label-md font-bold tabular-nums text-on-surface">{s.value}</span>
              <span className="w-10 text-right text-label-sm text-on-surface-variant">{s.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ---- Department performance (horizontal completion bars) -------------------
export function DeptPerformance({ data, className }: { data: any; className?: string }) {
  const rows = departmentPerformance(data);
  return (
    <Panel title="Department Performance" icon="bar_chart" className={className}>
      {rows.length === 0 ? (
        <div className="py-8 text-center text-body-sm text-on-surface-variant">Is week ke liye data nahi hai.</div>
      ) : (
        <div className="space-y-3.5">
          {rows.map((r) => {
            const tone = r.pct >= 80 ? "bg-success" : r.pct >= 50 ? "bg-primary" : "bg-warning";
            return (
              <div key={r.department}>
                <div className="mb-1 flex items-center justify-between text-body-sm">
                  <span className="font-medium text-on-surface">{r.department}</span>
                  <span className="text-on-surface-variant">
                    <span className="font-semibold text-on-surface">{r.done}</span>/{r.total} · {r.pct}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
