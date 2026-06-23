import * as React from "react";
import { HEADERS, STATUS, ALL } from "@/lib/config";
import { unique, matchesDropdown, matchesSearch } from "@/lib/filters";
import { doerSummaries, isWorkDone, isDelegationDone, isFmsOverdue, isDelegationAtRisk } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { FilterBar, SelectFilter, SearchFilter, StatusBadge, Stack, Sub, EmptyRow } from "@/components/common";
import { fmtDate, pctText, scoreVariant, type ScoreVariant } from "@/lib/format";
import { cn } from "@/lib/utils";

const H = HEADERS;
const TEXT: Record<ScoreVariant, string> = { ok: "text-ok", warn: "text-warn", bad: "text-bad", muted: "text-muted-foreground" };
const activeDoerNames = (data: any) =>
  unique((data.doers || []).filter((d: any) => d[H.Doers.active] !== false).map((d: any) => d[H.Doers.doer]));

function statusMatch(selected: string, done: boolean) {
  if (!selected || selected === ALL) return true;
  return selected === STATUS.PENDING ? !done : done;
}

// Flatten one doer's rows across all three work types into unified items.
function collectDoerItems(data: any, doer: string) {
  const items: any[] = [];
  for (const r of data.fms || []) {
    if (String(r[H.FMS.doer]).trim() !== doer) continue;
    items.push({
      type: "FMS",
      item: `${r[H.FMS.fmsName]} — ${r[H.FMS.step]}`,
      department: r[H.FMS.department],
      planned: r[H.FMS.plannedDate],
      doneOn: r[H.FMS.actualDate],
      status: r[H.FMS.status],
      done: isWorkDone(r),
      atRisk: isFmsOverdue(r),
    });
  }
  for (const r of data.checklist || []) {
    if (String(r[H.Checklist.doer]).trim() !== doer) continue;
    items.push({
      type: "Checklist",
      item: r[H.Checklist.task],
      department: r[H.Checklist.department],
      planned: r[H.Checklist.date],
      doneOn: "",
      status: r[H.Checklist.status],
      done: isWorkDone(r),
      atRisk: false,
    });
  }
  for (const r of data.delegation || []) {
    if (String(r[H.Delegation.doer]).trim() !== doer) continue;
    items.push({
      type: "Delegation",
      item: r[H.Delegation.task],
      department: r[H.Delegation.department],
      planned: r[H.Delegation.plannedDate],
      doneOn: r[H.Delegation.completedDate],
      status: r[H.Delegation.status],
      done: isDelegationDone(r),
      atRisk: isDelegationAtRisk(r),
    });
  }
  return items.sort((a, b) => Number(a.done) - Number(b.done) || String(a.planned).localeCompare(String(b.planned)));
}

function DoerCard({ summary, items, pinned }: { summary: any; items: any[]; pinned: boolean }) {
  const v = scoreVariant(summary.pct);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-white/[0.03] px-5 py-3">
        <Stack>
          <span className="text-base font-semibold">{summary.doer}</span>
          <Sub>{summary.department || "—"}</Sub>
        </Stack>
        <div className="flex flex-col items-end">
          <span className={cn("text-xl font-semibold tabular-nums", TEXT[v])}>{pctText(summary.pct)}</span>
          <Sub>
            {summary.done}/{summary.total} done · {summary.pending} pending
          </Sub>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Planned</TableHead>
            <TableHead>Done On</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <EmptyRow span={6} />
          ) : (
            items.map((it, i) => (
              <TableRow key={i} className={cn(it.atRisk && "bg-bad/[0.06]")}>
                <TableCell>
                  <Badge variant="default" className="text-[0.65rem] font-semibold uppercase tracking-wide">
                    {it.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{it.item}</TableCell>
                <TableCell className="text-muted-foreground">{it.department}</TableCell>
                <TableCell>{fmtDate(it.planned)}</TableCell>
                <TableCell>{fmtDate(it.doneOn)}</TableCell>
                <TableCell>
                  <StatusBadge value={it.status} atRisk={it.atRisk} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

export function AllDoersTab({ data }: { data: any }) {
  const [f, setF] = React.useState({ doer: ALL, status: ALL, search: "" });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  const sections = React.useMemo(() => {
    const summaries = doerSummaries(data).filter((s: any) => matchesDropdown(f.doer, s.doer));
    return summaries
      .map((summary: any) => {
        const items = collectDoerItems(data, summary.doer)
          .filter((it) => statusMatch(f.status, it.done))
          .filter((it) => matchesSearch(f.search, [it.item, it.department]));
        return { summary, items };
      })
      .filter(({ items }) => items.length > 0 || f.doer !== ALL);
  }, [data, f]);

  return (
    <div className="space-y-4">
      <FilterBar>
        <SelectFilter label="Doer" value={f.doer} onChange={(v) => set({ doer: v })} options={activeDoerNames(data)} />
        <SelectFilter label="Show" value={f.status} onChange={(v) => set({ status: v })} options={[STATUS.PENDING, STATUS.DONE]} />
        <SearchFilter value={f.search} onChange={(v) => set({ search: v })} placeholder="Search item…" />
      </FilterBar>
      {sections.length === 0 ? (
        <Card>
          <div className="py-10 text-center text-muted-foreground">No items match the current filters.</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map(({ summary, items }) => (
            <DoerCard key={summary.doer} summary={summary} items={items} pinned={f.doer !== ALL} />
          ))}
        </div>
      )}
    </div>
  );
}
