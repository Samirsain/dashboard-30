import * as React from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { TABS } from "@/lib/config";
import { loadData, weekOptions, filterByWeek } from "@/lib/data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { Login } from "@/components/Login";
import { isAuthed, logout } from "@/lib/auth";
import { SummaryTab } from "@/components/tabs/SummaryTab";
import { FmsTab } from "@/components/tabs/FmsTab";
import { ChecklistTab } from "@/components/tabs/ChecklistTab";
import { DelegationTab } from "@/components/tabs/DelegationTab";
import { AllDoersTab } from "@/components/tabs/AllDoersTab";
import { cn } from "@/lib/utils";

type LoadState = { loading: boolean; data: any; source: string; error: any };

// Load ALL data once; week filtering happens client-side afterwards.
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

function Notice({ kind, children }: { kind: "warn" | "info"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mb-4 rounded-lg border px-3 py-2 text-sm",
        kind === "warn" ? "border-warn/30 bg-warn/10 text-warn" : "border-sky-300 bg-sky-50 text-sky-700"
      )}
    >
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="font-medium">Loading data…</div>
        <div className="max-w-sm text-sm text-muted-foreground">Fetching the team's Checklist and Delegation status.</div>
      </div>
    </Card>
  );
}

function ErrorState({ error, onRetry }: { error: any; onRetry: () => void }) {
  return (
    <Card className="border-bad/30">
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-bad" />
        <div className="text-lg font-semibold text-bad">Couldn't load the dashboard</div>
        <div className="max-w-md text-sm text-muted-foreground">{error?.message || "Unknown error."}</div>
        {error?.missingHeaders?.length > 0 && (
          <div className="w-full max-w-md rounded-lg border border-bad/30 bg-bad/10 p-3 text-left">
            <div className="mb-1 text-sm font-semibold text-bad">Missing required headers:</div>
            <ul className="list-inside list-disc font-mono text-xs text-muted-foreground">
              {error.missingHeaders.map((h: string) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        )}
        <Button onClick={onRetry} className="mt-1">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    </Card>
  );
}

export default function App() {
  const [authed, setAuthed] = React.useState<boolean>(() => isAuthed());
  const [tab, setTab] = React.useState<string>(TABS[0].id);
  const [week, setWeek] = React.useState<string>("all");
  const [reloadToken, setReloadToken] = React.useState(0);
  const { loading, data, source, error } = useAllData(reloadToken);

  const weeks = weekOptions(data);
  const viewData = React.useMemo(() => filterByWeek(data, week), [data, week]);
  const weekLabel = weeks.find((w) => w.key === week)?.label || "All weeks";

  // Scoring is gated — nothing renders until the admin logs in.
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const onLogout = () => {
    logout();
    setAuthed(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header weeks={weeks} weekKey={week} onWeekChange={setWeek} weekLabel={weekLabel} source={source} onLogout={onLogout} />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="overflow-x-auto scroll-slim pb-1">
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.id} value={t.id}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {loading ? (
            <div className="mt-5">
              <LoadingState />
            </div>
          ) : error && !data ? (
            <div className="mt-5">
              <ErrorState error={error} onRetry={() => setReloadToken((t) => t + 1)} />
            </div>
          ) : (
            <>
              <div className="mt-5">
                {error && data && <Notice kind="warn">{error.message}</Notice>}
                {viewData?.unknownDoers?.length > 0 && (
                  <Notice kind="info">
                    Data quality: {viewData.unknownDoers.length} doer name(s) not in the master Doers list —{" "}
                    {viewData.unknownDoers.join(", ")}. Rows are shown, not dropped.
                  </Notice>
                )}
              </div>
              <TabsContent value="summary">
                <SummaryTab data={viewData} />
              </TabsContent>
              <TabsContent value="fms">
                <FmsTab data={viewData} />
              </TabsContent>
              <TabsContent value="checklist">
                <ChecklistTab data={viewData} />
              </TabsContent>
              <TabsContent value="delegation">
                <DelegationTab data={viewData} />
              </TabsContent>
              <TabsContent value="allDoers">
                <AllDoersTab data={viewData} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      <footer className="border-t border-slate-200 py-5 text-center text-xs text-muted-foreground">
        ThirtyMilestones MIS Dashboard · read-only
      </footer>
    </div>
  );
}
