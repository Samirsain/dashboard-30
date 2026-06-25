import * as React from "react";
import { Lock, User, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND } from "@/lib/config";
import { verifyCredentials, setAuthed } from "@/lib/auth";

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
    const ok = await verifyCredentials(username, password);
    if (ok) {
      setAuthed();
      onSuccess();
    } else {
      setError("Galat username ya password. Dobara try karein.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10 font-display text-2xl font-bold text-primary shadow-glow">
            30
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">{BRAND.name}</h1>
          <p className="text-[0.7rem] uppercase tracking-[0.2em] text-primary/80">{BRAND.tagline}</p>
        </div>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Admin Login
          </div>

          <form onSubmit={submit} className="space-y-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">Username</span>
              <div className="relative">
                <User className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                  className="pl-8"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">Password</span>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="px-8"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && <div className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{error}</div>}

            <Button type="submit" disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              {busy ? "Checking…" : "Login"}
            </Button>
          </form>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Sirf authorised staff. Scoring login ke baad hi dikhega.
        </p>
      </div>
    </div>
  );
}
