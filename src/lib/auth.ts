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
// Set doerName to null to let that account see ALL tasks (manager/coordinator).
// canAdd = true lets the account create tasks (admin + PC only).
//
//   admin → doerName null (sees all) + Scoring panel + canAdd
//   PC    → doerName null (sees all, NOT a doer)        + canAdd, no Scoring
//   staff → doerName set (their own tasks only),          cannot add
// =============================================================================

export type Role = "admin" | "staff";

const SALT = "TM-MIS::v1";
const STORE_KEY = "tm-mis-auth";
const VALID_ROLES: Role[] = ["admin", "staff"];

type UserEntry = { role: Role; doerName: string | null; canAdd?: boolean; userHash: string; passHash: string };

const USERS: UserEntry[] = [
  // ── Admin — sees all data + Scoring panel ─────────────────────────────────
  {
    role: "admin",
    doerName: null,
    canAdd: true,
    userHash: "b2704bfccee884b6863c95646c1d8761a238236beda3b84bcbfd3842dd2f8f7d",
    passHash: "f78a4ec5830c27cdb3dc454bba42c2dc217906f7f5d5d6b9ce9f6497463c0514",
  },
  // ── PC — coordinator: NOT in the doer list, so sees ALL tasks + can add ────
  { role: "staff", doerName: null, canAdd: true, userHash: "96b97a8570c7cb5e3c9b2d5818150591c83e592c316c4ce134101674562aa7f7", passHash: "12576ac61d0e971413d1e1979b8407f1b3c7409a5ba73eef1a5ed14228091d5c" },
  // ── Doers — username: NAME30 / password: NAME@30 — see ONLY their own tasks ─
  { role: "staff", doerName: "SAMIR",   userHash: "6f07561bbb2e3565b7bc139f0dca7b767c708434625c667d16a6d91c80e05918", passHash: "a688bc402668207ba4c1f05c3ca7438fbe9b8b52bdca0f7b66dd3f8759115312" },
  { role: "staff", doerName: "PRIYA",   userHash: "95553bd009986bc0b7515032b46084c608c5b925ed1dbaac1144f5bb8e553d81", passHash: "0b85fd02b9ec0d83fa86b5c4df82e136ad5ddb1b34db639b6e884519f48dd2cf" },
  { role: "staff", doerName: "SHIKHA",  userHash: "a1031f751ce2113a5bbd0acf811848d189083652d1538a7504997690c5adeccb",  passHash: "73c981c0e8bb0abff41e52604eec13d2d89c80488178b8238d2a594ac9243af2" },
  { role: "staff", doerName: "SANDEEP", userHash: "2810a67427bb87500077167f731fe1a8fcbcbac47d4289a94fbd0777bae0743b", passHash: "61e551a4eb699f40e96c1b5e6d93cbc58c5db0514b7b5a95a526210afed0f64c" },
  { role: "staff", doerName: "DEEPAK",  userHash: "91366fa822af36f7aa75180d0de211a979f9846f96696e780110bbdf5dd60be1", passHash: "420f96fe22d82d66e8a6c173210bf9c9cf5edeaac4d93b42abd4cfd6129838ec" },
  { role: "staff", doerName: "DRIVER",  userHash: "57e44fd38b84310bce5c940669e64ea24553769b4859c13fbb83e12ade62be03", passHash: "ea6d91849148f52f2503c87f00960800f692dad82c7777bc5d4887c7cd205bb7" },
];

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(SALT + text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type Session = { role: Role; doerName: string | null; canAdd: boolean };

// Returns matched session or null if credentials are wrong.
export async function verifyCredentials(username: string, password: string): Promise<Session | null> {
  const [u, p] = await Promise.all([sha256(username.trim()), sha256(password)]);
  const match = USERS.find((x) => x.userHash === u && x.passHash === p);
  if (!match) return null;
  return { role: match.role, doerName: match.doerName, canAdd: !!match.canAdd };
}

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && VALID_ROLES.includes(parsed.role)) {
      return { role: parsed.role as Role, doerName: parsed.doerName ?? null, canAdd: !!parsed.canAdd };
    }
  } catch {
    // backward compat: old sessions stored the role string directly
    if (VALID_ROLES.includes(raw as Role)) return { role: raw as Role, doerName: null, canAdd: raw === "admin" };
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

// Can this account create tasks? (admin + PC coordinator)
export function currentCanAdd(): boolean {
  return currentSession()?.canAdd ?? false;
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
