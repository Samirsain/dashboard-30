import { CheckCircle2, Clock, Timer, AlertOctagon, ListTodo } from "lucide-react";
import { doerSummaries, orgTotals } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ScoreBar, Stack, Sub, SectionHeading, Avatar, NumPill } from "@/components/common";
import { pctText, scoreVariant, type ScoreVariant } from "@/lib/format";
import { SCORE_THRESHOLDS, SYSTEM_LABELS } from "@/lib/config";
import { cn } from "@/lib/utils";

const TEXT: Record<ScoreVariant, string> = { ok: "text-ok", warn: "text-warn", bad: "text-bad", muted: "text-muted-foreground" };
const TINT: Record<ScoreVariant | "neutral", string> = {
  ok: "bg-ok/10 text-ok ring-ok/15",
  warn: "bg-warn/10 text-warn ring-warn/15",
  bad: "bg-bad/10 text-bad ring-bad/15",
  muted: "bg-slate-100 text-slate-500 ring-slate-200",
  neutral: "bg-primary/10 text-primary ring-primary/15",
};

// Per-system colour identity (header tint + label colour).
const SYS = {
  checklist: { label: SYSTEM_LABELS.checklist, head: "bg-primary/[0.07] text-primary" },
  delegation: { label: SYSTEM_LABELS.delegation, head: "bg-ok/[0.08] text-ok" },
  fms: { label: SYSTEM_LABELS.fms, head: "bg-sky-500/[0.08] text-sky-600" },
};

function Stat({
  label,
  hint,
  value,
  variant,
  icon: Icon,
}: {
  label: string;
  hint: string;
  value: string | number;
  variant: ScoreVariant | "neutral";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const color = variant === "neutral" ? "text-foreground" : TEXT[variant];
  return (
    <Card className="animate-fade-in">
      <div className="flex items-start justify-between gap-2 p-4">
        <div>
          <div className={cn("font-display text-3xl font-bold leading-none tabular-nums", color)}>{value}</div>
          <div className="mt-2 text-sm font-medium text-foreground">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset", TINT[variant])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}

// Leaderboard rank — medal tint for the top three.
function RankBadge({ rank }: { rank: number }) {
  const medal =
    rank === 1
      ? "bg-amber-100 text-amber-700 ring-amber-200"
      : rank === 2
      ? "bg-slate-200 text-slate-600 ring-slate-300"
      : rank === 3
      ? "bg-orange-100 text-orange-700 ring-orange-200"
      : "";
  if (rank <= 3)
    return (
      <span className={cn("mx-auto grid h-6 w-6 place-items-center rounded-full text-xs font-bold tabular-nums ring-1 ring-inset", medal)}>
        {rank}
      </span>
    );
  return <span className="block text-center text-xs font-medium tabular-nums text-muted-foreground">{rank}</span>;
}

// One system's three columns: Done · Late · Pending.
function SysCells({ bucket, lateLabel }: { bucket: { done: number; late: number; pending: number }; lateLabel?: string }) {
  return (
    <>
      <TableCell className="border-l border-slate-200/70 text-center" title="Done">
        <NumPill value={bucket.done} tone="ok" />
      </TableCell>
      <TableCell className="text-center" title={lateLabel || "Late"}>
        <NumPill value={bucket.late} tone="warn" />
      </TableCell>
      <TableCell className="text-center" title="Pending">
        <NumPill value={bucket.pending} tone="bad" />
      </TableCell>
    </>
  );
}

function SubHead({ children, divide }: { children: React.ReactNode; divide?: boolean }) {
  return (
    <TableHead className={cn("text-center text-[0.65rem] font-semibold normal-case tracking-normal", divide && "border-l border-slate-200/70")}>
      {children}
    </TableHead>
  );
}

export function SummaryTab({ data }: { data: any }) {
  const totals = orgTotals(data);
  // Professional leaderboard: best score first; only doers with tasks this week.
  const rows = doerSummaries(data)
    .filter((s) => s.total > 0)
    .sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.done - a.done || a.pending - b.pending);

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Performance Scorecard"
        subtitle="Har doer ki poori scoring — Checklist, Task List aur Workflow, teeno ka Done · Late · Pending. Top performer sabse upar."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Overall" hint="done of all tasks" value={pctText(totals.pct)} variant={scoreVariant(totals.pct)} icon={CheckCircle2} />
        <Stat label="Done" hint="complete ho gaya" value={totals.done} variant="ok" icon={ListTodo} />
        <Stat label="Late" hint="der se / shifted" value={totals.late} variant={totals.late ? "warn" : "ok"} icon={Timer} />
        <Stat label="Pending" hint="abhi baaki hai" value={totals.pending} variant={totals.pending ? "warn" : "ok"} icon={Clock} />
        <Stat label="Red flags" hint="2+ week shifts" value={totals.redCount} variant={totals.redCount ? "bad" : "ok"} icon={AlertOctagon} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 px-5 py-3.5">
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight">Doer Leaderboard</h3>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-ok">Done</span> = ho gaya ·{" "}
              <span className="font-medium text-warn">Late</span> = der se / week-shifted ·{" "}
              <span className="font-medium text-bad">Pend</span> = baaki hai
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-muted-foreground">{rows.length} doers</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead rowSpan={2} className="w-12 text-center">Rank</TableHead>
              <TableHead rowSpan={2}>Doer</TableHead>
              <TableHead colSpan={3} className={cn("border-l border-slate-200/70 text-center", SYS.checklist.head)}>
                {SYS.checklist.label}
              </TableHead>
              <TableHead colSpan={3} className={cn("border-l border-slate-200/70 text-center", SYS.delegation.head)}>
                {SYS.delegation.label}
              </TableHead>
              <TableHead colSpan={3} className={cn("border-l border-slate-200/70 text-center", SYS.fms.head)}>
                {SYS.fms.label}
              </TableHead>
              <TableHead rowSpan={2} className="min-w-[9.5rem] border-l border-slate-200/70 text-center">Score</TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent">
              <SubHead divide>Done</SubHead>
              <SubHead>Late</SubHead>
              <SubHead>Pend</SubHead>
              <SubHead divide>Done</SubHead>
              <SubHead>Shift</SubHead>
              <SubHead>Pend</SubHead>
              <SubHead divide>Done</SubHead>
              <SubHead>Late</SubHead>
              <SubHead>Pend</SubHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.doer} className={cn(r.pct !== null && r.pct < SCORE_THRESHOLDS.WARN && "bg-bad/[0.05]")}>
                <TableCell className="text-center">
                  <RankBadge rank={i + 1} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.doer} />
                    <Stack>
                      <span className="font-semibold leading-tight">{r.doer}</span>
                      <Sub>{r.department || "—"}</Sub>
                    </Stack>
                  </div>
                </TableCell>
                <SysCells bucket={r.checklist} />
                <SysCells bucket={r.delegation} lateLabel="Week shifted" />
                <SysCells bucket={r.fms} />
                <TableCell className="border-l border-slate-200/70">
                  <div className="flex items-center justify-end gap-2.5">
                    <span className={cn("font-display text-lg font-bold tabular-nums", TEXT[scoreVariant(r.pct)])}>{pctText(r.pct)}</span>
                    <div className="w-16">
                      <ScoreBar pct={r.pct} hideLabel />
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Score</span> = sab systems ka Done % (Checklist + Task List + Workflow). Workflow connect
        hone par uske columns bhar jayenge. Score 50% se neeche waale rows halki red me highlight hoti hain.
      </p>
    </div>
  );
}
