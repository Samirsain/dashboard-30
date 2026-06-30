// =============================================================================
// permissions.ts — single source of truth for "what can this user see/do".
//
// Every access decision (sidebar, routing, data) flows through here so there is
// no duplicate permission logic scattered across components. admin & pc are
// unrestricted; employees are limited to their assigned module slugs.
//
// NOTE: this is client-side enforcement (matching the current static-SPA + Apps
// Script stack). When a real backend lands, mirror these checks server-side —
// the function shapes are intentionally backend-friendly.
// =============================================================================

import type { Session } from "./auth";
import { getActiveModules, type ModuleDef } from "./modules";
import { getUserModules } from "./userDb";

// Roles that can see every active module.
function isUnrestricted(session: Session): boolean {
  return session.internalRole === "admin" || session.internalRole === "pc";
}

// The active modules this session is allowed to see, in sidebar order.
export function visibleModules(session: Session): ModuleDef[] {
  const active = getActiveModules();
  if (isUnrestricted(session)) return active;

  const allowed = new Set(getUserModules(session.userId));
  allowed.add("dashboard"); // everyone always gets their landing dashboard
  return active.filter((m) => allowed.has(m.slug));
}

// Can this session open a given module slug?
export function canAccessModule(session: Session, slug: string): boolean {
  return visibleModules(session).some((m) => m.slug === slug);
}

// The slug to land on after login / when the current one becomes inaccessible.
export function defaultModuleSlug(session: Session): string {
  const mods = visibleModules(session);
  return mods[0]?.slug ?? "dashboard";
}
