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
  forcePasswordChange: boolean;
  createdAt: string;
  lastLogin?: string;
}

const DB_KEY = "tm-mis-users-v2";
const PBKDF2_ITERATIONS = 100_000;

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
  { username: "admin",   password: "TM@Admin30", role: "admin",    doerName: null, canAdd: true  },
  { username: "pc",      password: "TM@PC30",    role: "pc",       doerName: null, canAdd: true  },
  { username: "tmemp01", password: "TM@Emp01",   role: "employee", doerName: null, canAdd: false },
  { username: "tmemp02", password: "TM@Emp02",   role: "employee", doerName: null, canAdd: false },
  { username: "tmemp03", password: "TM@Emp03",   role: "employee", doerName: null, canAdd: false },
  { username: "tmemp04", password: "TM@Emp04",   role: "employee", doerName: null, canAdd: false },
  { username: "tmemp05", password: "TM@Emp05",   role: "employee", doerName: null, canAdd: false },
];

/**
 * Initialize default accounts on first launch. Skips existing usernames.
 * Call once at app startup (non-blocking — runs in background).
 */
export async function initDefaultUsers(): Promise<void> {
  const existing = readAll();
  const existingUsernames = new Set(existing.map((u) => u.username));
  const toCreate = DEFAULT_DEFS.filter((d) => !existingUsernames.has(d.username));
  if (toCreate.length === 0) return;

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
        forcePasswordChange: true, // everyone must change on first login
        createdAt: new Date().toISOString(),
      };
    })
  );

  writeAll([...existing, ...created]);
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
  const updated = users.map((u) => u.id === userId ? { ...u, passwordHash, salt, forcePasswordChange: true } : u);
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
 * Username is auto-incremented: tmemp06, tmemp07, etc.
 * Default password: TM@{Name}30 (force change on first login).
 */
export async function createDoerAccount(doerName: string): Promise<{ user: UserRecord; password: string }> {
  const users = readAll();

  // Find next tmemp number
  const nums = users
    .map((u) => u.username)
    .filter((un) => /^tmemp\d+$/.test(un))
    .map((un) => parseInt(un.replace("tmemp", ""), 10));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  const username = `tmemp${String(next).padStart(2, "0")}`;

  const name = doerName.charAt(0).toUpperCase() + doerName.slice(1).toLowerCase();
  const password = `TM@${name}30`;
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
    forcePasswordChange: true,
    createdAt: new Date().toISOString(),
  };

  writeAll([...users, newUser]);
  return { user: newUser, password };
}

export function removeUserByDoerName(doerName: string): void {
  const users = readAll();
  writeAll(users.filter((u) => u.doerName?.toUpperCase() !== doerName.toUpperCase()));
}
