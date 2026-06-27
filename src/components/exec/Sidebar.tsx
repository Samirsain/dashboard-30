import { Icon } from "./Icon";
import { BRAND } from "@/lib/config";
import { cn } from "@/lib/utils";
import logoSvg from "@/assets/logo.svg";

export type Section = { id: string; label: string; icon: string };

export const SECTIONS: Section[] = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "checklist", label: "Checklist", icon: "checklist" },
  { id: "tasklist", label: "Task List", icon: "assignment" },
  { id: "workflow", label: "Workflow", icon: "account_tree" },
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
    "relative flex items-center gap-3 border-l-4 px-4 py-3 font-label-sm text-label-sm uppercase transition-colors",
    active
      ? "nav-item-active border-transparent font-bold"
      : "border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
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

function Brand({ subtitle }: { subtitle: string }) {
  return (
    <div className="border-b-2 border-on-surface px-5 py-4">
      <img src={logoSvg} alt={BRAND.name} className="h-10 w-auto" />
      <p className="mt-1.5 font-label-sm text-label-sm uppercase text-on-surface-variant">{subtitle}</p>
    </div>
  );
}

export function Sidebar({
  active,
  onSelect,
  showAdmin,
  onLogout,
}: {
  active: string;
  onSelect: (id: string) => void;
  showAdmin?: boolean;
  onLogout?: () => void;
}) {
  return (
    <nav className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col border-r-2 border-on-surface bg-surface md:flex">
      <Brand subtitle="Enterprise RE MIS" />
      <div className="flex-1 overflow-y-auto py-3">
        {SECTIONS.map((s) => (
          <Item key={s.id} icon={s.icon} label={s.label} active={active === s.id} onClick={() => onSelect(s.id)} />
        ))}
        {showAdmin && <Item icon="admin_panel_settings" label="Admin · Scoring" href="/admin" />}
      </div>
      {onLogout && (
        <div className="border-t-2 border-on-surface py-2">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 border-l-4 border-transparent px-4 py-3 font-label-sm text-label-sm uppercase text-error transition-colors hover:bg-error hover:text-on-error"
          >
            <Icon name="logout" className="text-[20px]" />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

// ---- Admin shell sidebar (scoring only) ------------------------------------
export function AdminSidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <nav className="sticky top-0 z-20 hidden h-screen w-64 shrink-0 flex-col border-r-2 border-on-surface bg-surface md:flex">
      <Brand subtitle="Admin Portal" />
      <div className="flex-1 py-3">
        <Item icon="leaderboard" label="Scoring" active />
        <Item icon="dashboard" label="Public Dashboard" href="/" />
      </div>
      <div className="border-t-2 border-on-surface py-2">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 border-l-4 border-transparent px-4 py-3 font-label-sm text-label-sm uppercase text-error transition-colors hover:bg-error hover:text-on-error"
        >
          <Icon name="logout" className="text-[20px]" />
          Logout
        </button>
      </div>
    </nav>
  );
}

// Mobile section tabs (sidebar is hidden on small screens).
export function MobileSectionTabs({ active, onSelect, showAdmin }: { active: string; onSelect: (id: string) => void; showAdmin?: boolean }) {
  return (
    <div className="scroll-slim flex gap-0 overflow-x-auto border-b-2 border-on-surface bg-surface md:hidden">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={cn(
            "flex items-center gap-1.5 whitespace-nowrap border-r border-on-surface px-3 py-2.5 font-label-sm text-label-sm uppercase transition-colors",
            active === s.id ? "bg-on-surface text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
          )}
        >
          <Icon name={s.icon} className="text-[18px]" />
          {s.label}
        </button>
      ))}
      {showAdmin && (
        <a
          href="/admin"
          className="flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 font-label-sm text-label-sm uppercase text-on-surface-variant"
        >
          <Icon name="admin_panel_settings" className="text-[18px]" />
          Admin
        </a>
      )}
    </div>
  );
}
