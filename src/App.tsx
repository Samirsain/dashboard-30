import * as React from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { loadData, weekOptions, filterByWeek, filterByDoer, fetchConnectionData, getCachedData } from "@/lib/data";
import { getBackendUrl, getDefaultBackendUrl, setBackendUrl, isBackendUrlOverridden } from "@/lib/config";
import { cn } from "@/lib/utils";
import { importFromSheets } from "@/lib/supabaseImport";
import { Login } from "@/components/Login";
import { ForcePasswordChange } from "@/components/ForcePasswordChange";
import { isAuthed, logout, currentSession, type Session } from "@/lib/auth";
import { visibleModules, defaultModuleSlug } from "@/lib/permissions";
import { getConnectionBySlug, getActiveConnections } from "@/lib/sheets";
import { Sidebar, AdminSidebar, MobileSectionTabs } from "@/components/exec/Sidebar";
import { Topbar } from "@/components/exec/Topbar";
import { Overview } from "@/components/exec/Overview";
import { Scorecard } from "@/components/exec/Scorecard";
import { TaskDirectory } from "@/components/exec/TaskDirectory";
import { AddTaskModal } from "@/components/exec/AddTaskModal";
import { AddDoerModal } from "@/components/exec/AddDoerModal";
import { SheetManager } from "@/components/exec/SheetManager";
import { Icon } from "@/components/exec/Icon";
import { getUserAddableModules } from "@/lib/userDb";

function onAdminRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, "");
  return path === "/admin" || hash === "admin"; // /admin (rewrite) or /#admin (fallback)
}

type LoadState = { loading: boolean; data: any; source: string; error: any };

function useAllData(reloadToken: number): LoadState {
  // Seed from the cached payload (if any) so the dashboard paints instantly
  // instead of showing a long spinner while the (sometimes slow) backend loads.
  const [state, setState] = React.useState<LoadState>(() => {
    const cached = getCachedData();
    return cached
      ? { loading: false, data: cached, source: "cache", error: null }
      : { loading: true, data: null, source: "sample", error: null };
  });
  React.useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: s.data === null }));
    loadData().then((res: any) => {
      if (!alive) return;
      // On a failed refresh keep whatever we were already showing (e.g. cache)
      // and surface the error as a banner, rather than blanking to an error page.
      setState((prev) => ({
        loading: false,
        data: res.data ?? prev.data,
        source: res.data ? res.source : prev.source,
        error: res.error,
      }));
    });
    return () => {
      alive = false;
    };
  }, [reloadToken]);
  return state;
}

function LoadingState() {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 py-20 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-on-surface" />
      <div className="font-label-sm text-label-sm uppercase text-on-surface">Loading data…</div>
      <div className="max-w-sm font-mono text-data-mono uppercase text-on-surface-variant">Fetching Checklist and Task List status.</div>
    </div>
  );
}

// Settings card to view/change the Apps Script backend URL at runtime. Shown in
// the admin panel and on the error screen (so a wrong/expired /exec URL — e.g. a
// 404 after re-deploying — can be fixed by pasting the new URL, no rebuild).
function BackendUrlCard() {
  const [url, setUrl] = React.useState(getBackendUrl());
  const [status, setStatus] = React.useState<{ kind: "idle" | "testing" | "ok" | "err"; msg?: string }>({ kind: "idle" });

  async function test() {
    const u = url.trim().replace(/\/+$/, "");
    if (!u) { setStatus({ kind: "err", msg: "URL daalein." }); return; }
    setStatus({ kind: "testing" });
    try {
      const res = await fetch(`${u}?version=1&_t=${Date.now()}`, { redirect: "follow" });
      if (!res.ok) { setStatus({ kind: "err", msg: `HTTP ${res.status}` }); return; }
      const j = await res.json();
      setStatus({ kind: "ok", msg: j?.version ? `OK · ${j.version}` : "Reachable" });
    } catch (e: any) {
      setStatus({ kind: "err", msg: e?.message || "Unreachable" });
    }
  }
  function save() { setBackendUrl(url); window.location.reload(); }
  function reset() { setBackendUrl(""); window.location.reload(); }

  return (
    <div className="glass-card p-4 text-left sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="link" className="text-[20px] text-on-surface" />
        <h3 className="font-headline-md text-headline-md uppercase tracking-tight text-on-surface">Backend URL</h3>
      </div>
      <p className="mb-3 font-mono text-data-mono uppercase text-on-surface-variant">
        Apps Script Web App ka /exec URL. Naya deploy karne par yahan paste karke Save karein — rebuild ki zaroorat nahi.
      </p>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        spellCheck={false}
        placeholder="https://script.google.com/macros/s/…/exec"
        className="w-full border-2 border-on-surface bg-surface-container-lowest px-3 py-2.5 font-mono text-data-mono text-on-surface outline-none focus:bg-surface-container-low"
      />
      {status.kind !== "idle" && (
        <div className={cn(
          "mt-2 border-2 px-3 py-1.5 font-label-sm text-label-sm uppercase",
          status.kind === "ok" ? "border-on-surface text-on-surface" : status.kind === "err" ? "border-error text-error" : "border-on-surface text-on-surface-variant"
        )}>
          {status.kind === "testing" ? "Testing…" : status.msg}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={test} className="border-2 border-on-surface px-4 py-2 font-label-sm text-label-sm uppercase text-on-surface transition-colors hover:bg-surface-container">Test</button>
        <button onClick={save} className="inline-flex items-center gap-2 border-2 border-on-surface bg-on-surface px-4 py-2 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface">Save &amp; Reload</button>
        {isBackendUrlOverridden() && (
          <button onClick={reset} className="border-2 border-on-surface px-4 py-2 font-label-sm text-label-sm uppercase text-on-surface-variant transition-colors hover:bg-surface-container">Reset</button>
        )}
      </div>
    </div>
  );
}

// Admin one-time import of the current Google Sheet data into Supabase.
function MigrateCard() {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [result, setResult] = React.useState<{ doers: number; tasks: number } | null>(null);
  const [err, setErr] = React.useState("");

  async function run() {
    if (busy) return;
    if (!window.confirm("Google Sheet ka poora data Supabase me import karein?\n\n(Safe hai — dobara chalा sakte ho, duplicate nahi banenge.)")) return;
    setBusy(true); setErr(""); setResult(null); setMsg("");
    try {
      const r = await importFromSheets(setMsg);
      setResult(r);
    } catch (e: any) {
      setErr(e?.message || "Import fail hua.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card p-4 text-left sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="cloud_upload" className="text-[20px] text-on-surface" />
        <h3 className="font-headline-md text-headline-md uppercase tracking-tight text-on-surface">Import to Supabase</h3>
      </div>
      <p className="mb-3 font-mono text-data-mono uppercase text-on-surface-variant">
        Google Sheet ka current data (doers + tasks) ek click me Supabase database me le aao. Safe &amp; repeatable.
      </p>
      {result ? (
        <div className="border-2 border-on-surface bg-surface-container-low px-3 py-2 font-label-sm text-label-sm uppercase text-on-surface">
          ✅ Import ho gaya — {result.doers} doers · {result.tasks} tasks
        </div>
      ) : (
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-2 border-2 border-on-surface bg-on-surface px-5 py-2.5 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface disabled:opacity-50"
        >
          <Icon name={busy ? "progress_activity" : "cloud_upload"} className={cn("text-[18px]", busy && "animate-spin")} />
          {busy ? (msg || "Importing…") : "Import from Google Sheets"}
        </button>
      )}
      {busy && msg && <div className="mt-2 font-mono text-data-mono uppercase text-on-surface-variant">{msg}</div>}
      {err && <div className="mt-2 border-2 border-error px-3 py-1.5 font-label-sm text-label-sm uppercase text-error">{err}</div>}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="glass-card flex flex-col items-center justify-center gap-3 border-error py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-error" />
        <div className="font-headline-md text-headline-md uppercase text-error">Couldn't load the dashboard</div>
        <div className="max-w-md font-mono text-data-mono text-on-surface-variant">{error?.message || "Unknown error."}</div>
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 border-2 border-on-surface bg-on-surface px-4 py-2 font-label-sm text-label-sm uppercase text-on-primary transition-colors hover:bg-surface hover:text-on-surface"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
      <BackendUrlCard />
    </div>
  );
}

function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center border-2 border-on-surface bg-surface-container text-on-surface">
        <Icon name="account_tree" className="text-[24px]" />
      </span>
      <div className="font-headline-md text-headline-md uppercase text-on-surface">{title}</div>
      <div className="max-w-md font-mono text-data-mono text-on-surface-variant">{note}</div>
    </div>
  );
}

// A connected sheet's page. Its rows are fetched lazily — only when this module
// is actually opened — so attaching sheets never slows the main dashboard load.
// A connected sheet is a SHARED work-list: everyone granted access sees ALL of
// its rows (access is the gate), unlike the main Task List which is doer-scoped.
function ConnectionModule({ conn, reloadToken, onChanged }: { conn: any; reloadToken: number; onChanged: () => void }) {
  const [rows, setRows] = React.useState<any[] | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    setRows(null);
    setFailed(false);
    fetchConnectionData(conn).then((r: any[] | null) => {
      if (!alive) return;
      if (r === null) { setFailed(true); setRows([]); }
      else setRows(r);
    });
    return () => { alive = false; };
  }, [conn.id, conn.sheetId, reloadToken]);

  if (rows === null) return <LoadingState />;

  const isTaskList = conn.sheetType === "tasklist";
  const connData = isTaskList
    ? { delegation: rows, checklist: [], fms: [] }
    : { checklist: rows, delegation: [], fms: [] };

  return (
    <>
      {failed && (
        <div className="mb-4 border-2 border-error bg-error/5 px-3 py-2 font-mono text-data-mono uppercase text-error">
          Is sheet ka data load nahi ho paya. Refresh karein ya Sheet ID check karein.
        </div>
      )}
      <TaskDirectory data={connData} source={isTaskList ? "Task List" : "Checklist"} title={conn.name} pendingOnly onChanged={onChanged} />
    </>
  );
}

// Render a module's page by slug. Sheet-connection modules (sc-XXXXXX) lazy-load
// their rows via ConnectionModule.
function ModuleBody({ slug, moduleName, viewData, onChanged, doerName, reloadToken }: { slug: string; moduleName: string; viewData: any; onChanged: () => void; doerName: string | null; reloadToken: number }) {
  switch (slug) {
    case "dashboard":
      return <Overview data={viewData} onChanged={onChanged} />;
    case "tasklist":
      return <TaskDirectory data={viewData} source="Task List" title="Task List" pendingOnly onChanged={onChanged} />;
    case "checklist":
      return <TaskDirectory data={viewData} source="Checklist" title="Checklist" pendingOnly onChanged={onChanged} />;
    case "workflow":
      return <ComingSoon title="Workflow coming soon" note="Workflow sheet abhi connect nahi hui hai. Uska Google Sheet share kar do — yahi Done/Pending tracking ke saath aa jayegi." />;
    default: {
      const conn = getConnectionBySlug(slug);
      if (conn) {
        return <ConnectionModule conn={conn} reloadToken={reloadToken} onChanged={onChanged} />;
      }
      return <ComingSoon title={`${moduleName} coming soon`} note="Ye module enable ho gaya hai — iska data source connect hote hi yahan live aa jayega." />;
    }
  }
}

// ---- Public Executive dashboard (/) ----------------------------------------
function PublicApp({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const { role, doerName, canAdd, userId, internalRole } = session;
  const isAdmin = role === "admin";
  // admin & pc can add to any list; employees only to lists they're granted.
  const isUnrestricted = internalRole === "admin" || internalRole === "pc";

  const [section, setSection] = React.useState<string>(() => defaultModuleSlug(session));
  const [week, setWeek] = React.useState<string>("all");
  const [reloadToken, setReloadToken] = React.useState(0);
  const [showAdd, setShowAdd] = React.useState(false);
  const [showAddDoer, setShowAddDoer] = React.useState(false);
  const { loading, data, source, error } = useAllData(reloadToken);

  // Recompute visible/addable modules whenever data (re)loads. A load hydrates
  // this device's connection + per-doer access caches from the shared backend,
  // so a doer's assigned sheets appear without needing to log in again.
  const modules = React.useMemo(() => visibleModules(session), [session, data]);
  const addableModules = React.useMemo(() => getUserAddableModules(userId), [userId, data]);

  // Lists shown in the Add Task "Save to List" dropdown. admin/pc get every
  // list (their addable list is intentionally empty = "anywhere"); employees get
  // exactly the lists they've been granted.
  const allowedAddModules = React.useMemo(
    () => (isUnrestricted
      ? ["tasklist", "checklist", ...getActiveConnections().map((c) => c.moduleSlug)]
      : addableModules),
    [isUnrestricted, addableModules, data]
  );

  // When viewing a connected sheet module, employees can add tasks to that sheet.
  const currentConn = React.useMemo(() => getConnectionBySlug(section), [section]);

  // Permission guard: if the active module isn't accessible, fall back to the
  // first allowed one (covers a module being disabled / access revoked).
  React.useEffect(() => {
    if (modules.length && !modules.some((m) => m.slug === section)) {
      setSection(modules[0].slug);
    }
  }, [modules, section]);

  // When a staff member is logged in, scope the data to their own tasks only.
  const staffData = React.useMemo(() => filterByDoer(data, doerName), [data, doerName]);
  const weeks = weekOptions(staffData);
  const viewData = React.useMemo(() => filterByWeek(staffData, week), [staffData, week]);
  const activeModule = modules.find((m) => m.slug === section);
  const sectionLabel = activeModule?.name || "Dashboard";

  const refresh = () => setReloadToken((t) => t + 1);
  let body: React.ReactNode = null;
  if (loading) body = <LoadingState />;
  else if (error && !data) body = <ErrorState error={error} onRetry={refresh} />;
  else body = <ModuleBody slug={section} moduleName={sectionLabel} viewData={viewData} onChanged={refresh} doerName={doerName} reloadToken={reloadToken} />;

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface antialiased">
      <Sidebar modules={modules} active={section} onSelect={setSection} showAdmin={isAdmin} onLogout={onLogout} />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          sectionLabel={sectionLabel}
          weeks={weeks}
          weekKey={week}
          onWeekChange={setWeek}
          source={source}
          onLogout={onLogout}
          onAddTask={(canAdd || addableModules.includes(section)) ? () => setShowAdd(true) : undefined}
          onAddDoer={isAdmin ? () => setShowAddDoer(true) : undefined}
          loggedInName={doerName || role}
        />
        <MobileSectionTabs modules={modules} active={section} onSelect={setSection} showAdmin={isAdmin} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6">
          <div className="mx-auto min-w-0 max-w-[1440px]">
            {error && data && (
              <div className="mb-4 border-2 border-on-surface bg-surface-container px-3 py-2 font-mono text-data-mono uppercase text-on-surface">{error.message}</div>
            )}
            {body}
          </div>
        </main>
      </div>
      {showAdd && (
        <AddTaskModal
          doers={data?.doers || []}
          data={data}
          allowedModules={allowedAddModules}
          onClose={() => setShowAdd(false)}
          onAdded={() => setReloadToken((t) => t + 1)}
          sheetId={currentConn?.sheetId}
          sheetType={currentConn?.sheetType}
          lockedDoer={currentConn && !isUnrestricted ? doerName : undefined}
        />
      )}
      {showAddDoer && (
        <AddDoerModal
          existingDoers={data?.doers || []}
          onClose={() => { setShowAddDoer(false); setReloadToken((t) => t + 1); }}
        />
      )}
    </div>
  );
}

// ---- Admin panel (/admin): Scorecard + Sheet Connections -------------------
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [adminSection, setAdminSection] = React.useState<"scoring" | "sheets">("scoring");
  const [week, setWeek] = React.useState<string>("all");
  const [reloadToken, setReloadToken] = React.useState(0);
  const [showAdd, setShowAdd] = React.useState(false);
  const [showAddDoer, setShowAddDoer] = React.useState(false);
  const { loading, data, source, error } = useAllData(reloadToken);

  const weeks = weekOptions(data);
  const viewData = React.useMemo(() => filterByWeek(data, week), [data, week]);

  const sectionLabel = adminSection === "scoring" ? "Scoring" : "Sheet Connections";

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface antialiased">
      <AdminSidebar section={adminSection} onSection={(s) => setAdminSection(s as any)} onLogout={onLogout} />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          sectionLabel={sectionLabel}
          weeks={adminSection === "scoring" ? weeks : []}
          weekKey={week}
          onWeekChange={setWeek}
          source={source}
          onLogout={onLogout}
          onAddTask={adminSection === "scoring" ? () => setShowAdd(true) : undefined}
          onAddDoer={adminSection === "scoring" ? () => setShowAddDoer(true) : undefined}
          loggedInName="ADMIN"
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6">
          <div className="mx-auto min-w-0 max-w-[1440px]">
            {adminSection === "sheets" ? (
              <div className="space-y-6">
                <BackendUrlCard />
                <MigrateCard />
                <SheetManager />
              </div>
            ) : loading ? (
              <LoadingState />
            ) : error && !data ? (
              <ErrorState error={error} onRetry={() => setReloadToken((t) => t + 1)} />
            ) : (
              <>
                {error && data && (
                  <div className="mb-4 border-2 border-on-surface bg-surface-container px-3 py-2 font-mono text-data-mono uppercase text-on-surface">{error.message}</div>
                )}
                <Scorecard data={viewData} />
              </>
            )}
          </div>
        </main>
      </div>
      {showAdd && (
        <AddTaskModal
          doers={data?.doers || []}
          data={data}
          allowedModules={getActiveConnections().map((c) => c.moduleSlug).concat(["tasklist", "checklist"])}
          onClose={() => setShowAdd(false)}
          onAdded={() => setReloadToken((t) => t + 1)}
        />
      )}
      {showAddDoer && (
        <AddDoerModal
          existingDoers={data?.doers || []}
          onClose={() => { setShowAddDoer(false); setReloadToken((t) => t + 1); }}
        />
      )}
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = React.useState<boolean>(() => isAuthed());
  const [session, setSessionState] = React.useState(() => currentSession());

  const handleLoginSuccess = () => {
    setAuthed(true);
    setSessionState(currentSession());
  };

  const onLogout = () => {
    logout();
    setAuthed(false);
    setSessionState(null);
  };

  if (!authed || !session) {
    return <Login onSuccess={handleLoginSuccess} />;
  }

  if (session.forcePasswordChange) {
    return (
      <ForcePasswordChange
        session={session}
        onDone={(updatedSession) => setSessionState(updatedSession)}
      />
    );
  }

  // Only the admin can open the Scoring panel; everyone else → the dashboard.
  if (onAdminRoute()) {
    if (session.role !== "admin") {
      try {
        window.history.replaceState(null, "", "/");
      } catch {
        /* ignore */
      }
      return <PublicApp session={session} onLogout={onLogout} />;
    }
    return <AdminPanel onLogout={onLogout} />;
  }
  return <PublicApp session={session} onLogout={onLogout} />;
}
