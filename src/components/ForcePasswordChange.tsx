import * as React from "react";
import { Lock, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { changePassword } from "@/lib/userDb";
import { clearForcePasswordChange, type Session } from "@/lib/auth";

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 font-mono text-[11px] uppercase ${ok ? "text-primary-container" : "text-on-surface-variant"}`}>
      {ok ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
      {label}
    </div>
  );
}

export function ForcePasswordChange({
  session,
  onDone,
}: {
  session: Session;
  onDone: (updatedSession: Session) => void;
}) {
  const [newPass, setNewPass] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const hasMin = newPass.length >= 8;
  const hasUpper = /[A-Z]/.test(newPass);
  const hasSpecial = /[@#$!%^&*]/.test(newPass);
  const matches = newPass.length > 0 && newPass === confirm;
  const valid = hasMin && hasUpper && hasSpecial && matches;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setError("");
    setBusy(true);
    try {
      const ok = await changePassword(session.userId, newPass);
      if (!ok) throw new Error("Password update failed.");
      clearForcePasswordChange(session);
      onDone({ ...session, forcePasswordChange: false });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/60 p-4">
      <div className="w-full max-w-sm glass-card overflow-hidden">
        <div className="flex items-center gap-2 border-b-2 border-on-surface bg-surface-container-low px-5 py-4">
          <Lock className="h-4 w-4 text-on-surface" />
          <span className="font-label-sm text-label-sm uppercase text-on-surface">Change Password Required</span>
        </div>

        <div className="p-5 space-y-1 border-b border-outline-variant">
          <p className="font-mono text-data-mono uppercase text-on-surface-variant">
            Pehli baar login pe password change karna zaroori hai.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          {/* New Password */}
          <label className="flex flex-col gap-1.5">
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">New Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                type={showNew ? "text" : "password"}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                autoFocus
                placeholder="Min. 8 chars"
                className="w-full border-2 border-on-surface bg-surface-container-lowest py-2.5 pl-9 pr-9 font-mono text-data-mono outline-none focus:bg-surface-container-low"
              />
              <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {/* Confirm Password */}
          <label className="flex flex-col gap-1.5">
            <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">Confirm Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full border-2 border-on-surface bg-surface-container-lowest py-2.5 pl-9 pr-9 font-mono text-data-mono outline-none focus:bg-surface-container-low"
              />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {/* Rules */}
          {newPass && (
            <div className="space-y-1 border border-outline-variant p-3">
              <PasswordRule ok={hasMin} label="At least 8 characters" />
              <PasswordRule ok={hasUpper} label="One uppercase letter" />
              <PasswordRule ok={hasSpecial} label="One special char (@#$!%^&*)" />
              <PasswordRule ok={matches} label="Passwords match" />
            </div>
          )}

          {error && (
            <div className="border-2 border-error bg-error/5 px-3 py-2 font-label-sm text-label-sm uppercase text-error">{error}</div>
          )}

          <button
            type="submit"
            disabled={!valid || busy}
            className="flex w-full items-center justify-center gap-2 border-2 border-on-surface bg-on-surface py-3 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface disabled:opacity-40"
          >
            <Lock className="h-4 w-4" />
            {busy ? "Saving…" : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
