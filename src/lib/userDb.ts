// =============================================================================
// userDb.ts — Browser-local user database with PBKDF2 password hashing.
//
// Users are stored in localStorage as JSON. Passwords are hashed with PBKDF2
// (100k iterations, SHA-256) — never stored as plain text.
//
// Default accounts (created once on first app load):
//   admin   / TM@Admin30  → role: admin
//   pc      / TM@PC30     → role: pc
//   tmemp01 / TM@Emp01    → role: employee
//   tmemp02 / TM@Emp02    → role: employee
//   tmemp03 / TM@Emp03    → role: employee
//   tmemp04 / TM@Emp04    → role: employee
//   tmemp05 / TM@Emp05    → role: employee
//
// When admin adds a new doer via AddDoerModal, a new employee account is
// auto-created with: username = next tmemp ID, password = TM@{Name}30
// =============================================================================

export type UserRole = "admin" | "pc" | "employee";

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  doerName: string | null; // maps to Google Sheet doer name (UPPERCASE)
  canAdd: boolean;
  modules?: string[]; // module slugs this user can access (employees only)
  addableModules?: string[]; // module slugs this user can ADD TASKS to
  forcePasswordChange: boolean;
  createdAt: string;
  lastLogin?: string;
}

const DB_KEY = "tm-mis-users-v4";
const PBKDF2_ITERATIONS = 100_000;

// What a brand-new employee can see until admin customises it.
export const DEFAULT_EMPLOYEE_MODULES = ["dashboard", "tasklist", "checklist"];
// By default, employees cannot add tasks anywhere.
export const DEFAULT_ADDABLE_MODULES: string[] = [];

// ── Crypto helpers ──────────────────────────────────────────────────────────

function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password, salt);
  return computed === hash;
}

// ── Storage ─────────────────────────────────────────────────────────────────

function readAll(): UserRecord[] {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(users: UserRecord[]): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(users));
  } catch {
    /* storage unavailable */
  }
}

function generateId(): string {
  return `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Default accounts ─────────────────────────────────────────────────────────

const DEFAULT_DEFS: Array<{
  username: string;
  password: string;
  role: UserRole;
  doerName: string | null;
  canAdd: boolean;
}> = [
  { username: "THIRTYMILESTONES", password: "SAHIL@30", role: "admin",    doerName: null, canAdd: true  },
  { username: "PC",               password: "PC@30",    role: "pc",       doerName: null, canAdd: true  },
  { username: "TM01",             password: "TM@01",    role: "employee", doerName: "PRIYA", canAdd: false },
  { username: "TM02",             password: "TM@02",    role: "employee", doerName: "SHIKHA", canAdd: false },
  { username: "TM03",             password: "TM@03",    role: "employee", doerName: "DEEPAK", canAdd: false },
  { username: "TM04",             password: "TM@04",    role: "employee", doerName: "SAMIR", canAdd: false },
  { username: "TM05",             password: "TM@05",    role: "employee", doerName: "SANDEEP", canAdd: false },
];

/**
 * Initialize default accounts on first launch. Skips existing usernames.
 * Call once at app startup (non-blocking — runs in background).
 */
export async function initDefaultUsers(): Promise<void> {
  const existing = readAll();
  const existingUsernames = new Set(existing.map((u) => u.username));
  const toCreate = DEFAULT_DEFS.filter((d) => !existingUsernames.has(d.username));

  let needsUpdate = false;
  const patched = existing.map((u) => {
    let next = u;
    if (next.doerName === null) {
      const def = DEFAULT_DEFS.find((d) => d.username === next.username);
      if (def && def.doerName) {
        needsUpdate = true;
        next = { ...next, doerName: def.doerName };
      }
    }
    // Back-fill module access for accounts created before module permissions.
    if (next.modules === undefined && next.role === "employee") {
      needsUpdate = true;
      next = { ...next, modules: [...DEFAULT_EMPLOYEE_MODULES] };
    }
    return next;
  });

  if (toCreate.length === 0 && !needsUpdate) return;

  const created: UserRecord[] = await Promise.all(
    toCreate.map(async (def) => {
      const salt = generateSalt();
      const passwordHash = await hashPassword(def.password, salt);
      return {
        id: generateId(),
        username: def.username,
        passwordHash,
        salt,
        role: def.role,
        doerName: def.doerName,
        canAdd: def.canAdd,
        modules: def.role === "employee" ? [...DEFAULT_EMPLOYEE_MODULES] : undefined,
        forcePasswordChange: false, // disabled per user request
        createdAt: new Date().toISOString(),
      };
    })
  );

  writeAll([...patched, ...created]);
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthResult {
  user: UserRecord;
  forcePasswordChange: boolean;
}

export async function loginUser(username: string, password: string): Promise<AuthResult | null> {
  const users = readAll();
  const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) return null;
  const ok = await verifyPassword(password, user.salt, user.passwordHash);
  if (!ok) return null;

  // Update last login
  const updated = users.map((u) => u.id === user.id ? { ...u, lastLogin: new Date().toISOString() } : u);
  writeAll(updated);
  const freshUser = updated.find((u) => u.id === user.id)!;

  return { user: freshUser, forcePasswordChange: freshUser.forcePasswordChange };
}

// ── Password management ──────────────────────────────────────────────────────

export async function changePassword(userId: string, newPassword: string): Promise<boolean> {
  const users = readAll();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return false;

  const salt = generateSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  users[idx] = { ...users[idx], passwordHash, salt, forcePasswordChange: false };
  writeAll(users);
  return true;
}

/**
 * Admin: reset a user's password back to their default.
 * For default accounts: reverts to TM@{role}XX.
 * For doer accounts: reverts to TM@{Name}30.
 */
export async function resetPasswordToDefault(userId: string): Promise<{ newPassword: string } | null> {
  const users = readAll();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;

  let defaultPassword = "";
  if (user.doerName) {
    const name = user.doerName.charAt(0).toUpperCase() + user.doerName.slice(1).toLowerCase();
    defaultPassword = `TM@${name}30`;
  } else {
    const def = DEFAULT_DEFS.find((d) => d.username === user.username);
    defaultPassword = def?.password ?? `TM@${user.username}30`;
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(defaultPassword, salt);
  const updated = users.map((u) => u.id === userId ? { ...u, passwordHash, salt, forcePasswordChange: false } : u);
  writeAll(updated);
  return { newPassword: defaultPassword };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export function getAllUsers(): UserRecord[] {
  return readAll();
}

export function getUserById(id: string): UserRecord | null {
  return readAll().find((u) => u.id === id) ?? null;
}

/**
 * Create a new employee account when admin adds a doer.
 * Username is auto-incremented: TM06, TM07, etc.
 * Default password: TM@06 etc. (no force change).
 */
export async function createDoerAccount(doerName: string): Promise<{ user: UserRecord; password: string }> {
  const users = readAll();

  // Find next TM number
  const nums = users
    .map((u) => u.username)
    .filter((un) => /^TM\d+$/i.test(un))
    .map((un) => parseInt(un.toUpperCase().replace("TM", ""), 10));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const numStr = String(next).padStart(2, "0");
  const username = `TM${numStr}`;
  const password = `TM@${numStr}`;
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const newUser: UserRecord = {
    id: generateId(),
    username,
    passwordHash,
    salt,
    role: "employee",
    doerName: doerName.toUpperCase(),
    canAdd: false,
    modules: [...DEFAULT_EMPLOYEE_MODULES],
    forcePasswordChange: false,
    createdAt: new Date().toISOString(),
  };

  writeAll([...users, newUser]);
  return { user: newUser, password };
}

export function removeUserByDoerName(doerName: string): void {
  const users = readAll();
  writeAll(users.filter((u) => u.doerName?.toUpperCase() !== doerName.toUpperCase()));
}

// ── Module access ─────────────────────────────────────────────────────────────

// The module slugs an account can access. admin/pc are unrestricted (handled by
// the permission layer, which treats an empty list here as "all active modules").
export function getUserModules(userId: string): string[] {
  const u = readAll().find((x) => x.id === userId);
  if (!u) return [];
  if (u.role === "admin" || u.role === "pc") return [];
  return u.modules ?? [...DEFAULT_EMPLOYEE_MODULES];
}

export function setUserModules(userId: string, modules: string[]): void {
  const users = readAll();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return;
  const unique = [...new Set(modules.map((s) => String(s).trim()).filter(Boolean))];
  users[idx] = { ...users[idx], modules: unique };
  writeAll(users);
}

// The module slugs an account is explicitly allowed to add tasks to.
// admin/pc automatically can add anywhere, this is primarily for employees.
export function getUserAddableModules(userId: string): string[] {
  const u = readAll().find((x) => x.id === userId);
  if (!u) return [];
  if (u.role === "admin" || u.role === "pc") return []; // Admins can add anywhere
  return u.addableModules ?? [...DEFAULT_ADDABLE_MODULES];
}

export function setUserAddableModules(userId: string, modules: string[]): void {
  const users = readAll();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return;
  const unique = [...new Set(modules.map((s) => String(s).trim()).filter(Boolean))];
  users[idx] = { ...users[idx], addableModules: unique };
  writeAll(users);
}
