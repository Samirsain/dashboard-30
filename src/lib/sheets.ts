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
}

export function toggleConnection(id: string): void {
  writeAll(readAll().map((c) => (c.id === id ? { ...c, active: !c.active } : c)));
}

export function updateConnectionName(id: string, name: string): void {
  writeAll(readAll().map((c) => (c.id === id ? { ...c, name: name.trim() } : c)));
}
