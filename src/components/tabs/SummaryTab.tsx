import { CheckCircle2, Clock, Timer, AlertOctagon, ListTodo } from "lucide-react";
import { doerSummaries, orgTotals } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ScoreBar, Stack, Sub, SectionHeading, Avatar, NumPill } from "@/components/common";
import { pctText, scoreVariant, type ScoreVariant } from "@/lib/format";
import { SCORE_THRESHOLDS } from "@/lib/config";
import { cn } from "@/lib/utils";

const TEXT: Record<ScoreVariant, string> = { ok: "text-ok", warn: "text-warn", bad: "text-bad", muted: "text-muted-foreground" };
const TINT: Record<ScoreVariant | "neutral", string> = {
  ok: "bg-ok/10 text-ok ring-ok/15",
  warn: "bg-warn/10 text-warn ring-warn/15",
  bad: "bg-bad/10 text-bad ring-bad/15",
  muted: "bg-slate-100 text-slate-500 ring-slate-200",
  neutral: "bg-primary/10 text-primary ring-primary/15",
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

// Grouped system header (spans Done/Late/Pend) with a coloured label.
function SysHead({ label, color }: { label: string; color: string }) {
  return (
    <TableHead colSpan={3} className={cn("border-l border-slate-200/70 text-center", color)}>
      {label}
    </TableHead>
  );
}
function SubHead({ children, divide }: { children: React.ReactNode; divide?: boolean }) {
  return <TableHead className={cn("text-center font-medium normal-case tracking-normal", divide && "border-l border-slate-200/70")}>{children}</TableHead>;
}

export function SummaryTab({ data }: { data: any }) {
  const totals = orgTotals(data);
  const rows = doerSummaries(data).filter((s) => s.total > 0 || s.department);

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Doer Scorecard"
        subtitle="Har doer ki poori scoring — Checklist, Delegation aur FMS, teeno ka Done · Late · Pending alag-alag. Attention waale sabse upar."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Overall" hint="done of all tasks" value={pctText(totals.pct)} variant={scoreVariant(totals.pct)} icon={CheckCircle2} />
        <Stat label="Done" hint="complete ho gaya" value={totals.done} variant="ok" icon={ListTodo} />
        <Stat label="Late" hint="der se / shifted" value={totals.late} variant={totals.late ? "warn" : "ok"} icon={Timer} />
        <Stat label="Pending" hint="abhi baaki hai" value={totals.pending} variant={totals.pending ? "warn" : "ok"} icon={Clock} />
        <Stat label="Red flags" hint="2+ week shifts" value={totals.redCount} variant={totals.redCount ? "bad" : "ok"} icon={AlertOctagon} />
      </div>

      <Card>
        <div className="border-b border-slate-200/70 px-5 py-3">
          <h3 className="font-display text-lg font-bold tracking-tight">All Doers — har system ki scoring</h3>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-ok">Done</span> = ho gaya · <span className="font-medium text-warn">Late</span> = der se/shifted ·{" "}
            <span className="font-medium text-bad">Pend</span> = baaki hai
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead rowSpan={2} className="w-10 text-center">#</TableHead>
              <TableHead rowSpan={2}>Doer</TableHead>
              <SysHead label="Checklist" color="text-primary" />
              <SysHead label="Delegation" color="text-ok" />
              <SysHead label="FMS" color="text-sky-600" />
              <TableHead rowSpan={2} className="min-w-[9rem] border-l border-slate-200/70">Score</TableHead>
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
                <TableCell className="text-center text-xs font-medium tabular-nums text-muted-foreground">{i + 1}</TableCell>
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
                  <ScoreBar pct={r.pct} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Score</span> = sab systems ka Done % (Checklist + Delegation + FMS). FMS abhi connect hone
        par uske columns bhar jayenge.
      </p>
    </div>
  );
}
