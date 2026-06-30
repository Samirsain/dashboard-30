// =============================================================================
// modules.ts — Scalable module registry.
//
// Modules are NOT hardcoded in components. The whole dashboard (sidebar, routing,
// permissions) is generated from this registry. Admin can create / enable /
// disable / reorder modules at runtime without code changes — new modules just
// appear in the nav for whoever they're assigned to.
//
// Stored in localStorage (`tm-mis-modules-v1`). When a real backend lands this
// file is the single seam to swap for an API — the rest of the app only talks to
// these functions, never to a hardcoded module list.
// =============================================================================

export interface ModuleDef {
  id: string;
  name: string; // display name shown in the sidebar
  slug: string; // stable key used for nav state, routing and permissions
  icon: string; // Material Symbols ligature name
  description: string;
  route: string; // reserved for future deep-linking (e.g. "/attendance")
  order: number; // sidebar sort order (ascending)
  active: boolean; // disabled modules are hidden for everyone
  core: boolean; // built-in modules cannot be deleted (only disabled)
  createdAt: string;
}

const STORE_KEY = "tm-mis-modules-v1";

// Built-in modules that ship with the product. Admin can disable/reorder these
// but not delete them. New custom modules get core:false.
const DEFAULT_MODULES: Omit<ModuleDef, "id" | "createdAt">[] = [
  { slug: "dashboard", name: "Dashboard", icon: "dashboard", description: "Overview & Today's Followup", route: "/", order: 1, active: true, core: true },
  { slug: "tasklist", name: "Task List", icon: "assignment", description: "Delegation tasks", route: "/", order: 2, active: true, core: true },
  { slug: "checklist", name: "Checklist", icon: "checklist", description: "Recurring checklist", route: "/", order: 3, active: true, core: true },
  { slug: "workflow", name: "Workflow", icon: "account_tree", description: "FMS workflow", route: "/", order: 4, active: true, core: true },
];

// ── Storage ───────────────────────────────────────────────────────────────────

function readAll(): ModuleDef[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(modules: ModuleDef[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(modules));
  } catch {
    /* storage unavailable */
  }
}

function genId(): string {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function slugify(name: string): string {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Seeding ─────────────────────────────────────────────────────────────────

// Seed the built-in modules once, and back-fill any new built-ins on upgrade
// (so adding a DEFAULT module in a release reaches existing installs).
export function initDefaultModules(): void {
  const existing = readAll();
  const bySlug = new Set(existing.map((m) => m.slug));
  const missing = DEFAULT_MODULES.filter((d) => !bySlug.has(d.slug));
  if (existing.length > 0 && missing.length === 0) return;

  const now = new Date().toISOString();
  const created = missing.map((d) => ({ ...d, id: genId(), createdAt: now }));
  writeAll([...existing, ...created]);
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export function getAllModules(): ModuleDef[] {
  return readAll().sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function getActiveModules(): ModuleDef[] {
  return getAllModules().filter((m) => m.active);
}

export function getModuleBySlug(slug: string): ModuleDef | null {
  return readAll().find((m) => m.slug === slug) ?? null;
}

// ── Writes (admin) ────────────────────────────────────────────────────────────

export function createModule(input: {
  name: string;
  icon?: string;
  description?: string;
  slug?: string;
}): ModuleDef {
  const all = readAll();
  const slug = (input.slug && slugify(input.slug)) || slugify(input.name);
  if (!slug) throw new Error("Module name is required.");
  if (all.some((m) => m.slug === slug)) throw new Error(`A module with slug "${slug}" already exists.`);

  const maxOrder = all.reduce((mx, m) => Math.max(mx, m.order), 0);
  const mod: ModuleDef = {
    id: genId(),
    name: input.name.trim(),
    slug,
    icon: input.icon?.trim() || "widgets",
    description: input.description?.trim() || "",
    route: "/",
    order: maxOrder + 1,
    active: true,
    core: false,
    createdAt: new Date().toISOString(),
  };
  writeAll([...all, mod]);
  return mod;
}

export function updateModule(id: string, patch: Partial<Omit<ModuleDef, "id" | "core" | "createdAt">>): void {
  writeAll(readAll().map((m) => (m.id === id ? { ...m, ...patch } : m)));
}

export function setModuleActive(id: string, active: boolean): void {
  writeAll(readAll().map((m) => (m.id === id ? { ...m, active } : m)));
}

export function deleteModule(id: string): void {
  const all = readAll();
  const target = all.find((m) => m.id === id);
  if (target?.core) throw new Error("Built-in modules can't be deleted — disable it instead.");
  writeAll(all.filter((m) => m.id !== id));
}

export function reorderModule(id: string, order: number): void {
  writeAll(readAll().map((m) => (m.id === id ? { ...m, order } : m)));
}
