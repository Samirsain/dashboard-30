import * as React from "react";
import { STATUS, ALL } from "@/lib/config";
import { unique, matchesDropdown, matchesSearch, inDateRange } from "@/lib/filters";
import { isChecklistDone, isChecklistLate } from "@/lib/scoring";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  FilterBar,
  SelectFilter,
  SearchFilter,
  DateRangeFilter,
  ResultCount,
  StatusBadge,
  Stack,
  Sub,
  EmptyRow,
} from "@/components/common";
import { fmtDate } from "@/lib/format";

const activeDoerNames = (data: any) => unique((data.doers || []).filter((d: any) => d.active !== false).map((d: any) => d.doer));
const departmentNames = (data: any) => unique((data.departments || []).map((d: any) => d.department));

function statusMatch(selected: string, value: string) {
  if (!selected || selected === ALL) return true;
  const v = String(value ?? "").trim() || STATUS.PENDING;
  return v === selected;
}

export function ChecklistTab({ data }: { data: any }) {
  const all: any[] = data.checklist || [];
  const [f, setF] = React.useState({ doer: ALL, department: ALL, status: ALL, frequency: ALL, from: "", to: "", search: "" });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  const rows = React.useMemo(
    () =>
      all
        .filter((r) => matchesDropdown(f.doer, r.doer))
        .filter((r) => matchesDropdown(f.department, r.department))
        .filter((r) => statusMatch(f.status, r.status))
        .filter((r) => matchesDropdown(f.frequency, r.frequency))
        .filter((r) => inDateRange(r.planned, f.from, f.to))
        .filter((r) => matchesSearch(f.search, [r.task, r.doer]))
        .sort((a, b) => String(a.planned).localeCompare(String(b.planned)) || String(a.task).localeCompare(String(b.task))),
    [all, f]
  );

  return (
    <div className="space-y-4">
      <FilterBar>
        <SelectFilter label="Doer" value={f.doer} onChange={(v) => set({ doer: v })} options={activeDoerNames(data)} />
        <SelectFilter label="Department" value={f.department} onChange={(v) => set({ department: v })} options={departmentNames(data)} />
        <SelectFilter label="Status" value={f.status} onChange={(v) => set({ status: v })} options={[STATUS.DONE, STATUS.PENDING]} />
        <SelectFilter label="Frequency" value={f.frequency} onChange={(v) => set({ frequency: v })} options={["Daily", "Weekly", "Monthly"]} />
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
              <TableHead>Frequency</TableHead>
              <TableHead>Planned</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow span={7} />
            ) : (
              rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-[22rem] font-medium">{r.task}</TableCell>
                  <TableCell>{r.doer}</TableCell>
                  <TableCell className="text-muted-foreground">{r.department}</TableCell>
                  <TableCell className="text-muted-foreground">{r.frequency}</TableCell>
                  <TableCell>{fmtDate(r.planned)}</TableCell>
                  <TableCell>
                    <Stack>
                      <span>{fmtDate(r.actual)}</span>
                      {isChecklistDone(r) && isChecklistLate(r) && <Sub className="text-warn">late</Sub>}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={r.status} />
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
