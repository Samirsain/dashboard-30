import { LogOut, ShieldCheck, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAND } from "@/lib/config";

function SourceBadge({ source }: { source: string }) {
  return source === "sample" ? <Badge variant="warn">Sample data</Badge> : <Badge variant="ok">Live</Badge>;
}

export function Header({
  weeks,
  weekKey,
  onWeekChange,
  weekLabel,
  source,
  onLogout,
  navLink,
}: {
  weeks: { key: string; label: string }[];
  weekKey: string;
  onWeekChange: (v: string) => void;
  weekLabel: string;
  source: string;
  onLogout?: () => void;
  navLink?: { href: string; label: string; lock?: boolean };
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 font-display text-lg font-bold text-primary shadow-glow">
            30
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-wide">{BRAND.name}</span>
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-primary/80">{BRAND.tagline}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-medium text-primary/90">{weekLabel}</span>
            <Select value={weekKey} onValueChange={onWeekChange}>
              <SelectTrigger className="h-8 w-[11.5rem] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((w) => (
                  <SelectItem key={w.key} value={w.key}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SourceBadge source={source} />
          {navLink && (
            <Button asChild variant="outline" className="h-8 px-2.5 text-xs">
              <a href={navLink.href} title={navLink.label}>
                {navLink.lock ? <ShieldCheck className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                <span className="hidden sm:inline">{navLink.label}</span>
              </a>
            </Button>
          )}
          {onLogout && (
            <Button variant="outline" onClick={onLogout} className="h-8 px-2.5 text-xs" title="Logout">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
