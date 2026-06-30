import * as React from "react";
import { Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "./Icon";
import {
  getConnections,
  addConnection,
  removeConnection,
  toggleConnection,
  type SheetConnection,
  type SheetType,
} from "@/lib/sheets";
import { testSheetConnection } from "@/lib/data.js";
import { APPS_SCRIPT_URL } from "@/lib/config.js";

// ── Small helper components ──────────────────────────────────────────────────

function Badge({ type }: { type: SheetType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[10px] uppercase",
        type === "tasklist"
          ? "border-on-surface bg-surface-container text-on-surface"
          : "border-on-surface/40 bg-surface text-on-surface-variant"
      )}
    >
      <Icon name={type === "tasklist" ? "assignment" : "checklist"} className="text-[12px]" />
      {type === "tasklist" ? "Task List" : "Checklist"}
    </span>
  );
}

function Toggle({ active, onChange }: { active: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative h-5 w-9 shrink-0 border-2 border-on-surface transition-colors",
        active ? "bg-on-surface" : "bg-surface"
      )}
      aria-label={active ? "Disable connection" : "Enable connection"}
    >
      <span
        className={cn(
          "absolute top-[1px] h-3 w-3 transition-transform",
          active ? "translate-x-4 bg-surface" : "translate-x-[1px] bg-on-surface"
        )}
      />
    </button>
  );
}

// ── Connection card ──────────────────────────────────────────────────────────

function ConnectionCard({
  conn,
  onToggle,
  onDelete,
}: {
  conn: SheetConnection;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  return (
    <div
      className={cn(
        "flex items-start gap-4 border-2 border-on-surface bg-surface p-4 transition-opacity",
        !conn.active && "opacity-50"
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center border border-on-surface/30 bg-surface-container text-on-surface">
        <Icon
          name={conn.sheetType === "tasklist" ? "assignment" : "checklist"}
          className="text-[20px]"
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-label-sm text-label-sm font-bold uppercase text-on-surface">
            {conn.name}
          </span>
          <Badge type={conn.sheetType} />
        </div>
        <div className="mt-1 font-mono text-[11px] text-on-surface-variant">
          Sheet ID: {conn.sheetId.length > 28 ? `${conn.sheetId.slice(0, 14)}…${conn.sheetId.slice(-8)}` : conn.sheetId}
        </div>
        {conn.scriptUrl && (
          <div className="mt-0.5 font-mono text-[10px] text-on-surface-variant/60">
            Custom script URL configured
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Toggle active={conn.active} onChange={onToggle} />
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onDelete}
              className="border border-error px-2 py-0.5 font-mono text-[10px] uppercase text-error hover:bg-error hover:text-on-error"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="px-2 py-0.5 font-mono text-[10px] uppercase text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-on-surface-variant/50 hover:text-error"
            aria-label="Remove connection"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add connection form ──────────────────────────────────────────────────────

type TestState = "idle" | "loading" | "ok" | "error";

function AddConnectionForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [sheetId, setSheetId] = React.useState("");
  const [sheetType, setSheetType] = React.useState<SheetType>("tasklist");
  const [scriptUrl, setScriptUrl] = React.useState("");
  const [testState, setTestState] = React.useState<TestState>("idle");
  const [testMsg, setTestMsg] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState("");

  const reset = () => {
    setName(""); setSheetId(""); setSheetType("tasklist"); setScriptUrl("");
    setTestState("idle"); setTestMsg(""); setErr(""); setOpen(false);
  };

  const handleTest = async () => {
    setTestState("loading"); setTestMsg("");
    const res = await testSheetConnection({ sheetId, sheetType, scriptUrl: scriptUrl || undefined });
    if (res.ok) {
      setTestState("ok");
      setTestMsg(res.rows === 0 ? "Connected — no rows found (check headers or sheet ID)" : `Connected — ${res.rows} row${res.rows !== 1 ? "s" : ""} found`);
    } else {
      setTestState("error");
      setTestMsg(res.error || "Could not reach the sheet.");
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedId = sheetId.trim();
    if (!trimmedName) { setErr("Connection name is required."); return; }
    if (!trimmedId) { setErr("Google Sheet ID is required."); return; }
    setSaving(true);
    try {
      addConnection({ name: trimmedName, sheetId: trimmedId, sheetType, scriptUrl: scriptUrl.trim() || undefined });
      onAdded();
      reset();
    } catch (e: any) {
      setErr(e?.message || "Could not save connection.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = name.trim() && sheetId.trim();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border-2 border-on-surface bg-on-surface px-4 py-2 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface"
      >
        <Icon name="add" className="text-[18px]" />
        Connect a Sheet
      </button>
    );
  }

  return (
    <div className="border-2 border-on-surface bg-surface p-5">
      <div className="mb-4 font-headline-sm text-headline-sm uppercase text-on-surface">Connect a New Sheet</div>

      {err && (
        <div className="mb-3 border border-error bg-surface px-3 py-2 font-mono text-[11px] text-error">{err}</div>
      )}

      <div className="grid gap-4">
        {/* Name */}
        <label className="block">
          <span className="mb-1 block font-label-sm text-label-sm uppercase text-on-surface-variant">Connection Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales Task List"
            className="w-full border-2 border-on-surface bg-surface px-3 py-2 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
          />
        </label>

        {/* Sheet ID */}
        <label className="block">
          <span className="mb-1 block font-label-sm text-label-sm uppercase text-on-surface-variant">Google Sheet ID</span>
          <input
            type="text"
            value={sheetId}
            onChange={(e) => { setSheetId(e.target.value); setTestState("idle"); }}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            className="w-full border-2 border-on-surface bg-surface px-3 py-2 font-mono text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
          />
          <span className="mt-1 block font-mono text-[10px] text-on-surface-variant">
            Find it in your sheet URL: docs.google.com/spreadsheets/d/<strong>SHEET-ID</strong>/edit
          </span>
        </label>

        {/* Type */}
        <div>
          <span className="mb-2 block font-label-sm text-label-sm uppercase text-on-surface-variant">Sheet Type</span>
          <div className="flex gap-4">
            {(["tasklist", "checklist"] as SheetType[]).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2">
                <span
                  onClick={() => setSheetType(t)}
                  className={cn(
                    "grid h-4 w-4 place-items-center border-2 border-on-surface",
                    sheetType === t ? "bg-on-surface" : "bg-surface"
                  )}
                >
                  {sheetType === t && <span className="h-1.5 w-1.5 bg-surface" />}
                </span>
                <span className="font-label-sm text-label-sm uppercase text-on-surface">
                  {t === "tasklist" ? "Task List" : "Checklist"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Script URL (advanced) */}
        <details className="group">
          <summary className="cursor-pointer select-none font-mono text-[10px] uppercase text-on-surface-variant hover:text-on-surface">
            Advanced: Custom Apps Script URL (optional)
          </summary>
          <label className="mt-2 block">
            <input
              type="text"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder={`Default: ${APPS_SCRIPT_URL ? APPS_SCRIPT_URL.slice(0, 40) + "…" : "not configured"}`}
              className="w-full border border-on-surface/40 bg-surface px-3 py-2 font-mono text-[11px] text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none"
            />
            <span className="mt-1 block font-mono text-[10px] text-on-surface-variant/60">
              Leave blank to use the main Apps Script URL. Fill in if this sheet has its own deployment.
            </span>
          </label>
        </details>

        {/* Test result */}
        {testState !== "idle" && (
          <div
            className={cn(
              "flex items-center gap-2 border px-3 py-2 font-mono text-[11px]",
              testState === "ok" ? "border-green-600 text-green-700" : testState === "error" ? "border-error text-error" : "border-on-surface/30 text-on-surface-variant"
            )}
          >
            {testState === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {testState === "ok" && <CheckCircle2 className="h-3.5 w-3.5" />}
            {testState === "error" && <XCircle className="h-3.5 w-3.5" />}
            {testMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={!sheetId.trim() || testState === "loading"}
            className="inline-flex items-center gap-2 border-2 border-on-surface px-4 py-2 font-label-sm text-label-sm uppercase text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            {testState === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon name="wifi_tethering" className="text-[16px]" />}
            Test
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="inline-flex items-center gap-2 border-2 border-on-surface bg-on-surface px-4 py-2 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon name="save" className="text-[16px]" />}
            Save Connection
          </button>
          <button type="button" onClick={reset} className="font-label-sm text-label-sm uppercase text-on-surface-variant hover:text-on-surface">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main SheetManager ────────────────────────────────────────────────────────

export function SheetManager() {
  const [connections, setConnections] = React.useState<SheetConnection[]>(() => getConnections());

  const refresh = () => setConnections(getConnections());

  const handleToggle = (id: string) => {
    toggleConnection(id);
    refresh();
  };

  const handleDelete = (id: string) => {
    removeConnection(id);
    refresh();
  };

  return (
    <div className="space-y-8">
      {/* Default Sources */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">Default Sources</span>
          <span className="font-mono text-[10px] text-on-surface-variant/50">(configured in Apps Script · always active)</span>
        </div>
        <div className="grid gap-3">
          {[
            { label: "Main Task List", type: "tasklist" as SheetType, icon: "assignment" },
            { label: "Main Checklist", type: "checklist" as SheetType, icon: "checklist" },
          ].map((src) => (
            <div key={src.label} className="flex items-center gap-4 border border-on-surface/30 bg-surface-container px-4 py-3 opacity-70">
              <span className="grid h-7 w-7 place-items-center border border-on-surface/20 bg-surface text-on-surface">
                <Icon name={src.icon} className="text-[16px]" />
              </span>
              <span className="flex-1 font-label-sm text-label-sm uppercase text-on-surface">{src.label}</span>
              <Badge type={src.type} />
              <span className="font-mono text-[10px] uppercase text-on-surface-variant">Default</span>
            </div>
          ))}
        </div>
      </section>

      {/* Additional Connections */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
            Additional Connections
            {connections.length > 0 && (
              <span className="ml-2 font-mono text-[10px] text-on-surface-variant/60">({connections.length})</span>
            )}
          </span>
        </div>

        {connections.length === 0 ? (
          <div className="mb-4 border border-on-surface/20 bg-surface-container px-4 py-8 text-center">
            <Icon name="link_off" className="text-[32px] text-on-surface-variant/30" />
            <div className="mt-2 font-mono text-[11px] uppercase text-on-surface-variant">
              No additional sheets connected yet
            </div>
            <div className="mt-1 font-mono text-[10px] text-on-surface-variant/60">
              Connect a second Task List or Checklist sheet to add it to the sidebar
            </div>
          </div>
        ) : (
          <div className="mb-4 grid gap-3">
            {connections.map((conn) => (
              <ConnectionCard
                key={conn.id}
                conn={conn}
                onToggle={() => handleToggle(conn.id)}
                onDelete={() => handleDelete(conn.id)}
              />
            ))}
          </div>
        )}

        <AddConnectionForm onAdded={refresh} />
      </section>

      {/* How it works note */}
      <section className="border border-on-surface/20 bg-surface-container px-4 py-4">
        <div className="mb-2 font-label-sm text-[10px] uppercase text-on-surface-variant">How It Works</div>
        <ul className="space-y-1 font-mono text-[10px] text-on-surface-variant/80">
          <li>1. Enter the Google Sheet ID (from the sheet URL) and choose the type</li>
          <li>2. Click "Test" to verify the connection — the App Script reads the sheet</li>
          <li>3. Save: a new module appears in the sidebar immediately</li>
          <li>4. Your Apps Script must have access to the connected sheet (shared with the same Google account)</li>
          <li>5. Disable a connection to hide it without deleting it; delete to remove it permanently</li>
        </ul>
      </section>
    </div>
  );
}
