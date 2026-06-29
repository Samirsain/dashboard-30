// =============================================================================
// auth.ts — Session management layer on top of userDb.
//
// verifyCredentials() is now a thin wrapper around userDb.loginUser().
// Session is stored in localStorage as before.
// =============================================================================

import { loginUser, getUserById, type UserRecord, type UserRole } from "./userDb";

export type Role = "admin" | "staff";

const STORE_KEY = "tm-mis-session-v2";

export interface Session {
  userId: string;
  role: Role;
  internalRole: UserRole;
  doerName: string | null;
  canAdd: boolean;
  forcePasswordChange: boolean;
}

function userRoleToRole(r: UserRole): Role {
  return r === "admin" ? "admin" : "staff";
}

function userToSession(user: UserRecord): Session {
  return {
    userId: user.id,
    role: userRoleToRole(user.role),
    internalRole: user.role,
    doerName: user.doerName,
    canAdd: user.canAdd,
    forcePasswordChange: user.forcePasswordChange,
  };
}

// ── Login ─────────────────────────────────────────────────────────────────────

export interface LoginResult {
  session: Session;
  forcePasswordChange: boolean;
}

export async function verifyCredentials(username: string, password: string): Promise<LoginResult | null> {
  const result = await loginUser(username, password);
  if (!result) return null;
  const session = userToSession(result.user);
  return { session, forcePasswordChange: result.forcePasswordChange };
}

// ── Session storage ───────────────────────────────────────────────────────────

export function currentSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed: Session = JSON.parse(raw);
    if (!parsed?.userId || !parsed?.role) return null;
    // Sync forcePasswordChange from DB in case admin reset it
    const user = getUserById(parsed.userId);
    if (!user) return null;
    return { ...parsed, forcePasswordChange: user.forcePasswordChange };
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(session));
  } catch { /* ignore */ }
}

export function clearForcePasswordChange(session: Session): void {
  const updated = { ...session, forcePasswordChange: false };
  setSession(updated);
}

export function logout(): void {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch { /* ignore */ }
}

// ── Convenience helpers ───────────────────────────────────────────────────────

export function isAuthed(): boolean {
  return currentSession() !== null;
}

export function currentRole(): Role | null {
  return currentSession()?.role ?? null;
}

export function currentDoerName(): string | null {
  return currentSession()?.doerName ?? null;
}

export function currentCanAdd(): boolean {
  return currentSession()?.canAdd ?? false;
}

export function isAdmin(): boolean {
  return currentSession()?.role === "admin";
}

export function currentUserId(): string | null {
  return currentSession()?.userId ?? null;
}
