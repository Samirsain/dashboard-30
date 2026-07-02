// =============================================================================
// sheets.ts — Google Sheet connection registry.
//
// Admin links additional Google Sheets here. Each connection auto-creates a
// module in the nav (Task List or Checklist type), keyed by a unique slug.
// Data is fetched from the main Apps Script URL with ?sheetId=&type= params,
// or from a custom Script URL if the user supplies one.
//
// Stored in localStorage `tm-mis-sheets-v1`.
// =============================================================================

import { createModule, deleteModule, getModuleBySlug } from "./modules";

export type SheetType = "tasklist" | "checklist";

export interface SheetConnection {
  id: string;
  name: string;         // display name: "Sales Task List"
  sheetId: string;      // Google Sheet ID
  sheetType: SheetType;
  scriptUrl?: string;   // custom Apps Script URL; blank = use main APPS_SCRIPT_URL
  moduleSlug: string;   // slug of the auto-created nav module (sc-XXXXXX)
  active: boolean;
  order: number;
  createdAt: string;
}

const STORE_KEY = "tm-mis-sheets-v1";

// ── Built-in connections ──────────────────────────────────────────────────────
// Sahil Sir's two sheets ship as default connections so admin/pc/ea always see
// them without anyone re-adding them by hand. They are matched by sheetId, so a
// manual add of the same sheet won't create a duplicate. Kept present across
// devices via configSync (see withDefaultConnections()).
const DEFAULT_CONNECTIONS: Array<{
  name: string;
  sheetId: string;
  sheetType: SheetType;
  moduleSlug: string;
}> = [
  {
    name: "Sahil Sir's Task List",
    sheetId: "1_sQzAtjFRqiYSNCAa8L0PiEV-LpPs_bUSOopIz7mF_w",
    sheetType: "tasklist",
    moduleSlug: "sc-sahil-tasklist",
  },
  {
    name: "Sahil Sir's Checklist",
    sheetId: "166k5KwxtKwOgXnBw8KPW4kBNPD2AAbsPzvTmkZjo6jw",
    sheetType: "checklist",
    moduleSlug: "sc-sahil-checklist",
  },
];

function toFullConnection(d: (typeof DEFAULT_CONNECTIONS)[number], order: number): SheetConnection {
  return {
    id: `sc_default_${d.moduleSlug}`,
    name: d.name,
    sheetId: d.sheetId,
    sheetType: d.sheetType,
    scriptUrl: undefined,
    moduleSlug: d.moduleSlug,
    active: true,
    order,
    createdAt: new Date().toISOString(),
  };
}

// Return the given connections with any missing built-ins appended (matched by
// sheetId). `added` says whether anything was appended, so the caller can decide
// to persist / push the result. Exported for configSync so the built-ins survive
// a hydrate from a backend config that predates them.
export function withDefaultConnections(conns: SheetConnection[]): { connections: SheetConnection[]; added: boolean } {
  const bySheet = new Set((conns || []).map((c) => String(c.sheetId)));
  const out = [...(conns || [])];
  let added = false;
  for (const d of DEFAULT_CONNECTIONS) {
    if (!bySheet.has(d.sheetId)) {
      out.push(toFullConnection(d, out.length + 1));
      added = true;
    }
  }
  return { connections: out, added };
}

// Make sure each connection has its nav module.
export function ensureConnectionModules(conns: SheetConnection[]): void {
  for (const c of conns) {
    if (!c || !c.moduleSlug) continue;
    if (getModuleBySlug(c.moduleSlug)) continue;
    try {
      createModule({
        name: c.name || "Connected Sheet",
        icon: c.sheetType === "checklist" ? "checklist" : "assignment",
        slug: c.moduleSlug,
        description: `Connected: ${c.sheetId}`,
      });
    } catch {
      /* slug taken / race — ignore */
    }
  }
}

// Seed the built-in connections on startup (idempotent). Creates their nav
// modules and pushes the config so other devices pick them up.
export function initDefaultConnections(): void {
  const { connections, added } = withDefaultConnections(readAll());
  ensureConnectionModules(connections);
  if (added) {
    writeAll(connections);
    pushConfig();
  }
}

function readAll(): SheetConnection[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(conns: SheetConnection[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(conns));
  } catch { /* unavailable */ }
}

// Fire-and-forget push of the connection list to the shared backend so other
// devices see it. Dynamic import avoids a static cycle with configSync.
function pushConfig(): void {
  import("./configSync")
    .then((m) => m.scheduleConfigPush())
    .catch(() => { /* offline / sample mode — ignore */ });
}

export function getConnections(): SheetConnection[] {
  return readAll().sort((a, b) => a.order - b.order);
}

export function getActiveConnections(): SheetConnection[] {
  return getConnections().filter((c) => c.active);
}

export function getConnectionBySlug(slug: string): SheetConnection | null {
  return readAll().find((c) => c.moduleSlug === slug) ?? null;
}

export function addConnection(input: {
  name: string;
  sheetId: string;
  sheetType: SheetType;
  scriptUrl?: string;
}): SheetConnection {
  const all = readAll();
  const randPart = Math.random().toString(36).slice(2, 8);
  const id = `sc_${Date.now()}_${randPart}`;
  const moduleSlug = `sc-${randPart}`;
  const icon = input.sheetType === "tasklist" ? "assignment" : "checklist";

  // Auto-create a module so it appears in the nav immediately.
  createModule({ name: input.name.trim(), icon, slug: moduleSlug, description: `Connected: ${input.sheetId}` });

  const conn: SheetConnection = {
    id,
    name: input.name.trim(),
    sheetId: input.sheetId.trim(),
    sheetType: input.sheetType,
    scriptUrl: input.scriptUrl?.trim() || undefined,
    moduleSlug,
    active: true,
    order: all.length + 1,
    createdAt: new Date().toISOString(),
  };

  writeAll([...all, conn]);
  pushConfig();
  return conn;
}

export function removeConnection(id: string): void {
  const all = readAll();
  const conn = all.find((c) => c.id === id);
  if (!conn) return;

  const mod = getModuleBySlug(conn.moduleSlug);
  if (mod) {
    try { deleteModule(mod.id); } catch { /* ignore */ }
  }

  writeAll(all.filter((c) => c.id !== id));
  pushConfig();
}

export function toggleConnection(id: string): void {
  writeAll(readAll().map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
  pushConfig();
}

export function updateConnectionName(id: string, name: string): void {
  writeAll(readAll().map((c) => (c.id === id ? { ...c, name: name.trim() } : c)));
  pushConfig();
}
