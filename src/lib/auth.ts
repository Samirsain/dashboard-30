// =============================================================================
// auth.ts — lightweight client-side gate for the admin dashboard.
//
// IMPORTANT (security): this is a STATIC site with no backend, so this gate only
// hides the UI from casual viewers — it is NOT real authentication. The password
// is never stored in plaintext (only a salted SHA-256 hash is shipped), but a
// determined user could still bypass the gate or call the data endpoint directly.
// For true protection the data must move behind a server that checks a session.
// =============================================================================

const SALT = "TM-MIS::v1";
const STORE_KEY = "tm-mis-auth";
const TOKEN = "ok:v1";

// Salted SHA-256 of the allowed credentials (admin / Sahil@30).
const USER_HASH = "b2704bfccee884b6863c95646c1d8761a238236beda3b84bcbfd3842dd2f8f7d";
const PASS_HASH = "f78a4ec5830c27cdb3dc454bba42c2dc217906f7f5d5d6b9ce9f6497463c0514";

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(SALT + text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const [u, p] = await Promise.all([sha256(username.trim()), sha256(password)]);
  return u === USER_HASH && p === PASS_HASH;
}

export function isAuthed(): boolean {
  try {
    return localStorage.getItem(STORE_KEY) === TOKEN;
  } catch {
    return false;
  }
}

export function setAuthed(): void {
  try {
    localStorage.setItem(STORE_KEY, TOKEN);
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
