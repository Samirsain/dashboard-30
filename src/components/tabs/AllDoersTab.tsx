import * as React from "react";
import { ALL } from "@/lib/config";
import { unique, matchesDropdown, matchesSearch } from "@/lib/filters";
import { doerSummaries, isChecklistDone, isDelegationDone, delegationColour, delegationShifts } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { FilterBar, SelectFilter, SearchFilter, StatusBadge, ShiftTag, Stack, Sub, EmptyRow, SectionHeading, Avatar } from "@/components/common";
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
    items.push({ type: "Checklist", isDeleg: false, item: r.task, department: r.department, date: r.planned, status: r.status, done: isChecklistDone(r), red: false });
  }
  for (const r of data.delegation || []) {
    if (String(r.doer).trim() !== doer) continue;
    items.push({
      type: "Task List",
      isDeleg: true,
      item: r.task,
      department: r.department,
      date: r.firstDate,
      status: r.status,
      done: isDelegationDone(r),
      shifts: delegationShifts(r),
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
        <div className="flex items-center gap-3">
          <Avatar name={summary.doer} className="h-9 w-9 text-xs" />
          <Stack>
            <span className="text-base font-semibold">{summary.doer}</span>
            <Sub>{summary.department || "—"}</Sub>
          </Stack>
        </div>
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
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <EmptyRow span={5} />
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
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge value={it.status} />
                    {it.isDeleg && <ShiftTag shifts={it.shifts} />}
                  </div>
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
      <SectionHeading
        title="All Doers"
        subtitle="Ek doer ka poora kaam ek jagah — Checklist aur Delegation dono, pending sabse upar."
      />
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
