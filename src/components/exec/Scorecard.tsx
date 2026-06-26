import { cn } from "@/lib/utils";
import { doerSummaries, orgTotals } from "@/lib/scoring";
import { SCORE_THRESHOLDS, SYSTEM_LABELS } from "@/lib/config";
import { pctText } from "@/lib/format";

function initials(name: string) {
  return String(name || "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "—";
}

// Dense numeric cell: bold black for Done, red for Late, gray for Pend; empty = faded dot.
function Cell({ value, tone }: { value: number; tone: "done" | "late" | "pend" }) {
  if (!value) return <span className="font-mono text-data-mono text-on-surface-variant/30">·</span>;
  const cls = tone === "late" ? "text-error" : tone === "pend" ? "text-on-surface-variant" : "text-on-surface";
  return <span className={cn("font-mono text-data-mono font-bold", cls)}>{value}</span>;
}

function Stat({ label, value, danger, striped }: { label: string; value: string | number; danger?: boolean; striped?: boolean }) {
  return (
    <div className="glass-card relative flex h-36 flex-col justify-between overflow-hidden p-5">
      <span className={cn("font-label-sm text-label-sm uppercase", danger ? "text-error" : "text-on-surface-variant")}>{label}</span>
      <span className={cn("font-mono text-headline-xl font-extrabold tracking-tighter tabular-nums", danger ? "text-error" : "text-on-surface")}>
        {value}
      </span>
      {striped && (
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, #ba1a1a 0, #ba1a1a 2px, transparent 2px, transparent 10px)" }}
        />
      )}
    </div>
  );
}

function SysHead({ label }: { label: string }) {
  return (
    <th colSpan={3} className="border-l-2 border-on-surface px-2 py-2 text-center font-label-sm text-label-sm font-bold uppercase text-on-surface">
      {label}
    </th>
  );
}
function Sub({ children, divide }: { children: React.ReactNode; divide?: boolean }) {
  return <th className={cn("px-2 py-2 text-center font-label-sm text-label-sm uppercase text-on-surface-variant", divide && "border-l-2 border-on-surface")}>{children}</th>;
}

export function Scorecard({ data }: { data: any }) {
  const totals = orgTotals(data);
  const rows = doerSummaries(data)
    .filter((s) => s.total > 0)
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.done - a.done || a.pending - b.pending);

  return (
    <div className="space-y-6">
      <div className="border-b-2 border-on-surface pb-4">
        <h1 className="font-headline-xl text-headline-xl uppercase tracking-tighter text-on-surface">Performance Scorecard</h1>
        <p className="mt-1 font-mono text-data-mono uppercase text-on-surface-variant">Enterprise resource utilization • Per-contributor metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Overall Score" value={pctText(totals.pct)} />
        <Stat label="Tasks Done" value={totals.done} />
        <Stat label="Late Items" value={totals.late} />
        <Stat label="Red Flags" value={totals.redCount} danger striped />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b-2 border-on-surface bg-surface-container-low p-5">
          <h3 className="font-headline-md text-headline-md uppercase tracking-tight text-on-surface">Contributor Leaderboard</h3>
          <span className="border-2 border-on-surface px-3 py-1 font-label-sm text-label-sm uppercase text-on-surface-variant">{rows.length} doers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-on-surface bg-surface-container">
                <th rowSpan={2} className="w-14 px-2 py-2 text-center font-label-sm text-label-sm font-bold uppercase text-on-surface-variant">Rank</th>
                <th rowSpan={2} className="px-3 py-2 font-label-sm text-label-sm font-bold uppercase text-on-surface">Doer</th>
                <SysHead label={SYSTEM_LABELS.checklist} />
                <SysHead label={SYSTEM_LABELS.delegation} />
                <SysHead label={SYSTEM_LABELS.fms} />
                <th rowSpan={2} className="min-w-[8rem] border-l-2 border-on-surface px-3 py-2 text-right font-label-sm text-label-sm font-bold uppercase text-on-surface">Score</th>
              </tr>
              <tr className="border-b-2 border-on-surface bg-surface-container">
                <Sub divide>Done</Sub><Sub>Late</Sub><Sub>Pend</Sub>
                <Sub divide>Done</Sub><Sub>Late</Sub><Sub>Pend</Sub>
                <Sub divide>Done</Sub><Sub>Late</Sub><Sub>Pend</Sub>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const rank = i + 1;
                const low = r.pct !== null && r.pct < SCORE_THRESHOLDS.WARN;
                return (
                  <tr key={r.doer} className={cn("table-row-hover border-b border-outline-variant")}>
                    <td className="px-2 py-3 text-center">
                      {rank <= 3 ? (
                        <span className={cn("mx-auto grid h-7 w-7 place-items-center font-mono text-data-mono font-extrabold", rank === 1 ? "bg-on-surface text-on-primary" : "border-2 border-on-surface text-on-surface")}>
                          {String(rank).padStart(2, "0")}
                        </span>
                      ) : (
                        <span className="font-mono text-data-mono text-on-surface-variant/60">{String(rank).padStart(2, "0")}</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center border-2 border-on-surface bg-surface-container-lowest font-mono text-data-mono font-bold uppercase text-on-surface">{initials(r.doer)[0]}</span>
                        <div className="leading-tight">
                          <div className="text-body-md font-bold text-on-surface">{r.doer}</div>
                          <div className="font-label-sm text-label-sm uppercase text-on-surface-variant">{r.department || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="border-l-2 border-on-surface px-2 py-3 text-center"><Cell value={r.checklist.done} tone="done" /></td>
                    <td className="px-2 py-3 text-center"><Cell value={r.checklist.late} tone="late" /></td>
                    <td className="px-2 py-3 text-center"><Cell value={r.checklist.pending} tone="pend" /></td>
                    <td className="border-l-2 border-on-surface px-2 py-3 text-center"><Cell value={r.delegation.done} tone="done" /></td>
                    <td className="px-2 py-3 text-center"><Cell value={r.delegation.late} tone="late" /></td>
                    <td className="px-2 py-3 text-center"><Cell value={r.delegation.pending} tone="pend" /></td>
                    <td className="border-l-2 border-on-surface px-2 py-3 text-center"><Cell value={r.fms.done} tone="done" /></td>
                    <td className="px-2 py-3 text-center"><Cell value={r.fms.late} tone="late" /></td>
                    <td className="px-2 py-3 text-center"><Cell value={r.fms.pending} tone="pend" /></td>
                    <td className="border-l-2 border-on-surface px-3 py-3 text-right">
                      <span
                        className={cn(
                          "inline-block px-2 py-1 font-mono text-headline-md font-extrabold tabular-nums",
                          rank === 1 ? "bg-primary-container text-on-primary" : low ? "text-error" : "text-on-surface"
                        )}
                      >
                        {pctText(r.pct)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="border-l-4 border-on-surface px-3 py-1 font-mono text-data-mono uppercase text-on-surface-variant">
        Score = Done % across all systems. Late = completed late / reworked. Rows under 50% flagged red.
      </p>
    </div>
  );
}
