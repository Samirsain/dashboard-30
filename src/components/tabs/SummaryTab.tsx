import { CheckCircle2, Clock, ListChecks, ShieldCheck, AlertOctagon } from "lucide-react";
import { doerSummaries, orgTotals } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ScoreBar, Stack, Sub, RagCounts, SectionHeading, Avatar, NumPill } from "@/components/common";
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

// Grouped sub-header cell (Plan / Done / …) with a light divider on the left.
function GHead({ children, divide }: { children: React.ReactNode; divide?: boolean }) {
  return <TableHead className={cn("text-center", divide && "border-l border-slate-200/70")}>{children}</TableHead>;
}

export function SummaryTab({ data }: { data: any }) {
  const totals = orgTotals(data);
  const rows = doerSummaries(data).filter((s) => s.total > 0 || s.department);

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Team Summary"
        subtitle="Har doer ka overall score — Checklist + Delegation. Kitna plan, kitna done, kitna red. Attention waale sabse upar."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Overall" hint="done of all tasks" value={pctText(totals.pct)} variant={scoreVariant(totals.pct)} icon={CheckCircle2} />
        <Stat label="Pending" hint="abhi baaki hai" value={totals.pending} variant={totals.pending ? "warn" : "ok"} icon={Clock} />
        <Stat label="Checklist" hint="done %" value={pctText(totals.checklistDonePct)} variant={scoreVariant(totals.checklistDonePct)} icon={ListChecks} />
        <Stat label="On-time" hint="delegation green" value={pctText(totals.delegationGreenPct)} variant={scoreVariant(totals.delegationGreenPct)} icon={ShieldCheck} />
        <Stat label="Red flags" hint="2+ revisions" value={totals.redCount} variant={totals.redCount ? "bad" : "ok"} icon={AlertOctagon} />
      </div>

      <Card>
        <div className="border-b border-slate-200/70 px-5 py-3">
          <h3 className="font-display text-lg font-bold tracking-tight">All Doers — Checklist + Delegation</h3>
          <p className="text-xs text-muted-foreground">Plan = total tasks · Done = complete · Pend/Red = needs attention</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead rowSpan={2} className="w-10 text-center">#</TableHead>
              <TableHead rowSpan={2}>Doer</TableHead>
              <TableHead colSpan={3} className="border-l border-slate-200/70 text-center text-primary">Checklist</TableHead>
              <TableHead colSpan={3} className="border-l border-slate-200/70 text-center text-ok">Delegation</TableHead>
              <TableHead rowSpan={2} className="border-l border-slate-200/70 text-center">RAG</TableHead>
              <TableHead rowSpan={2} className="min-w-[9rem] border-l border-slate-200/70">Progress</TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent">
              <GHead divide>Plan</GHead>
              <GHead>Done</GHead>
              <GHead>Pend</GHead>
              <GHead divide>Plan</GHead>
              <GHead>Done</GHead>
              <GHead>Red</GHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => {
              const cPend = r.checklist.total - r.checklist.done;
              const dPend = r.delegation.total - r.delegation.done;
              return (
                <TableRow key={r.doer} className={cn(r.pct !== null && r.pct < SCORE_THRESHOLDS.WARN && "bg-bad/[0.05]")}>
                  <TableCell className="text-center text-xs font-medium text-muted-foreground tabular-nums">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.doer} />
                      <Stack>
                        <span className="font-semibold leading-tight">{r.doer}</span>
                        <Sub>{r.department || "—"}</Sub>
                      </Stack>
                    </div>
                  </TableCell>
                  <TableCell className="border-l border-slate-200/70 text-center"><NumPill value={r.checklist.total} tone="info" /></TableCell>
                  <TableCell className="text-center"><NumPill value={r.checklist.done} tone="ok" /></TableCell>
                  <TableCell className="text-center"><NumPill value={cPend} tone="bad" /></TableCell>
                  <TableCell className="border-l border-slate-200/70 text-center"><NumPill value={r.delegation.total} tone="info" /></TableCell>
                  <TableCell className="text-center"><NumPill value={r.delegation.done} tone="ok" /></TableCell>
                  <TableCell className="text-center"><NumPill value={r.delegation.red} tone="bad" /></TableCell>
                  <TableCell className="border-l border-slate-200/70">
                    {r.delegation.total ? (
                      <RagCounts green={r.delegation.green} yellow={r.delegation.yellow} red={r.delegation.red} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="border-l border-slate-200/70">
                    <ScoreBar pct={r.pct} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Progress</span> = Checklist (Done) + Delegation (Completed).{" "}
        <span className="font-medium text-foreground">RAG</span> = delegation discipline by revisions — Green 0 · Yellow 1 · Red 2+.
      </p>
    </div>
  );
}
