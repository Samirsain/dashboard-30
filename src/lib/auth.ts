// =============================================================================
// auth.ts — lightweight client-side login gate with two roles.
//
//   admin  →  username "admin"  / pass "Sahil@30"  → full access incl. Scoring
//   staff  →  username "PC30"   / pass "PC@30"     → normal dashboard only
//
// IMPORTANT (security): this is a STATIC site with no backend, so this gate only
// hides the UI from casual viewers — it is NOT real authentication. Passwords are
// never shipped in plaintext (only salted SHA-256 hashes), but a determined user
// could still read the data endpoint directly. For true protection the data must
// move behind a server that checks a session.
// =============================================================================

export type Role = "admin" | "staff";

const SALT = "TM-MIS::v1";
const STORE_KEY = "tm-mis-auth";
const VALID_ROLES: Role[] = ["admin", "staff"];

// Salted SHA-256 of each account's username + password.
const USERS: { role: Role; userHash: string; passHash: string }[] = [
  {
    role: "admin", // admin / Sahil@30
    userHash: "b2704bfccee884b6863c95646c1d8761a238236beda3b84bcbfd3842dd2f8f7d",
    passHash: "f78a4ec5830c27cdb3dc454bba42c2dc217906f7f5d5d6b9ce9f6497463c0514",
  },
  {
    role: "staff", // PC30 / PC@30
    userHash: "96b97a8570c7cb5e3c9b2d5818150591c83e592c316c4ce134101674562aa7f7",
    passHash: "12576ac61d0e971413d1e1979b8407f1b3c7409a5ba73eef1a5ed14228091d5c",
  },
];

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(SALT + text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Returns the matched role, or null if the credentials are wrong.
export async function verifyCredentials(username: string, password: string): Promise<Role | null> {
  const [u, p] = await Promise.all([sha256(username.trim()), sha256(password)]);
  const match = USERS.find((x) => x.userHash === u && x.passHash === p);
  return match ? match.role : null;
}

export function currentRole(): Role | null {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return v && VALID_ROLES.includes(v as Role) ? (v as Role) : null;
  } catch {
    return null;
  }
}

export function isAuthed(): boolean {
  return currentRole() !== null;
}

export function isAdmin(): boolean {
  return currentRole() === "admin";
}

export function setSession(role: Role): void {
  try {
    localStorage.setItem(STORE_KEY, role);
  } catch {
    /* storage unavailable — session stays in-memory only */
  }
}

export function logout(): void {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}
