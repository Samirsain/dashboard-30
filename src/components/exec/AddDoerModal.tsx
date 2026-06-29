import * as React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";
import { addDoer } from "@/lib/data";

const SALT = "TM-MIS::v1";
const DEPARTMENTS = ["EA", "HR", "MIS", "PS", "SUPERVISOR", "OTHER"];

async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(SALT + text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block font-label-sm text-label-sm uppercase text-on-surface-variant">{children}</span>;
}

function Field({ as, className, ...props }: any) {
  const cls =
    "w-full border-2 border-on-surface bg-surface-container-lowest px-3 py-2.5 font-mono text-data-mono uppercase text-on-surface outline-none focus:bg-surface-container-low";
  if (as === "select") return <select className={cn(cls, className)} {...props} />;
  return <input className={cn(cls, className)} {...props} />;
}

export function AddDoerModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = React.useState("");
  const [dept, setDept] = React.useState("MIS");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState<{
    username: string;
    password: string;
    userHash: string;
    passHash: string;
    codeEntry: string;
  } | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim().toUpperCase();
    if (!n) return setError("Doer ka naam daalo.");
    if (!/^[A-Z]+$/.test(n)) return setError("Sirf English letters use karo (koi space/number nahi).");
    setBusy(true);
    setError("");
    try {
      const username = `${n}30`;
      const password = `${n}@30`;
      const [userHash, passHash] = await Promise.all([sha256(username), sha256(password)]);
      const codeEntry = `  { role: "staff", doerName: "${n}", userHash: "${userHash}", passHash: "${passHash}" },`;
      setResult({ username, password, userHash, passHash, codeEntry });

      // Also try to add to the live Google Sheet doers list
      try {
        await addDoer({ name: n, department: dept });
      } catch {
        // Sheet write failed — not critical, credentials are still generated
      }
    } catch (err: any) {
      setError(err?.message || "Hash generate nahi hua. Dobara try karo.");
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.codeEntry).then(() => {
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
            <Icon name="person_add" className="text-[22px] text-on-surface" />
            <h3 className="font-headline-md text-headline-md uppercase tracking-tight text-on-surface">Add Doer</h3>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center border-2 border-on-surface text-on-surface transition-colors hover:bg-on-surface hover:text-on-primary"
            aria-label="Close"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>

        {result ? (
          <div className="space-y-5 p-5">
            {/* Credentials display */}
            <div className="border-2 border-on-surface bg-surface-container-low p-4 space-y-3">
              <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">Login Credentials</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-1">Username</p>
                  <p className="font-mono text-data-mono font-bold text-on-surface bg-surface-container-lowest border border-on-surface px-2 py-1">{result.username}</p>
                </div>
                <div>
                  <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-1">Password</p>
                  <p className="font-mono text-data-mono font-bold text-on-surface bg-surface-container-lowest border border-on-surface px-2 py-1">{result.password}</p>
                </div>
              </div>
            </div>

            {/* Code entry */}
            <div>
              <p className="font-label-sm text-label-sm uppercase text-on-surface-variant mb-2">
                Yeh line <span className="font-bold text-on-surface">auth.ts</span> ke USERS array mein paste karo:
              </p>
              <div className="relative">
                <pre className="overflow-x-auto whitespace-pre-wrap break-all border-2 border-on-surface bg-surface-container-lowest p-3 font-mono text-[11px] text-on-surface leading-relaxed">
                  {result.codeEntry}
                </pre>
                <button
                  onClick={copy}
                  className={cn(
                    "absolute right-2 top-2 flex items-center gap-1 border px-2 py-1 font-label-sm text-label-sm uppercase transition-colors",
                    copied
                      ? "border-primary-container bg-primary-container text-on-primary"
                      : "border-on-surface bg-surface text-on-surface hover:bg-on-surface hover:text-on-primary"
                  )}
                >
                  <Icon name={copied ? "check" : "content_copy"} className="text-[14px]" />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div className="border-l-4 border-on-surface pl-3 font-mono text-data-mono uppercase text-on-surface-variant">
              Credentials user ko de do. Auth.ts update ke baad redeploy zaroor karo.
            </div>

            <div className="flex justify-end gap-2 border-t-2 border-on-surface pt-4">
              <button
                onClick={() => { setResult(null); setName(""); setDept("MIS"); }}
                className="border-2 border-on-surface px-4 py-2.5 font-label-sm text-label-sm uppercase text-on-surface hover:bg-surface-container transition-colors"
              >
                Add Another
              </button>
              <button
                onClick={onClose}
                className="border-2 border-on-surface bg-on-surface px-5 py-2.5 font-label-sm text-label-sm uppercase text-on-primary hover:bg-surface hover:text-on-surface transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={generate} className="space-y-4 p-5">
            <label className="block">
              <Label>Doer Name (sirf English letters)</Label>
              <Field
                value={name}
                onChange={(e: any) => setName(e.target.value)}
                placeholder="e.g. RAHUL"
                autoFocus
              />
              {name.trim() && (
                <p className="mt-1 font-mono text-data-mono uppercase text-on-surface-variant">
                  Username: <span className="text-on-surface font-bold">{name.trim().toUpperCase()}30</span>
                  {" "}· Password: <span className="text-on-surface font-bold">{name.trim().toUpperCase()}@30</span>
                </p>
              )}
            </label>

            <label className="block">
              <Label>Department</Label>
              <Field as="select" value={dept} onChange={(e: any) => setDept(e.target.value)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </Field>
            </label>

            {error && (
              <div className="border-2 border-error bg-error/5 px-3 py-2 font-label-sm text-label-sm uppercase text-error">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t-2 border-on-surface pt-4">
              <button
                type="button"
                onClick={onClose}
                className="border-2 border-on-surface px-4 py-2.5 font-label-sm text-label-sm uppercase text-on-surface transition-colors hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 border-2 border-on-surface bg-on-surface px-5 py-2.5 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface disabled:opacity-50"
              >
                <Icon name={busy ? "progress_activity" : "person_add"} className={cn("text-[18px]", busy && "animate-spin")} />
                {busy ? "Generating…" : "Generate Credentials"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
