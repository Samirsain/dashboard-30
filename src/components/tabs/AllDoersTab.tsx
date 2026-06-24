import * as React from "react";
import { ALL } from "@/lib/config";
import { unique, matchesDropdown, matchesSearch } from "@/lib/filters";
import { doerSummaries, isChecklistDone, isDelegationDone, delegationColour, delegationRevisions } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { FilterBar, SelectFilter, SearchFilter, StatusBadge, Stack, Sub, EmptyRow } from "@/components/common";
import { fmtDate, pctText, scoreVariant, type ScoreVariant } from "@/lib/format";
import { cn } from "@/lib/utils";

const TEXT: Record<ScoreVariant, string> = { ok: "text-ok", warn: "text-warn", bad: "text-bad", muted: "text-muted-foreground" };
const activeDoerNames = (data: any) => unique((data.doers || []).filter((d: any) => d.active !== false).map((d: any) => d.doer));

// "Show" filter: Pending vs Done (Done = Checklist Done OR Delegation Completed).
function showMatch(selected: string, done: boolean) {
  if (!selected || selected === ALL) return true;
  return selected === "Done" ? done : !done;
}

function collectDoerItems(data: any, doer: string) {
  const items: any[] = [];
  for (const r of data.checklist || []) {
    if (String(r.doer).trim() !== doer) continue;
    items.push({ type: "Checklist", item: r.task, department: r.department, date: r.planned, status: r.status, done: isChecklistDone(r), red: false });
  }
  for (const r of data.delegation || []) {
    if (String(r.doer).trim() !== doer) continue;
    items.push({
      type: "Delegation",
      item: r.task,
      department: r.department,
      date: r.firstDate,
      status: r.status,
      done: isDelegationDone(r),
      revisions: delegationRevisions(r),
      red: delegationColour(r) === "Red",
    });
  }
  return items.sort((a, b) => Number(a.done) - Number(b.done) || String(a.date).localeCompare(String(b.date)));
}

function DoerCard({ summary, items }: { summary: any; items: any[] }) {
  const v = scoreVariant(summary.pct);
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/70 px-5 py-3">
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
            <TableHead>Date</TableHead>
            <TableHead>Revisions</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <EmptyRow span={6} />
          ) : (
            items.map((it, i) => (
              <TableRow key={i} className={cn(it.red && "bg-bad/10")}>
                <TableCell>
                  <Badge variant="default" className="text-[0.65rem] font-semibold uppercase tracking-wide">
                    {it.type}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[24rem] font-medium">{it.item}</TableCell>
                <TableCell className="text-muted-foreground">{it.department}</TableCell>
                <TableCell>{fmtDate(it.date)}</TableCell>
                <TableCell className="tabular-nums">
                  {it.type === "Delegation" ? (
                    <span className={it.revisions >= 2 ? "text-bad" : it.revisions === 1 ? "text-warn" : "text-ok"}>{it.revisions}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge value={it.status} />
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
  const [f, setF] = React.useState({ doer: ALL, show: ALL, search: "" });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  const sections = React.useMemo(() => {
    const summaries = doerSummaries(data).filter((s: any) => matchesDropdown(f.doer, s.doer));
    return summaries
      .map((summary: any) => {
        const items = collectDoerItems(data, summary.doer)
          .filter((it) => showMatch(f.show, it.done))
          .filter((it) => matchesSearch(f.search, [it.item, it.department]));
        return { summary, items };
      })
      .filter(({ items }) => items.length > 0 || f.doer !== ALL);
  }, [data, f]);

  return (
    <div className="space-y-4">
      <FilterBar>
        <SelectFilter label="Doer" value={f.doer} onChange={(v) => set({ doer: v })} options={activeDoerNames(data)} />
        <SelectFilter label="Show" value={f.show} onChange={(v) => set({ show: v })} options={["Pending", "Done"]} />
        <SearchFilter value={f.search} onChange={(v) => set({ search: v })} placeholder="Search item…" />
      </FilterBar>
      {sections.length === 0 ? (
        <Card>
          <div className="py-10 text-center text-muted-foreground">No items match the current filters.</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map(({ summary, items }) => (
            <DoerCard key={summary.doer} summary={summary} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}
