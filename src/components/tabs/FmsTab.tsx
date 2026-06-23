import * as React from "react";
import { HEADERS, ALL } from "@/lib/config";
import { unique, matchesDropdown, matchesSearch, inDateRange } from "@/lib/filters";
import { isFmsOverdue, isFmsDoneLate } from "@/lib/scoring";
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
import { cn } from "@/lib/utils";

const H = HEADERS;
const activeDoerNames = (data: any) =>
  unique((data.doers || []).filter((d: any) => d[H.Doers.active] !== false).map((d: any) => d[H.Doers.doer]));

export function FmsTab({ data }: { data: any }) {
  const all: any[] = data.fms || [];
  const [f, setF] = React.useState({ fms: ALL, doer: ALL, from: "", to: "", search: "" });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));
  const fmsNames = React.useMemo(() => unique(all.map((r) => r[H.FMS.fmsName])), [all]);

  const rows = React.useMemo(
    () =>
      all
        .filter((r) => matchesDropdown(f.fms, r[H.FMS.fmsName]))
        .filter((r) => matchesDropdown(f.doer, r[H.FMS.doer]))
        .filter((r) => inDateRange(r[H.FMS.plannedDate], f.from, f.to))
        .filter((r) => matchesSearch(f.search, [r[H.FMS.fmsName], r[H.FMS.step], r[H.FMS.doer]]))
        .sort((a, b) => {
          const n = String(a[H.FMS.fmsName]).localeCompare(String(b[H.FMS.fmsName]));
          return n !== 0 ? n : Number(a[H.FMS.stepNo]) - Number(b[H.FMS.stepNo]);
        }),
    [all, f]
  );

  return (
    <div className="space-y-4">
      <FilterBar>
        <SelectFilter label="FMS" value={f.fms} onChange={(v) => set({ fms: v })} options={fmsNames} />
        <SelectFilter label="Doer" value={f.doer} onChange={(v) => set({ doer: v })} options={activeDoerNames(data)} />
        <DateRangeFilter from={f.from} to={f.to} onChange={(w, v) => set({ [w]: v })} />
        <SearchFilter value={f.search} onChange={(v) => set({ search: v })} placeholder="Search FMS or step…" />
      </FilterBar>
      <ResultCount shown={rows.length} total={all.length} />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>FMS Name</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Doer</TableHead>
              <TableHead>Department</TableHead>
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
                <TableRow key={i} className={cn(isFmsOverdue(r) && "bg-bad/[0.05]")}>
                  <TableCell className="font-medium">{r[H.FMS.fmsName]}</TableCell>
                  <TableCell>
                    <Stack>
                      <span>{r[H.FMS.step]}</span>
                      <Sub>
                        Step {r[H.FMS.stepNo]} · {r[H.FMS.frequency]}
                      </Sub>
                    </Stack>
                  </TableCell>
                  <TableCell>{r[H.FMS.doer]}</TableCell>
                  <TableCell className="text-muted-foreground">{r[H.FMS.department]}</TableCell>
                  <TableCell>
                    <Stack>
                      <span>{fmtDate(r[H.FMS.plannedDate])}</span>
                      {isFmsOverdue(r) ? <Sub className="text-bad">overdue</Sub> : r[H.FMS.plannedTime] ? <Sub>{r[H.FMS.plannedTime]}</Sub> : null}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack>
                      <span>{fmtDate(r[H.FMS.actualDate])}</span>
                      {isFmsDoneLate(r) && <Sub className="text-warn">done-late</Sub>}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={r[H.FMS.status]} />
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
