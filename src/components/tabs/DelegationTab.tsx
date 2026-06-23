import * as React from "react";
import { HEADERS, STATUS, ALL } from "@/lib/config";
import { unique, matchesDropdown, matchesSearch, inDateRange } from "@/lib/filters";
import { isDelegationAtRisk } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  FilterBar,
  SelectFilter,
  SearchFilter,
  DateRangeFilter,
  ResultCount,
  StatusBadge,
  MetaTag,
  EmptyRow,
} from "@/components/common";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const H = HEADERS;
const activeDoerNames = (data: any) =>
  unique((data.doers || []).filter((d: any) => d[H.Doers.active] !== false).map((d: any) => d[H.Doers.doer]));

function statusMatch(selected: string, value: string) {
  if (!selected || selected === ALL) return true;
  const v = String(value ?? "").trim() || STATUS.PENDING;
  return selected === STATUS.PENDING ? v === STATUS.PENDING : v === STATUS.COMPLETED;
}

const PRIO: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
function delegationSort(a: any, b: any) {
  const ra = isDelegationAtRisk(a) ? 0 : 1;
  const rb = isDelegationAtRisk(b) ? 0 : 1;
  if (ra !== rb) return ra - rb;
  const pa = PRIO[a[H.Delegation.priority]] ?? 3;
  const pb = PRIO[b[H.Delegation.priority]] ?? 3;
  if (pa !== pb) return pa - pb;
  return String(a[H.Delegation.plannedDate]).localeCompare(String(b[H.Delegation.plannedDate]));
}

export function DelegationTab({ data }: { data: any }) {
  const all: any[] = data.delegation || [];
  const [f, setF] = React.useState({ doer: ALL, status: ALL, priority: ALL, urgency: ALL, from: "", to: "", search: "" });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  const rows = React.useMemo(
    () =>
      all
        .filter((r) => matchesDropdown(f.doer, r[H.Delegation.doer]))
        .filter((r) => statusMatch(f.status, r[H.Delegation.status]))
        .filter((r) => matchesDropdown(f.priority, r[H.Delegation.priority]))
        .filter((r) => matchesDropdown(f.urgency, r[H.Delegation.urgency]))
        .filter((r) => inDateRange(r[H.Delegation.plannedDate], f.from, f.to))
        .filter((r) => matchesSearch(f.search, [r[H.Delegation.task], r[H.Delegation.doer], r[H.Delegation.givenBy]]))
        .sort(delegationSort),
    [all, f]
  );

  return (
    <div className="space-y-4">
      <FilterBar>
        <SelectFilter label="Doer" value={f.doer} onChange={(v) => set({ doer: v })} options={activeDoerNames(data)} />
        <SelectFilter label="Status" value={f.status} onChange={(v) => set({ status: v })} options={[STATUS.COMPLETED, STATUS.PENDING]} />
        <SelectFilter label="Priority" value={f.priority} onChange={(v) => set({ priority: v })} options={["High", "Medium", "Low"]} />
        <SelectFilter label="Urgency" value={f.urgency} onChange={(v) => set({ urgency: v })} options={["Urgent", "Normal"]} />
        <DateRangeFilter from={f.from} to={f.to} onChange={(w, v) => set({ [w]: v })} />
        <SearchFilter value={f.search} onChange={(v) => set({ search: v })} placeholder="Search task…" />
      </FilterBar>
      <ResultCount shown={rows.length} total={all.length} />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Doer</TableHead>
              <TableHead>Given By</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Planned</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow span={8} />
            ) : (
              rows.map((r, i) => (
                <TableRow key={i} className={cn(isDelegationAtRisk(r) && "bg-bad/10")}>
                  <TableCell className="font-medium">{r[H.Delegation.task]}</TableCell>
                  <TableCell>{r[H.Delegation.doer]}</TableCell>
                  <TableCell className="text-muted-foreground">{r[H.Delegation.givenBy]}</TableCell>
                  <TableCell>
                    <MetaTag value={r[H.Delegation.priority]} />
                  </TableCell>
                  <TableCell>
                    <MetaTag value={r[H.Delegation.urgency]} />
                  </TableCell>
                  <TableCell>{fmtDate(r[H.Delegation.plannedDate])}</TableCell>
                  <TableCell>{fmtDate(r[H.Delegation.completedDate])}</TableCell>
                  <TableCell>
                    <StatusBadge value={r[H.Delegation.status]} atRisk={isDelegationAtRisk(r)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
