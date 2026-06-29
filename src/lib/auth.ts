// =============================================================================
// auth.ts — per-staff login gate.
//
// FULLY AUTOMATIC SYSTEM:
//   admin  → hardcoded: username "admin" / pass "Sahil@30"
//   PC     → hardcoded: username "PC30"  / pass "PC@30"  (coordinator, sees all)
//   staff  → DYNAMIC:   username "<NAME>30" / pass "<NAME>@30"
//             Verified against the live doers list from Google Sheets.
//             Admin adds a doer via the "Add Doer" modal → doer can log in immediately.
//
// NO MANUAL CODE CHANGES NEEDED TO ADD STAFF.
// =============================================================================

export type Role = "admin" | "staff";

const SALT = "TM-MIS::v1";
const STORE_KEY = "tm-mis-auth";
const VALID_ROLES: Role[] = ["admin", "staff"];

type FixedEntry = { role: Role; doerName: string | null; canAdd?: boolean; userHash: string; passHash: string };

// Only admin + PC are hardcoded. All other staff are verified dynamically.
const FIXED_USERS: FixedEntry[] = [
  // Admin — sees all data + Scoring panel
  {
    role: "admin",
    doerName: null,
    canAdd: true,
    userHash: "b2704bfccee884b6863c95646c1d8761a238236beda3b84bcbfd3842dd2f8f7d",
    passHash: "f78a4ec5830c27cdb3dc454bba42c2dc217906f7f5d5d6b9ce9f6497463c0514",
  },
  // PC — coordinator: sees ALL tasks + can add
  { role: "staff", doerName: null, canAdd: true, userHash: "96b97a8570c7cb5e3c9b2d5818150591c83e592c316c4ce134101674562aa7f7", passHash: "12576ac61d0e971413d1e1979b8407f1b3c7409a5ba73eef1a5ed14228091d5c" },
];

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(SALT + text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type Session = { role: Role; doerName: string | null; canAdd: boolean };

// Verify credentials. First checks hardcoded admin/PC, then dynamically
// checks against the doers list from the Google Sheet.
// doerNames = list of doer name strings from the sheet (e.g. ["SAMIR", "PRIYA", ...])
export async function verifyCredentials(username: string, password: string, doerNames?: string[]): Promise<Session | null> {
  const trimmed = username.trim();
  const [u, p] = await Promise.all([sha256(trimmed), sha256(password)]);

  // 1. Check hardcoded admin/PC accounts
  const fixed = FIXED_USERS.find((x) => x.userHash === u && x.passHash === p);
  if (fixed) {
    return { role: fixed.role, doerName: fixed.doerName, canAdd: !!fixed.canAdd };
  }

  // 2. Dynamic staff verification against the doers list from the sheet.
  //    Pattern: username = "NAME30", password = "NAME@30"
  const upper = trimmed.toUpperCase();
  if (upper.endsWith("30") && password.endsWith("@30")) {
    const nameFromUser = upper.slice(0, -2); // Remove "30" → "SAMIR"
    const nameFromPass = password.toUpperCase().slice(0, -3); // Remove "@30" → "SAMIR"

    // Username and password must refer to the same name
    if (nameFromUser && nameFromUser === nameFromPass) {
      // Check if this name exists in the doers list from the sheet
      if (doerNames && doerNames.length > 0) {
        const found = doerNames.some(
          (d) => String(d || "").trim().toUpperCase() === nameFromUser
        );
        if (found) {
          return { role: "staff", doerName: nameFromUser, canAdd: false };
        }
      }
    }
  }

  return null;
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
