import * as React from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { loadData, weekOptions, filterByWeek } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Login } from "@/components/Login";
import { isAuthed, logout } from "@/lib/auth";
import { Sidebar, AdminSidebar, MobileSectionTabs, SECTIONS } from "@/components/exec/Sidebar";
import { Topbar } from "@/components/exec/Topbar";
import { Overview } from "@/components/exec/Overview";
import { Scorecard } from "@/components/exec/Scorecard";
import { TaskDirectory } from "@/components/exec/TaskDirectory";
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
    setState((s) => ({ ...s, loading: true }));
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
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="font-medium">Loading data…</div>
      <div className="max-w-sm text-body-sm text-on-surface-variant">Fetching the team's Checklist and Task List status.</div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 border-bad/30 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-bad" />
      <div className="text-lg font-semibold text-bad">Couldn't load the dashboard</div>
      <div className="max-w-md text-body-sm text-on-surface-variant">{error?.message || "Unknown error."}</div>
      <Button onClick={onRetry} className="mt-1">
        <RefreshCw className="h-4 w-4" /> Retry
      </Button>
    </div>
  );
}

function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-fixed text-primary">
        <Icon name="assignment" className="text-[24px]" />
      </span>
      <div className="text-headline-sm font-semibold text-on-surface">{title}</div>
      <div className="max-w-md text-body-sm text-on-surface-variant">{note}</div>
    </div>
  );
}

// ---- Public Executive dashboard (/) ----------------------------------------
function PublicApp() {
  const [section, setSection] = React.useState<string>("dashboard");
  const [week, setWeek] = React.useState<string>("all");
  const [reloadToken, setReloadToken] = React.useState(0);
  const { loading, data, source, error } = useAllData(reloadToken);

  const weeks = weekOptions(data);
  const viewData = React.useMemo(() => filterByWeek(data, week), [data, week]);
  const sectionLabel = SECTIONS.find((s) => s.id === section)?.label || "Dashboard";

  let body: React.ReactNode = null;
  if (loading) body = <LoadingState />;
  else if (error && !data) body = <ErrorState error={error} onRetry={() => setReloadToken((t) => t + 1)} />;
  else if (section === "dashboard") body = <Overview data={viewData} />;
  else if (section === "checklist") body = <TaskDirectory data={viewData} source="Checklist" title="Checklist" />;
  else if (section === "tasklist") body = <TaskDirectory data={viewData} source="Task List" title="Task List" />;
  else if (section === "workflow") body = <ComingSoon title="Workflow coming soon" note="Workflow sheet abhi connect nahi hui hai. Uska Google Sheet share kar do — yahi Done/Pending tracking ke saath aa jayegi." />;

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface antialiased">
      <Sidebar active={section} onSelect={setSection} />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Topbar sectionLabel={sectionLabel} weeks={weeks} weekKey={week} onWeekChange={setWeek} source={source} />
        <MobileSectionTabs active={section} onSelect={setSection} />
        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6">
          <div className="mx-auto max-w-[1440px]">
            {error && data && (
              <div className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-body-sm text-warn">{error.message}</div>
            )}
            {body}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---- Admin panel (/admin): login → Scorecard, in the same shell -----------
function AdminPanel() {
  const [authed, setAuthed] = React.useState<boolean>(() => isAuthed());
  const [week, setWeek] = React.useState<string>("all");
  const [reloadToken, setReloadToken] = React.useState(0);
  const { loading, data, source, error } = useAllData(reloadToken);

  const weeks = weekOptions(data);
  const viewData = React.useMemo(() => filterByWeek(data, week), [data, week]);

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const onLogout = () => {
    logout();
    setAuthed(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface antialiased">
      <AdminSidebar onLogout={onLogout} />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Topbar sectionLabel="Scoring" weeks={weeks} weekKey={week} onWeekChange={setWeek} source={source} onLogout={onLogout} />
        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6">
          <div className="mx-auto max-w-[1440px]">
            {loading ? (
              <LoadingState />
            ) : error && !data ? (
              <ErrorState error={error} onRetry={() => setReloadToken((t) => t + 1)} />
            ) : (
              <>
                {error && data && (
                  <div className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-body-sm text-warn">{error.message}</div>
                )}
                <Scorecard data={viewData} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return onAdminRoute() ? <AdminPanel /> : <PublicApp />;
}
