import * as React from "react";
import { STATUS, COLOUR, ALL } from "@/lib/config";
import { unique, matchesDropdown, matchesSearch, inDateRange } from "@/lib/filters";
import { delegationColour, delegationRevisions, delegationShifts, wasShifted } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  FilterBar,
  SelectFilter,
  SearchFilter,
  DateRangeFilter,
  ResultCount,
  StatusBadge,
  RagBadge,
  MetaTag,
  EmptyRow,
  SectionHeading,
  CountChips,
  CountChip,
  Avatar,
} from "@/components/common";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const activeDoerNames = (data: any) => unique((data.doers || []).filter((d: any) => d.active !== false).map((d: any) => d.doer));
const departmentNames = (data: any) => unique((data.departments || []).map((d: any) => d.department));

function statusMatch(selected: string, value: string) {
  if (!selected || selected === ALL) return true;
  const v = String(value ?? "").trim() || STATUS.PENDING;
  return v === selected;
}

export function DelegationTab({ data }: { data: any }) {
  const all: any[] = data.delegation || [];
  const [f, setF] = React.useState({ doer: ALL, department: ALL, status: ALL, colour: ALL, from: "", to: "", search: "" });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  const rows = React.useMemo(
    () =>
      all
        .filter((r) => matchesDropdown(f.doer, r.doer))
        .filter((r) => matchesDropdown(f.department, r.department))
        .filter((r) => statusMatch(f.status, r.status))
        .filter((r) => matchesDropdown(f.colour, delegationColour(r)))
        .filter((r) => inDateRange(r.firstDate, f.from, f.to))
        .filter((r) => matchesSearch(f.search, [r.task, r.doer, r.taskId]))
        // Most revisions (Red) first, then by first date.
        .sort((a, b) => delegationRevisions(b) - delegationRevisions(a) || String(a.firstDate).localeCompare(String(b.firstDate))),
    [all, f]
  );

  const completed = rows.filter((r) => String(r.status ?? "").trim() === STATUS.COMPLETED).length;
  const shifted = rows.filter(wasShifted).length;
  const pending = rows.filter((r) => (String(r.status ?? "").trim() || STATUS.PENDING) === STATUS.PENDING).length;

  return (
    <div className="space-y-4">
      <SectionHeading
        title="Delegation"
        subtitle="One-time delegated tasks. Complete ho gaya to status 'Completed' — par agar week shift hua tha to wo alag se 'Week Shifted ×N' bhi dikhta hai."
      >
        <CountChips>
          <CountChip label="Completed" value={completed} tone="ok" />
          <CountChip label="Week Shifted" value={shifted} tone={shifted ? "warn" : "muted"} />
          <CountChip label="Pending" value={pending} tone={pending ? "bad" : "muted"} />
        </CountChips>
      </SectionHeading>
      <FilterBar>
        <SelectFilter label="Doer" value={f.doer} onChange={(v) => set({ doer: v })} options={activeDoerNames(data)} />
        <SelectFilter label="Department" value={f.department} onChange={(v) => set({ department: v })} options={departmentNames(data)} />
        <SelectFilter label="Status" value={f.status} onChange={(v) => set({ status: v })} options={[STATUS.COMPLETED, STATUS.SHIFTED, STATUS.PENDING]} />
        <SelectFilter label="RAG" value={f.colour} onChange={(v) => set({ colour: v })} options={[COLOUR.GREEN, COLOUR.YELLOW, COLOUR.RED]} />
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
              <TableHead>Department</TableHead>
              <TableHead>First Date</TableHead>
              <TableHead>Last Shift</TableHead>
              <TableHead>Week Shifted</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow span={8} />
            ) : (
              rows.map((r, i) => (
                <TableRow key={r.taskId || i} className={cn(delegationColour(r) === COLOUR.RED && "bg-bad/10")}>
                  <TableCell className="max-w-[22rem] font-medium">{r.task}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={r.doer} />
                      <span className="whitespace-nowrap">{r.doer}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.department}</TableCell>
                  <TableCell>{fmtDate(r.firstDate)}</TableCell>
                  <TableCell>{fmtDate(r.latestRevision)}</TableCell>
                  <TableCell>
                    <RagBadge revisions={delegationShifts(r)} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={r.status} />
                  </TableCell>
                  <TableCell>
                    <MetaTag value={r.priority} />
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
