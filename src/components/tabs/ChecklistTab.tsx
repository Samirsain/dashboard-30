import * as React from "react";
import { HEADERS, STATUS, ALL } from "@/lib/config";
import { unique, matchesDropdown, matchesSearch, inDateRange } from "@/lib/filters";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import {
  FilterBar,
  SelectFilter,
  SearchFilter,
  DateRangeFilter,
  ResultCount,
  StatusBadge,
  EmptyRow,
} from "@/components/common";
import { fmtDate } from "@/lib/format";

const H = HEADERS;
const activeDoerNames = (data: any) =>
  unique((data.doers || []).filter((d: any) => d[H.Doers.active] !== false).map((d: any) => d[H.Doers.doer]));
const departmentNames = (data: any) => unique((data.departments || []).map((d: any) => d[H.Departments.department]));

// "All" matches everything; else compare against the done-term or "Pending".
function statusMatch(selected: string, value: string, doneTerm: string) {
  if (!selected || selected === ALL) return true;
  const v = String(value ?? "").trim() || STATUS.PENDING;
  return selected === STATUS.PENDING ? v === STATUS.PENDING : v === doneTerm;
}

export function ChecklistTab({ data }: { data: any }) {
  const all: any[] = data.checklist || [];
  const [f, setF] = React.useState({ doer: ALL, department: ALL, status: ALL, from: "", to: "", search: "" });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  const rows = React.useMemo(
    () =>
      all
        .filter((r) => matchesDropdown(f.doer, r[H.Checklist.doer]))
        .filter((r) => matchesDropdown(f.department, r[H.Checklist.department]))
        .filter((r) => statusMatch(f.status, r[H.Checklist.status], STATUS.DONE))
        .filter((r) => inDateRange(r[H.Checklist.date], f.from, f.to))
        .filter((r) => matchesSearch(f.search, [r[H.Checklist.task], r[H.Checklist.doer]]))
        .sort(
          (a, b) =>
            String(a[H.Checklist.date]).localeCompare(String(b[H.Checklist.date])) ||
            String(a[H.Checklist.task]).localeCompare(String(b[H.Checklist.task]))
        ),
    [all, f]
  );

  return (
    <div className="space-y-4">
      <FilterBar>
        <SelectFilter label="Doer" value={f.doer} onChange={(v) => set({ doer: v })} options={activeDoerNames(data)} />
        <SelectFilter label="Department" value={f.department} onChange={(v) => set({ department: v })} options={departmentNames(data)} />
        <SelectFilter label="Status" value={f.status} onChange={(v) => set({ status: v })} options={[STATUS.DONE, STATUS.PENDING]} />
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
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow span={5} />
            ) : (
              rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r[H.Checklist.task]}</TableCell>
                  <TableCell>{r[H.Checklist.doer]}</TableCell>
                  <TableCell className="text-muted-foreground">{r[H.Checklist.department]}</TableCell>
                  <TableCell>{fmtDate(r[H.Checklist.date])}</TableCell>
                  <TableCell>
                    <StatusBadge value={r[H.Checklist.status]} />
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
