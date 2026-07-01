// =============================================================================
// supabase.ts — Supabase client (browser).
//
// These two values are PUBLIC and safe to ship in the frontend: the anon key is
// designed to be embedded in clients, and your data is protected by Row-Level
// Security in the database, NOT by hiding this key. The service_role key and the
// database password are secrets and are NEVER used here.
//
// If you ever rotate the anon key, update VITE_SUPABASE_ANON_KEY (or the fallback
// below) and redeploy.
// =============================================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || "https://hbmvtijtzqjbahspgkhe.supabase.co";

// anon (public) key — safe in the browser.
const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhibXZ0aWp0enFqYmFoc3Bna2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4OTY2NzMsImV4cCI6MjA5ODQ3MjY3M30.ueid2Unfr1xb-h5Yp3uL46y6qcE8gPOUfRNA-dMbwAk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
