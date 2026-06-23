import * as React from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { pctText, scoreVariant } from "@/lib/format";
import { ALL, STATUS } from "@/lib/config";

// --- Status & meta badges ----------------------------------------------------
export function StatusBadge({ value, atRisk }: { value?: string; atRisk?: boolean }) {
  const v = String(value ?? "").trim() || STATUS.PENDING; // blank → Pending (PRD §9)
  let variant: "ok" | "warn" | "bad" = "warn";
  if (v === STATUS.DONE || v === STATUS.COMPLETED) variant = "ok";
  if (atRisk) variant = "bad";
  return (
    <Badge variant={variant}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {v}
    </Badge>
  );
}

export function MetaTag({ value }: { value?: string }) {
  const v = String(value ?? "").trim();
  if (!v) return <span className="text-muted-foreground">—</span>;
  let variant: "default" | "warn" | "bad" = "default";
  if (v === "High" || v === "Urgent") variant = "bad";
  else if (v === "Medium") variant = "warn";
  return <Badge variant={variant}>{v}</Badge>;
}

// --- Completion bar ----------------------------------------------------------
export function ScoreBar({ pct }: { pct: number | null | undefined }) {
  const v = scoreVariant(pct);
  const fill = { ok: "bg-ok", warn: "bg-warn", bad: "bg-bad", muted: "bg-white/20" }[v];
  const text = { ok: "text-ok", warn: "text-warn", bad: "text-bad", muted: "text-muted-foreground" }[v];
  return (
    <div className="flex min-w-[7.5rem] items-center gap-2">
      <span className={cn("w-9 text-right font-semibold tabular-nums", text)}>{pctText(pct)}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full transition-all", fill)} style={{ width: `${pct ?? 0}%` }} />
      </div>
    </div>
  );
}

// --- Cell helpers ------------------------------------------------------------
export function Stack({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col leading-tight">{children}</div>;
}
export function Sub({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-xs text-muted-foreground", className)}>{children}</span>;
}

// --- Filter primitives -------------------------------------------------------
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="glass flex flex-wrap items-end gap-3 rounded-xl p-3">{children}</div>;
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
  includeAll = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  includeAll?: boolean;
}) {
  const opts = includeAll ? [ALL, ...options] : options;
  return (
    <Field label={label} className="min-w-[8.5rem]">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opts.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function SearchFilter({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Field label="Search" className="min-w-[12rem] flex-1">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-8" />
      </div>
    </Field>
  );
}

export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (which: "from" | "to", v: string) => void;
}) {
  return (
    <Field label="Date range">
      <div className="flex items-center gap-2">
        <Input type="date" value={from} onChange={(e) => onChange("from", e.target.value)} className="w-[8.5rem]" />
        <span className="text-muted-foreground">→</span>
        <Input type="date" value={to} onChange={(e) => onChange("to", e.target.value)} className="w-[8.5rem]" />
      </div>
    </Field>
  );
}

export function ResultCount({ shown, total }: { shown: number; total: number }) {
  return (
    <p className="px-1 text-xs text-muted-foreground">
      Showing {shown} of {total}
    </p>
  );
}

export function EmptyRow({ span }: { span: number }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={span} className="py-10 text-center text-muted-foreground">
        No matching rows for the current filters.
      </TableCell>
    </TableRow>
  );
}
