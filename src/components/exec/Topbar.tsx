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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 border-b-2 border-on-surface bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 font-label-sm text-label-sm uppercase">
        <span className="text-on-surface-variant">Overview</span>
        <span className="text-outline">/</span>
        <span className="truncate border-b-2 border-on-surface pb-0.5 font-bold text-on-surface">{sectionLabel}</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Select value={weekKey} onValueChange={onWeekChange}>
          <SelectTrigger className="h-9 w-[11rem] rounded-none border-2 border-on-surface bg-surface-container-lowest font-mono text-data-mono uppercase">
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
            "hidden items-center gap-1.5 border-2 px-2.5 py-1.5 font-label-sm text-label-sm font-semibold uppercase sm:inline-flex " +
            (source === "sample"
              ? "border-on-surface bg-surface-container text-on-surface-variant"
              : "border-on-surface bg-on-surface text-on-primary")
          }
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {source === "sample" ? "Sample" : "Live"}
        </span>
        {onLogout && (
          <button
            onClick={onLogout}
            className="grid h-9 w-9 place-items-center border-2 border-on-surface bg-surface-container-lowest text-on-surface transition-colors hover:bg-on-surface hover:text-on-primary md:hidden"
            title="Logout"
          >
            <Icon name="logout" className="text-[18px]" />
          </button>
        )}
      </div>
    </header>
  );
}
