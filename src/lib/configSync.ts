// =============================================================================
// configSync.ts — cross-device sync for sheet connections + per-doer access.
//
// Sheet connections and permission assignments used to live ONLY in each
// browser's localStorage, so an assignment the admin made on their laptop was
// invisible on a doer's laptop. This module makes the Apps Script backend the
// shared source of truth:
//
//   • applyRemoteConfig(config)  — called on every data load. Hydrates this
//     device's local caches (connections, their nav modules, and each account's
//     allowed/addable modules) from the backend config.
//   • scheduleConfigPush()       — called after an admin edits connections or
//     access. Debounced; gathers this device's config and POSTs it so every
//     other device picks it up on its next load.
//
// Access is keyed by USERNAME (stable across devices) rather than the local
// user id (generated per-device), so permissions resolve to the right account
// everywhere.
// =============================================================================

import { APPS_SCRIPT_URL, WRITE_TOKEN } from "./config.js";
import { getConnections } from "./sheets";
import { createModule, getModuleBySlug, getAllModules, deleteModule } from "./modules";
import { getAllUsers, applyAccessByUsername, type AccessMap } from "./userDb";

// localStorage key owned by sheets.ts — written directly here so hydration does
// NOT trigger a push back to the server (that would be a pointless echo).
const SHEETS_KEY = "tm-mis-sheets-v1";

export interface SharedConfig {
  connections: any[];
  access: AccessMap;
}

// ── Hydrate this device from the backend config ───────────────────────────────
export function applyRemoteConfig(config: SharedConfig | null | undefined): void {
  if (!config || typeof config !== "object") return;

  const remoteConns = Array.isArray(config.connections) ? config.connections : [];
  const remoteAccess = config.access && typeof config.access === "object" ? config.access : {};
  const remoteEmpty = remoteConns.length === 0 && Object.keys(remoteAccess).length === 0;

  // First run: the backend has nothing yet. Don't wipe whatever this device
  // already has locally — instead migrate it up so it becomes the shared config.
  if (remoteEmpty) {
    let localConns: any[] = [];
    try {
      localConns = JSON.parse(localStorage.getItem(SHEETS_KEY) || "[]");
    } catch {
      localConns = [];
    }
    if (Array.isArray(localConns) && localConns.length > 0) scheduleConfigPush();
    return;
  }

  // 1) Connections → local cache, and make sure each one has its nav module.
  try {
    localStorage.setItem(SHEETS_KEY, JSON.stringify(remoteConns));
  } catch {
    /* storage unavailable */
  }
  for (const c of remoteConns) {
    if (!c || !c.moduleSlug) continue;
    if (getModuleBySlug(c.moduleSlug)) continue;
    try {
      createModule({
        name: c.name || "Connected Sheet",
        icon: c.sheetType === "checklist" ? "checklist" : "assignment",
        slug: c.moduleSlug,
        description: `Connected: ${c.sheetId || ""}`,
      });
    } catch {
      /* slug already taken / race — ignore */
    }
  }

  // Prune orphan connection modules: a sheet removed (or renamed) on one device
  // leaves its old sc-* module behind on other devices, showing as a duplicate
  // "Coming soon" entry. Drop any sc-* module that no longer has a connection.
  const liveSlugs = new Set(remoteConns.map((c: any) => c && c.moduleSlug).filter(Boolean));
  for (const mod of getAllModules()) {
    if (mod.slug.indexOf("sc-") === 0 && !mod.core && !liveSlugs.has(mod.slug)) {
      try { deleteModule(mod.id); } catch { /* ignore */ }
    }
  }

  // 2) Per-doer access (by username) → local user records.
  try {
    applyAccessByUsername(remoteAccess);
  } catch {
    /* ignore */
  }
}

// ── Push this device's config to the backend (admin edits) ────────────────────
export function buildLocalConfig(): SharedConfig {
  const connections = getConnections();
  const access: AccessMap = {};
  for (const u of getAllUsers()) {
    if (u.role === "admin" || u.role === "pc") continue; // unrestricted — nothing to store
    const entry: { modules?: string[]; addable?: string[] } = {};
    if (Array.isArray(u.modules)) entry.modules = u.modules;
    if (Array.isArray(u.addableModules)) entry.addable = u.addableModules;
    if (entry.modules || entry.addable) {
      access[String(u.username || "").toUpperCase()] = entry;
    }
  }
  return { connections, access };
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

// Debounced — several quick toggles collapse into one network write.
export function scheduleConfigPush(): void {
  if (!APPS_SCRIPT_URL) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushConfigNow().catch(() => {
      /* best-effort; the next admin edit will retry */
    });
  }, 600);
}

export async function pushConfigNow(): Promise<void> {
  if (!APPS_SCRIPT_URL) return;
  const body = JSON.stringify({
    token: WRITE_TOKEN,
    action: "saveConfig",
    config: buildLocalConfig(),
  });
  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  });
}
