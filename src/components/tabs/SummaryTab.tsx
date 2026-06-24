import { doerSummaries, orgTotals } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ScoreBar, Stack, Sub, RagCounts } from "@/components/common";
import { pctText, scoreVariant, type ScoreVariant } from "@/lib/format";
import { SCORE_THRESHOLDS } from "@/lib/config";
import { cn } from "@/lib/utils";

const TEXT: Record<ScoreVariant, string> = { ok: "text-ok", warn: "text-warn", bad: "text-bad", muted: "text-muted-foreground" };

function Stat({ label, value, variant }: { label: string; value: string | number; variant: ScoreVariant | "neutral" }) {
  const color = variant === "neutral" ? "text-foreground" : TEXT[variant];
  return (
    <Card className="animate-fade-in">
      <div className="p-4">
        <div className={cn("text-2xl font-semibold tabular-nums", color)}>{value}</div>
        <div className="mt-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}

function Bucket({ bucket, pct }: { bucket: { total: number; done: number }; pct: number | null }) {
  if (!bucket.total) return <span className="text-muted-foreground">—</span>;
  return (
    <Stack>
      <span className="tabular-nums">
        {bucket.done}/{bucket.total}
      </span>
      <Sub className={TEXT[scoreVariant(pct)]}>{pctText(pct)}</Sub>
    </Stack>
  );
}

export function SummaryTab({ data }: { data: any }) {
  const totals = orgTotals(data);
  const rows = doerSummaries(data).filter((s) => s.total > 0 || s.department);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Overall completion" value={pctText(totals.pct)} variant={scoreVariant(totals.pct)} />
        <Stat label="Total pending" value={totals.pending} variant={totals.pending ? "warn" : "ok"} />
        <Stat label="Checklist done" value={pctText(totals.checklistDonePct)} variant={scoreVariant(totals.checklistDonePct)} />
        <Stat label="Delegation green" value={pctText(totals.delegationGreenPct)} variant={scoreVariant(totals.delegationGreenPct)} />
        <Stat label="Delegation red" value={totals.redCount} variant={totals.redCount ? "bad" : "ok"} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doer</TableHead>
              <TableHead>Checklist</TableHead>
              <TableHead>Delegation</TableHead>
              <TableHead>RAG (G·Y·R)</TableHead>
              <TableHead>Pending</TableHead>
              <TableHead className="min-w-[9rem]">Completion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.doer} className={cn(r.pct !== null && r.pct < SCORE_THRESHOLDS.WARN && "bg-bad/10")}>
                <TableCell>
                  <Stack>
                    <span className="font-medium">{r.doer}</span>
                    <Sub>{r.department || "—"}</Sub>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Bucket bucket={r.checklist} pct={r.checklistPct} />
                </TableCell>
                <TableCell>
                  <Bucket bucket={r.delegation} pct={r.delegationPct} />
                </TableCell>
                <TableCell>
                  {r.delegation.total ? (
                    <RagCounts green={r.delegation.green} yellow={r.delegation.yellow} red={r.delegation.red} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className={cn("tabular-nums font-semibold", r.pending ? "text-warn" : "text-muted-foreground")}>{r.pending}</span>
                </TableCell>
                <TableCell>
                  <ScoreBar pct={r.pct} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <p className="px-1 text-xs text-muted-foreground">
        Completion = Checklist (Done) + Delegation (Completed). RAG shows delegation discipline by revisions — Green 0 · Yellow 1 · Red 2+.
        Doers needing attention are sorted to the top.
      </p>
    </div>
  );
}
