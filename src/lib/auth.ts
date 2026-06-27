// =============================================================================
// auth.ts — per-staff login gate.
//
//   admin  → username "admin"    / pass "Sahil@30"  → all tasks + Scoring panel
//   staff  → individual accounts → sees ONLY their own tasks
//
// CREDENTIAL FORMAT FOR STAFF
// ────────────────────────────
//   Username : <NAME>30     e.g.  SAMIR30,  PC30,  RAHUL30
//   Password : <NAME>@30    e.g.  SAMIR@30, PC@30, RAHUL@30
//
// HOW TO ADD A STAFF MEMBER
// ─────────────────────────
// 1. Open browser console on the deployed site and run:
//      async function h(s){const b=new TextEncoder().encode("TM-MIS::v1"+s);const d=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
//      console.log(await h("SAMIR30"), await h("SAMIR@30"))
// 2. Copy the two hashes and add a new entry in the USERS array below:
//      { role:"staff", doerName:"Samir", userHash:"<first hash>", passHash:"<second hash>" }
//
// doerName must exactly match (case-insensitive) the "Doer" column in Google Sheets.
// Set doerName to null to let that account see ALL tasks (e.g. manager-level access).
// =============================================================================

export type Role = "admin" | "staff";

const SALT = "TM-MIS::v1";
const STORE_KEY = "tm-mis-auth";
const VALID_ROLES: Role[] = ["admin", "staff"];

type UserEntry = { role: Role; doerName: string | null; userHash: string; passHash: string };

const USERS: UserEntry[] = [
  {
    role: "admin",
    doerName: null, // admin sees everything
    userHash: "b2704bfccee884b6863c95646c1d8761a238236beda3b84bcbfd3842dd2f8f7d",
    passHash: "f78a4ec5830c27cdb3dc454bba42c2dc217906f7f5d5d6b9ce9f6497463c0514",
  },
  {
    role: "staff",
    doerName: null, // PC30 — set to their exact Sheet name once known, e.g. "PC" or "Priya C"
    userHash: "96b97a8570c7cb5e3c9b2d5818150591c83e592c316c4ce134101674562aa7f7",
    passHash: "12576ac61d0e971413d1e1979b8407f1b3c7409a5ba73eef1a5ed14228091d5c",
  },
  // ── Add more staff below ──────────────────────────────────────────────────
  // { role: "staff", doerName: "Rahul Sharma", userHash: "...", passHash: "..." },
  // { role: "staff", doerName: "Priya Singh",  userHash: "...", passHash: "..." },
];

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(SALT + text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type Session = { role: Role; doerName: string | null };

// Returns matched { role, doerName } or null if credentials are wrong.
export async function verifyCredentials(username: string, password: string): Promise<Session | null> {
  const [u, p] = await Promise.all([sha256(username.trim()), sha256(password)]);
  const match = USERS.find((x) => x.userHash === u && x.passHash === p);
  if (!match) return null;
  return { role: match.role, doerName: match.doerName };
}

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && VALID_ROLES.includes(parsed.role)) {
      return { role: parsed.role as Role, doerName: parsed.doerName ?? null };
    }
  } catch {
    // backward compat: old sessions stored the role string directly
    if (VALID_ROLES.includes(raw as Role)) return { role: raw as Role, doerName: null };
  }
  return null;
}

export function currentSession(): Session | null {
  try {
    return parseSession(localStorage.getItem(STORE_KEY));
  } catch {
    return null;
  }
}

export function currentRole(): Role | null {
  return currentSession()?.role ?? null;
}

export function currentDoerName(): string | null {
  return currentSession()?.doerName ?? null;
}

export function isAuthed(): boolean {
  return currentRole() !== null;
}

export function isAdmin(): boolean {
  return currentRole() === "admin";
}

export function setSession(session: Session): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable */
  }
}

export function logout(): void {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}
