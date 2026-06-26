import * as React from "react";
import { Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import { BRAND } from "@/lib/config";
import { verifyCredentials, setSession } from "@/lib/auth";

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const role = await verifyCredentials(username, password);
    if (role) {
      setSession(role);
      onSuccess();
    } else {
      setError("Invalid username or password. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center border-2 border-on-surface bg-on-surface font-mono text-lg font-bold text-on-primary">
            30
          </span>
          <div className="leading-tight">
            <h1 className="font-headline-md text-headline-md font-bold uppercase tracking-tighter text-on-surface">{BRAND.name}</h1>
            <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Enterprise RE MIS</p>
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-2 border-b-2 border-on-surface bg-surface-container-low px-5 py-3">
            <Lock className="h-4 w-4 text-on-surface" />
            <span className="font-label-sm text-label-sm uppercase text-on-surface">Secure Login</span>
          </div>

          <form onSubmit={submit} className="space-y-4 p-5">
            <label className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">Username</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                  className="w-full border-2 border-on-surface bg-surface-container-lowest py-2.5 pl-9 pr-3 font-mono text-data-mono uppercase outline-none focus:bg-surface-container-low"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full border-2 border-on-surface bg-surface-container-lowest py-2.5 pl-9 pr-9 font-mono text-data-mono outline-none focus:bg-surface-container-low"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <div className="border-2 border-error bg-error/5 px-3 py-2 font-label-sm text-label-sm uppercase text-error">{error}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 border-2 border-on-surface bg-on-surface py-3 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {busy ? "Verifying…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-4 border-l-4 border-on-surface px-3 font-label-sm text-label-sm uppercase text-on-surface-variant">
          Authorised staff only. Admin sees scoring; staff sees the dashboard.
        </p>
      </div>
    </div>
  );
}
