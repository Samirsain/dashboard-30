import { Icon } from "./Icon";
import { BRAND } from "@/lib/config";
import { cn } from "@/lib/utils";

export type Section = { id: string; label: string; icon: string };

export const SECTIONS: Section[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "checklist", label: "Checklist", icon: "fact_check" },
  { id: "tasklist", label: "Task List", icon: "account_tree" },
  { id: "workflow", label: "Workflow", icon: "assignment" },
];

function Item({
  icon,
  label,
  active,
  onClick,
  href,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const cls = cn(
    "relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-body-md transition-colors",
    active ? "nav-item-active" : "text-on-surface-variant hover:bg-surface-container-high"
  );
  const inner = (
    <>
      <Icon name={icon} filled={active} className="text-[20px]" />
      <span>{label}</span>
    </>
  );
  if (href)
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  return (
    <button type="button" onClick={onClick} className={cn(cls, "w-full text-left")}>
      {inner}
    </button>
  );
}

export function Sidebar({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <nav className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col border-r border-outline-variant bg-glass-bg px-4 py-7 backdrop-blur-xl md:flex">
      <div className="mb-7 px-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-base font-bold text-white shadow-glow">
            30
          </span>
          <div className="leading-tight">
            <h1 className="truncate text-headline-sm font-bold text-primary" title={BRAND.name}>
              {BRAND.name}
            </h1>
            <p className="text-label-sm text-on-surface-variant">Executive Portal</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {SECTIONS.map((s) => (
          <Item key={s.id} icon={s.icon} label={s.label} active={active === s.id} onClick={() => onSelect(s.id)} />
        ))}
        <div className="my-3 border-t border-outline-variant" />
        <Item icon="admin_panel_settings" label="Admin · Scoring" href="/admin" />
      </div>

      <div className="mt-3 border-t border-outline-variant pt-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-on-surface-variant">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-fixed text-xs font-bold text-primary-fixed-variant">
            TM
          </span>
          <div className="leading-tight">
            <p className="text-body-sm font-medium text-on-surface">ThirtyMilestones</p>
            <p className="text-label-sm text-on-surface-variant">Read-only</p>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ---- Admin shell sidebar (scoring only) ------------------------------------
export function AdminSidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <nav className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col border-r border-outline-variant bg-glass-bg px-4 py-7 backdrop-blur-xl md:flex">
      <div className="mb-7 px-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-base font-bold text-white shadow-glow">30</span>
          <div className="leading-tight">
            <h1 className="truncate text-headline-sm font-bold text-primary" title={BRAND.name}>{BRAND.name}</h1>
            <p className="text-label-sm text-on-surface-variant">Admin Portal</p>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-1">
        <Item icon="leaderboard" label="Scoring" active />
        <div className="my-3 border-t border-outline-variant" />
        <Item icon="dashboard" label="Public Dashboard" href="/" />
      </div>
      <div className="mt-3 border-t border-outline-variant pt-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-body-md text-danger transition-colors hover:bg-red-50"
        >
          <Icon name="logout" className="text-[20px]" />
          Logout
        </button>
      </div>
    </nav>
  );
}

// Mobile section tabs (sidebar is hidden on small screens).
export function MobileSectionTabs({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <div className="scroll-slim flex gap-2 overflow-x-auto border-b border-outline-variant bg-glass-bg px-4 py-2 backdrop-blur-xl md:hidden">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-body-sm transition-colors",
            active === s.id ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant"
          )}
        >
          <Icon name={s.icon} className="text-[18px]" />
          {s.label}
        </button>
      ))}
      <a
        href="/admin"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface-variant"
      >
        <Icon name="admin_panel_settings" className="text-[18px]" />
        Admin
      </a>
    </div>
  );
}
