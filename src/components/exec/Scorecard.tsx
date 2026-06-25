import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import { doerSummaries, orgTotals } from "@/lib/scoring";
import { SCORE_THRESHOLDS, SYSTEM_LABELS } from "@/lib/config";
import { pctText, scoreVariant, type ScoreVariant } from "@/lib/format";

const AVATAR = ["bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-purple-100 text-purple-700", "bg-teal-100 text-teal-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function initials(name: string) {
  return String(name || "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "—";
}

const SCORE_TEXT: Record<ScoreVariant, string> = { ok: "text-success", warn: "text-warning", bad: "text-danger", muted: "text-on-surface-variant" };

function Pill({ value, tone }: { value: number; tone: "ok" | "warn" | "bad" }) {
  const empty = !value;
  const cls = empty ? "bg-surface-container text-on-surface-variant/40" : { ok: "bg-green-100 text-success", warn: "bg-amber-100 text-warning", bad: "bg-red-100 text-danger" }[tone];
  return <span className={cn("inline-block min-w-[1.9rem] rounded-md px-1.5 py-0.5 text-center text-label-md font-bold tabular-nums", cls)}>{empty ? "·" : value}</span>;
}

function Stat({ label, value, icon, tint }: { label: string; value: string | number; icon: string; tint: string }) {
  return (
    <div className="glass-card glass-card-hover p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-label-md uppercase tracking-wider text-on-surface-variant">{label}</p>
          <h3 className="text-headline-lg font-bold tabular-nums text-on-surface">{value}</h3>
        </div>
        <span className={cn("grid h-10 w-10 place-items-center rounded-full", tint)}>
          <Icon name={icon} className="text-[20px]" />
        </span>
      </div>
    </div>
  );
}

function Rank({ rank }: { rank: number }) {
  const medal =
    rank === 1 ? "bg-amber-100 text-amber-700" : rank === 2 ? "bg-slate-200 text-slate-600" : rank === 3 ? "bg-orange-100 text-orange-700" : "";
  if (rank <= 3) return <span className={cn("mx-auto grid h-6 w-6 place-items-center rounded-full text-label-sm font-bold tabular-nums", medal)}>{rank}</span>;
  return <span className="block text-center text-label-sm tabular-nums text-on-surface-variant">{rank}</span>;
}

function SysHead({ label, color }: { label: string; color: string }) {
  return (
    <th colSpan={3} className={cn("border-l border-border px-2 py-2 text-center text-label-md font-bold uppercase tracking-wider", color)}>
      {label}
    </th>
  );
}
function Sub({ children, divide }: { children: React.ReactNode; divide?: boolean }) {
  return <th className={cn("px-2 py-2 text-center text-label-sm font-semibold text-on-surface-variant", divide && "border-l border-border")}>{children}</th>;
}

export function Scorecard({ data }: { data: any }) {
  const totals = orgTotals(data);
  const rows = doerSummaries(data)
    .filter((s) => s.total > 0)
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.done - a.done || a.pending - b.pending);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-lg font-bold text-on-surface">Performance Scorecard</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">Har doer ki poori scoring — Checklist, Task List aur Workflow. Top performer sabse upar.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Overall" value={pctText(totals.pct)} icon="speed" tint="bg-primary-fixed text-primary" />
        <Stat label="Done" value={totals.done} icon="check_circle" tint="bg-green-100 text-success" />
        <Stat label="Late" value={totals.late} icon="schedule" tint="bg-amber-100 text-warning" />
        <Stat label="Pending" value={totals.pending} icon="pending_actions" tint="bg-amber-100 text-warning" />
        <Stat label="Red flags" value={totals.redCount} icon="flag" tint="bg-red-100 text-danger" />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h3 className="text-headline-sm font-semibold text-on-surface">Doer Leaderboard</h3>
            <p className="text-label-sm text-on-surface-variant">
              <span className="font-medium text-success">Done</span> · <span className="font-medium text-warning">Late/Shift</span> ·{" "}
              <span className="font-medium text-danger">Pend</span>
            </p>
          </div>
          <span className="rounded-full bg-surface-container px-3 py-1 text-label-sm font-medium text-on-surface-variant">{rows.length} doers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-container-low/70">
                <th rowSpan={2} className="w-12 px-2 py-2 text-center text-label-md font-bold uppercase tracking-wider text-on-surface-variant">Rank</th>
                <th rowSpan={2} className="px-3 py-2 text-label-md font-bold uppercase tracking-wider text-on-surface-variant">Doer</th>
                <SysHead label={SYSTEM_LABELS.checklist} color="text-primary" />
                <SysHead label={SYSTEM_LABELS.delegation} color="text-success" />
                <SysHead label={SYSTEM_LABELS.fms} color="text-status-progress" />
                <th rowSpan={2} className="min-w-[8.5rem] border-l border-border px-3 py-2 text-center text-label-md font-bold uppercase tracking-wider text-on-surface-variant">Score</th>
              </tr>
              <tr className="border-b border-border bg-surface-container-low/70">
                <Sub divide>Done</Sub><Sub>Late</Sub><Sub>Pend</Sub>
                <Sub divide>Done</Sub><Sub>Shift</Sub><Sub>Pend</Sub>
                <Sub divide>Done</Sub><Sub>Late</Sub><Sub>Pend</Sub>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={r.doer} className={cn("table-row-hover", r.pct !== null && r.pct < SCORE_THRESHOLDS.WARN && "bg-red-50/40")}>
                  <td className="px-2 py-2.5"><Rank rank={i + 1} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-label-sm font-bold", AVATAR[hash(r.doer) % AVATAR.length])}>{initials(r.doer)}</span>
                      <div className="leading-tight">
                        <div className="text-body-sm font-semibold text-on-surface">{r.doer}</div>
                        <div className="text-label-sm text-on-surface-variant">{r.department || "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="border-l border-border px-2 py-2.5 text-center"><Pill value={r.checklist.done} tone="ok" /></td>
                  <td className="px-2 py-2.5 text-center"><Pill value={r.checklist.late} tone="warn" /></td>
                  <td className="px-2 py-2.5 text-center"><Pill value={r.checklist.pending} tone="bad" /></td>
                  <td className="border-l border-border px-2 py-2.5 text-center"><Pill value={r.delegation.done} tone="ok" /></td>
                  <td className="px-2 py-2.5 text-center"><Pill value={r.delegation.late} tone="warn" /></td>
                  <td className="px-2 py-2.5 text-center"><Pill value={r.delegation.pending} tone="bad" /></td>
                  <td className="border-l border-border px-2 py-2.5 text-center"><Pill value={r.fms.done} tone="ok" /></td>
                  <td className="px-2 py-2.5 text-center"><Pill value={r.fms.late} tone="warn" /></td>
                  <td className="px-2 py-2.5 text-center"><Pill value={r.fms.pending} tone="bad" /></td>
                  <td className="border-l border-border px-3 py-2.5">
                    <div className="flex items-center justify-end gap-2.5">
                      <span className={cn("text-headline-sm font-bold tabular-nums", SCORE_TEXT[scoreVariant(r.pct)])}>{pctText(r.pct)}</span>
                      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className={cn("h-full rounded-full", scoreVariant(r.pct) === "ok" ? "bg-success" : scoreVariant(r.pct) === "warn" ? "bg-warning" : "bg-danger")}
                          style={{ width: `${r.pct ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="px-1 text-label-sm text-on-surface-variant">
        Score = sab systems ka Done % (Checklist + Task List + Workflow). Late = ho gaya par der se / week-shifted. 50% se neeche rows highlight.
      </p>
    </div>
  );
}
