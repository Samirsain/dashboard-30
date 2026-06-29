import * as React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import { addDoer, removeDoer } from "@/lib/data";

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
  const [doers, setDoers] = React.useState(existingDoers);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim().toUpperCase();
    if (!n) return setError("Doer ka naam daalo.");
    if (!/^[A-Z ]+$/.test(n)) return setError("Sirf English letters use karo.");
    setBusy(true);
    setError("");
    try {
      await addDoer({ name: n, department: dept.trim(), mobile: mobile.trim(), email: email.trim().toLowerCase() });
      setDone({ name: n, username: `${n.replace(/\s+/g, "")}30`, password: `${n.replace(/\s+/g, "")}@30` });
      setDoers((prev) => [...prev, { doer: n, department: dept.trim() }]);
    } catch (err: any) {
      setError(err?.message || "Doer add nahi hua. Dobara try karo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(doerName: string) {
    if (!window.confirm(`Remove "${doerName}" from doers list?`)) return;
    setRemoving(doerName);
    setRemoveError("");
    try {
      await removeDoer({ name: doerName });
      setDoers((prev) => prev.filter((d) => d.doer !== doerName));
    } catch (err: any) {
      setRemoveError(err?.message || "Remove nahi hua. Dobara try karo.");
    } finally {
      setRemoving(null);
    }
  }

  function copyCredentials() {
    if (!done) return;
    navigator.clipboard.writeText(`Username: ${done.username}\nPassword: ${done.password}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const doerList = [...new Set(doers.map((d) => String(d.doer || "").trim()).filter(Boolean))].sort();

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
            <h3 className="font-headline-md text-headline-md uppercase tracking-tight text-on-surface">Manage Doers</h3>
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
              onClick={() => { setTab(t); setDone(null); setError(""); setRemoveError(""); }}
              className={cn(
                "py-2.5 font-label-sm text-label-sm uppercase transition-colors",
                tab === t ? "bg-on-surface text-on-primary" : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {t === "add" ? "Add Doer" : `Manage (${doerList.length})`}
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
                <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Login Credentials — yeh doer ko share karo</p>
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
                <Label>Doer Name</Label>
                <Field value={name} onChange={(e: any) => setName(e.target.value)} placeholder="e.g. RAHUL" autoFocus />
              </label>

              <label className="block">
                <Label>Department (kuch bhi likhein)</Label>
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
                <div className="border-l-4 border-on-surface pl-3 font-mono text-data-mono uppercase text-on-surface-variant text-[11px]">
                  Auto Login → <span className="text-on-surface font-bold">{name.trim().toUpperCase().replace(/\s+/g, "")}30</span>
                  {" / "}
                  <span className="text-on-surface font-bold">{name.trim().toUpperCase().replace(/\s+/g, "")}@30</span>
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
            {removeError && <div className="border-2 border-error bg-error/5 px-3 py-2 font-label-sm text-label-sm uppercase text-error">{removeError}</div>}
            {doerList.length === 0 ? (
              <div className="py-10 text-center font-mono text-data-mono uppercase text-on-surface-variant">Koi doer nahi hai</div>
            ) : (
              <div className="divide-y divide-outline-variant border-2 border-on-surface">
                {doerList.map((d) => {
                  const info = doers.find((x) => x.doer === d);
                  return (
                    <div key={d} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid h-8 w-8 shrink-0 place-items-center border-2 border-on-surface bg-surface-container-lowest font-mono text-data-mono font-bold uppercase text-on-surface">
                          {d[0]}
                        </span>
                        <div className="min-w-0">
                          <div className="font-label-sm text-label-sm font-bold uppercase text-on-surface truncate">{d}</div>
                          {info?.department && (
                            <div className="font-mono text-[10px] uppercase text-on-surface-variant">{info.department}</div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(d)}
                        disabled={removing === d}
                        className="shrink-0 inline-flex items-center gap-1 border-2 border-error px-2.5 py-1 font-label-sm text-label-sm uppercase text-error hover:bg-error hover:text-on-error transition-colors disabled:opacity-50"
                      >
                        <Icon name={removing === d ? "progress_activity" : "person_remove"} className={cn("text-[14px]", removing === d && "animate-spin")} />
                        {removing === d ? "…" : "Remove"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex justify-end pt-2">
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
