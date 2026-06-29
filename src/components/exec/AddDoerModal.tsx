import * as React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import { addDoer, removeDoer } from "@/lib/data";
import { createDoerAccount, getAllUsers, removeUserByDoerName, resetPasswordToDefault, type UserRecord } from "@/lib/userDb";

type Tab = "add" | "manage";

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block font-label-sm text-label-sm uppercase text-on-surface-variant">{children}</span>;
}

function Field({ as, className, ...props }: any) {
  const cls =
    "w-full border-2 border-on-surface bg-surface-container-lowest px-3 py-2.5 font-mono text-data-mono uppercase text-on-surface outline-none focus:bg-surface-container-low";
  if (as === "select") return <select className={cn(cls, className)} {...props} />;
  return <input className={cn(cls, className)} {...props} />;
}

export function AddDoerModal({
  onClose,
  existingDoers = [],
}: {
  onClose: () => void;
  existingDoers?: { doer: string; department?: string }[];
}) {
  const [tab, setTab] = React.useState<Tab>("add");

  // Add form state
  const [name, setName] = React.useState("");
  const [dept, setDept] = React.useState("");
  const [mobile, setMobile] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [done, setDone] = React.useState<{ name: string; username: string; password: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Manage state
  const [removing, setRemoving] = React.useState<string | null>(null);
  const [removeError, setRemoveError] = React.useState("");
  const [resetResult, setResetResult] = React.useState<{ username: string; newPass: string } | null>(null);
  const [dbUsers, setDbUsers] = React.useState<UserRecord[]>(() => getAllUsers());

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Determine next username and password preview
  const nextUsername = React.useMemo(() => {
    const nums = dbUsers
      .map((u) => u.username)
      .filter((un) => /^tmemp\d+$/.test(un))
      .map((un) => parseInt(un.replace("tmemp", ""), 10));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    return `tmemp${String(next).padStart(2, "0")}`;
  }, [dbUsers]);

  const passwordPreview = React.useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed) return "";
    const cap = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    return `TM@${cap.replace(/\s+/g, "")}30`;
  }, [name]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim().toUpperCase();
    if (!n) return setError("Doer ka naam daalo.");
    if (!/^[A-Z ]+$/.test(n)) return setError("Sirf English letters use karo.");
    setBusy(true);
    setError("");
    try {
      // 1. Create user account locally with PBKDF2 hash in userDb
      const account = await createDoerAccount(n);

      // 2. Save to Google Sheet (with username + plaintext password so admin can reference)
      await addDoer({
        name: n,
        department: dept.trim(),
        mobile: mobile.trim(),
        email: email.trim().toLowerCase(),
        username: account.user.username,
        password: account.password, // default password — user must change on first login
      });

      setDone({ name: n, username: account.user.username, password: account.password });
      setDbUsers(getAllUsers());
    } catch (err: any) {
      setError(err?.message || "Doer add nahi hua. Dobara try karo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(user: UserRecord) {
    if (!window.confirm(`Remove user "${user.username}" (${user.doerName || "PC"})?`)) return;
    setRemoving(user.id);
    setRemoveError("");
    try {
      // If it's linked to a Google Sheets doer, remove from Google Sheets too
      if (user.doerName) {
        await removeDoer({ name: user.doerName });
        removeUserByDoerName(user.doerName);
      }
      setDbUsers(getAllUsers());
    } catch (err: any) {
      setRemoveError(err?.message || "Remove nahi hua. Dobara try karo.");
    } finally {
      setRemoving(null);
    }
  }

  async function handleReset(user: UserRecord) {
    if (!window.confirm(`Reset password for "${user.username}" back to default?`)) return;
    setResetResult(null);
    const res = await resetPasswordToDefault(user.id);
    if (res) {
      setResetResult({ username: user.username, newPass: res.newPassword });
      setDbUsers(getAllUsers());
    } else {
      setRemoveError("Password reset failed.");
    }
  }

  function copyCredentials() {
    if (!done) return;
    navigator.clipboard.writeText(`Username: ${done.username}\nPassword: ${done.password}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function copyResetPassword() {
    if (!resetResult) return;
    navigator.clipboard.writeText(resetResult.newPass).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-card max-h-[92vh] w-full max-w-lg overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b-2 border-on-surface bg-surface-container-low px-5 py-4">
          <div className="flex items-center gap-2">
            <Icon name="manage_accounts" className="text-[22px] text-on-surface" />
            <h3 className="font-headline-md text-headline-md uppercase tracking-tight text-on-surface">Manage Doers & Users</h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center border-2 border-on-surface text-on-surface transition-colors hover:bg-on-surface hover:text-on-primary" aria-label="Close">
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b-2 border-on-surface">
          {(["add", "manage"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setDone(null); setError(""); setRemoveError(""); setResetResult(null); }}
              className={cn(
                "py-2.5 font-label-sm text-label-sm uppercase transition-colors",
                tab === t ? "bg-on-surface text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {t === "add" ? "Add Doer" : `Manage Users (${dbUsers.length - 1})`}
            </button>
          ))}
        </div>

        {/* ADD TAB */}
        {tab === "add" && (
          done ? (
            <div className="space-y-5 p-5">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <span className="grid h-12 w-12 place-items-center border-2 border-primary-container bg-primary-container text-on-primary">
                  <Icon name="check" className="text-[24px]" />
                </span>
                <div className="font-headline-md text-headline-md uppercase text-on-surface">Doer Added!</div>
                <p className="font-mono text-data-mono uppercase text-on-surface-variant">{done.name} ab login kar sakta hai</p>
              </div>
              <div className="border-2 border-on-surface bg-surface-container-low p-4 space-y-3">
                <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Login Credentials — doer ko share karein</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-1">Username</p>
                    <p className="font-mono text-data-mono font-bold text-on-surface bg-surface-container-lowest border border-on-surface px-2 py-1.5">{done.username}</p>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-1">Password</p>
                    <p className="font-mono text-data-mono font-bold text-on-surface bg-surface-container-lowest border border-on-surface px-2 py-1.5">{done.password}</p>
                  </div>
                </div>
                <button
                  onClick={copyCredentials}
                  className={cn("w-full flex items-center justify-center gap-1.5 border-2 px-3 py-2 font-label-sm text-label-sm uppercase transition-colors",
                    copied ? "border-primary-container bg-primary-container text-on-primary" : "border-on-surface text-on-surface hover:bg-on-surface hover:text-on-primary"
                  )}
                >
                  <Icon name={copied ? "check" : "content_copy"} className="text-[16px]" />
                  {copied ? "Copied!" : "Copy Credentials"}
                </button>
              </div>
              <div className="flex justify-end gap-2 border-t-2 border-on-surface pt-4">
                <button onClick={() => { setDone(null); setName(""); setDept(""); setMobile(""); setEmail(""); }}
                  className="border-2 border-on-surface px-4 py-2.5 font-label-sm text-label-sm uppercase text-on-surface hover:bg-surface-container transition-colors">
                  Add Another
                </button>
                <button onClick={onClose}
                  className="border-2 border-on-surface bg-on-surface px-5 py-2.5 font-label-sm text-label-sm uppercase text-on-primary hover:bg-surface hover:text-on-surface transition-colors">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4 p-5">
              <label className="block">
                <Label>Doer Name (sirf alphabets)</Label>
                <Field value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. RAHUL" autoFocus />
              </label>

              <label className="block">
                <Label>Department</Label>
                <Field value={dept} onChange={(e: any) => setDept(e.target.value)} placeholder="e.g. Sales, Finance, HR..." />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <Label>Mobile</Label>
                  <Field type="tel" value={mobile} onChange={(e: any) => setMobile(e.target.value)} placeholder="9876543210" />
                </label>
                <label className="block">
                  <Label>Email</Label>
                  <Field type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="rahul@abc.com" className="!normal-case" />
                </label>
              </div>

              {name.trim() && (
                <div className="border-l-4 border-on-surface pl-3 font-mono text-data-mono uppercase text-on-surface-variant text-[11px] space-y-1">
                  <div>Auto Username: <span className="text-on-surface font-bold">{nextUsername}</span></div>
                  <div>Auto Password: <span className="text-on-surface font-bold">{passwordPreview}</span></div>
                  <div className="text-[10px] text-error font-medium">Note: User must change password on first login.</div>
                </div>
              )}

              {error && <div className="border-2 border-error bg-error/5 px-3 py-2 font-label-sm text-label-sm uppercase text-error">{error}</div>}

              <div className="flex items-center justify-end gap-2 border-t-2 border-on-surface pt-4">
                <button type="button" onClick={onClose} className="border-2 border-on-surface px-4 py-2.5 font-label-sm text-label-sm uppercase text-on-surface transition-colors hover:bg-surface-container">Cancel</button>
                <button type="submit" disabled={busy} className="inline-flex items-center gap-2 border-2 border-on-surface bg-on-surface px-5 py-2.5 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface disabled:opacity-50">
                  <Icon name={busy ? "progress_activity" : "person_add"} className={cn("text-[18px]", busy && "animate-spin")} />
                  {busy ? "Adding…" : "Add Doer"}
                </button>
              </div>
            </form>
          )
        )}

        {/* MANAGE TAB */}
        {tab === "manage" && (
          <div className="p-5 space-y-3">
            {resetResult && (
              <div className="border-2 border-primary-container bg-primary-container/10 p-3 space-y-2">
                <div className="font-label-sm text-label-sm uppercase text-primary-container font-bold">Password Reset Successful</div>
                <div className="font-mono text-xs text-on-surface">
                  Username: <span className="font-bold">{resetResult.username}</span><br />
                  New Password: <span className="font-bold">{resetResult.newPass}</span>
                </div>
                <button
                  onClick={copyResetPassword}
                  className="w-full flex items-center justify-center gap-1.5 border border-on-surface px-2 py-1 font-label-sm text-[11px] uppercase transition-colors hover:bg-on-surface hover:text-on-primary"
                >
                  <Icon name={copied ? "check" : "content_copy"} className="text-[12px]" />
                  {copied ? "Copied Password" : "Copy Password"}
                </button>
              </div>
            )}

            {removeError && <div className="border-2 border-error bg-error/5 px-3 py-2 font-label-sm text-label-sm uppercase text-error">{removeError}</div>}
            
            {dbUsers.filter(u => u.role !== "admin").length === 0 ? (
              <div className="py-10 text-center font-mono text-data-mono uppercase text-on-surface-variant">Koi users nahi hai</div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto divide-y divide-outline-variant border-2 border-on-surface">
                {dbUsers
                  .filter((u) => u.role !== "admin")
                  .map((u) => {
                    const matchedSheetsDoer = existingDoers.find((x) => x.doer.toUpperCase() === u.doerName?.toUpperCase());
                    return (
                      <div key={u.id} className="flex items-center justify-between gap-2 px-4 py-3 bg-surface-container-lowest">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-label-sm text-label-sm font-bold uppercase text-on-surface">{u.username}</span>
                            <span className="text-[10px] font-mono px-1 border border-outline text-on-surface-variant uppercase">{u.role}</span>
                          </div>
                          {u.doerName && (
                            <div className="font-mono text-[11px] text-on-surface-variant uppercase mt-0.5">
                              Doer: {u.doerName} {matchedSheetsDoer?.department ? `(${matchedSheetsDoer.department})` : ""}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleReset(u)}
                            className="inline-flex items-center gap-1 border-2 border-on-surface px-2 py-1 font-label-sm text-[11px] uppercase text-on-surface hover:bg-on-surface hover:text-on-primary transition-colors"
                            title="Reset password to default"
                          >
                            <Icon name="lock_reset" className="text-[14px]" />
                            Reset
                          </button>
                          <button
                            onClick={() => handleRemove(u)}
                            disabled={removing === u.id}
                            className="inline-flex items-center gap-1 border-2 border-error px-2 py-1 font-label-sm text-[11px] uppercase text-error hover:bg-error hover:text-on-error transition-colors disabled:opacity-50"
                            title="Delete this user"
                          >
                            <Icon name={removing === u.id ? "progress_activity" : "person_remove"} className={cn("text-[14px]", removing === u.id && "animate-spin")} />
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
            <div className="flex justify-end pt-2 border-t-2 border-on-surface">
              <button onClick={onClose} className="border-2 border-on-surface bg-on-surface px-5 py-2.5 font-label-sm text-label-sm uppercase text-on-primary hover:bg-surface hover:text-on-surface transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
