import * as React from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { loadData, weekOptions, filterByWeek, filterByDoer } from "@/lib/data";
import { Login } from "@/components/Login";
import { isAuthed, currentRole, currentDoerName, currentCanAdd, logout, type Role } from "@/lib/auth";
import { Sidebar, AdminSidebar, MobileSectionTabs, SECTIONS } from "@/components/exec/Sidebar";
import { Topbar } from "@/components/exec/Topbar";
import { Overview } from "@/components/exec/Overview";
import { Scorecard } from "@/components/exec/Scorecard";
import { TaskDirectory } from "@/components/exec/TaskDirectory";
import { AddTaskModal } from "@/components/exec/AddTaskModal";
import { AddDoerModal } from "@/components/exec/AddDoerModal";
import { Icon } from "@/components/exec/Icon";

function onAdminRoute(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, "");
  return path === "/admin" || hash === "admin"; // /admin (rewrite) or /#admin (fallback)
}

type LoadState = { loading: boolean; data: any; source: string; error: any };

function useAllData(reloadToken: number): LoadState {
  const [state, setState] = React.useState<LoadState>({ loading: true, data: null, source: "sample", error: null });
  React.useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: s.data === null }));
    loadData().then((res: any) => {
      if (alive) setState({ loading: false, data: res.data, source: res.source, error: res.error });
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

function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  return (
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

// ---- Public Executive dashboard (/) ----------------------------------------
function PublicApp({ role, doerName, canAdd, onLogout }: { role: Role; doerName: string | null; canAdd: boolean; onLogout: () => void }) {
  const [section, setSection] = React.useState<string>("dashboard");
  const [week, setWeek] = React.useState<string>("all");
  const [reloadToken, setReloadToken] = React.useState(0);
  const [showAdd, setShowAdd] = React.useState(false);
  const { loading, data, source, error } = useAllData(reloadToken);
  const isAdmin = role === "admin";

  // When a staff member is logged in, scope the data to their own tasks only.
  const staffData = React.useMemo(() => filterByDoer(data, doerName), [data, doerName]);
  const weeks = weekOptions(staffData);
  const viewData = React.useMemo(() => filterByWeek(staffData, week), [staffData, week]);
  const sectionLabel = SECTIONS.find((s) => s.id === section)?.label || "Dashboard";

  const refresh = () => setReloadToken((t) => t + 1);
  let body: React.ReactNode = null;
  if (loading) body = <LoadingState />;
  else if (error && !data) body = <ErrorState error={error} onRetry={refresh} />;
  else if (section === "dashboard") body = <Overview data={viewData} onChanged={refresh} />;
  else if (section === "checklist") body = <TaskDirectory data={viewData} source="Checklist" title="Checklist" onChanged={refresh} />;
  else if (section === "tasklist") body = <TaskDirectory data={viewData} source="Task List" title="Task List" onChanged={refresh} />;
  else if (section === "workflow") body = <ComingSoon title="Workflow coming soon" note="Workflow sheet abhi connect nahi hui hai. Uska Google Sheet share kar do — yahi Done/Pending tracking ke saath aa jayegi." />;

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface antialiased">
      <Sidebar active={section} onSelect={setSection} showAdmin={isAdmin} onLogout={onLogout} />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          sectionLabel={sectionLabel}
          weeks={weeks}
          weekKey={week}
          onWeekChange={setWeek}
          source={source}
          onLogout={onLogout}
          onAddTask={canAdd ? () => setShowAdd(true) : undefined}
        />
        <MobileSectionTabs active={section} onSelect={setSection} showAdmin={isAdmin} />
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
          onClose={() => setShowAdd(false)}
          onAdded={() => setReloadToken((t) => t + 1)}
        />
      )}
    </div>
  );
}

// ---- Admin panel (/admin): Scorecard, in the same shell (admin role only) --
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [week, setWeek] = React.useState<string>("all");
  const [reloadToken, setReloadToken] = React.useState(0);
  const [showAdd, setShowAdd] = React.useState(false);
  const [showAddDoer, setShowAddDoer] = React.useState(false);
  const { loading, data, source, error } = useAllData(reloadToken);

  const weeks = weekOptions(data);
  const viewData = React.useMemo(() => filterByWeek(data, week), [data, week]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface antialiased">
      <AdminSidebar onLogout={onLogout} />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          sectionLabel="Scoring"
          weeks={weeks}
          weekKey={week}
          onWeekChange={setWeek}
          source={source}
          onLogout={onLogout}
          onAddTask={() => setShowAdd(true)}
          onAddDoer={() => setShowAddDoer(true)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-24 sm:p-6">
          <div className="mx-auto min-w-0 max-w-[1440px]">
            {loading ? (
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
          onClose={() => setShowAdd(false)}
          onAdded={() => setReloadToken((t) => t + 1)}
        />
      )}
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = React.useState<boolean>(() => isAuthed());

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const role = currentRole() ?? "staff";
  const doerName = currentDoerName();
  const canAdd = currentCanAdd();
  const onLogout = () => {
    logout();
    setAuthed(false);
  };

  // Only the admin can open the Scoring panel; everyone else → the dashboard.
  if (onAdminRoute()) {
    if (role !== "admin") {
      try {
        window.history.replaceState(null, "", "/");
      } catch {
        /* ignore */
      }
      return <PublicApp role={role} doerName={doerName} canAdd={canAdd} onLogout={onLogout} />;
    }
    return <AdminPanel onLogout={onLogout} />;
  }
  return <PublicApp role={role} doerName={doerName} canAdd={canAdd} onLogout={onLogout} />;
}
