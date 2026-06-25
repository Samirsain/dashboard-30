import { Icon } from "./Icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Topbar({
  sectionLabel,
  weeks,
  weekKey,
  onWeekChange,
  source,
  onLogout,
}: {
  sectionLabel: string;
  weeks: { key: string; label: string }[];
  weekKey: string;
  onWeekChange: (v: string) => void;
  source: string;
  onLogout?: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between gap-4 border-b border-outline-variant bg-glass-bg px-4 backdrop-blur-xl sm:px-6">
      <div className="min-w-0">
        <h2 className="hidden truncate text-headline-sm font-bold text-on-surface sm:block">ThirtyMilestones MIS</h2>
        <div className="flex items-center gap-1 text-label-sm text-on-surface-variant">
          <span>Overview</span>
          <Icon name="chevron_right" className="text-[14px]" />
          <span className="font-medium text-primary">{sectionLabel}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface-variant lg:flex">
          <Icon name="calendar_month" className="text-[18px]" />
          <span className="max-w-[10rem] truncate">{weeks.find((w) => w.key === weekKey)?.label || "All weeks"}</span>
        </div>
        <Select value={weekKey} onValueChange={onWeekChange}>
          <SelectTrigger className="h-9 w-[11rem] border-border bg-surface-container-lowest text-body-sm">
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
        <span
          className={
            "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-medium sm:inline-flex " +
            (source === "sample" ? "bg-amber-100 text-warning" : "bg-green-100 text-success")
          }
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {source === "sample" ? "Sample" : "Live"}
        </span>
        {onLogout && (
          <button
            onClick={onLogout}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface-container-lowest text-on-surface-variant transition-colors hover:bg-surface-container-high md:hidden"
            title="Logout"
          >
            <Icon name="logout" className="text-[18px]" />
          </button>
        )}
      </div>
    </header>
  );
}
