import {
  KpiCards,
  StatusDonut,
  DeptPerformance,
  FrequencyChart,
  DailyTrend,
  WeeklyProductivity,
  Heatmap,
  TodaySummary,
  AiInsights,
  RecentActivity,
} from "./OverviewParts";
import { TaskDirectory } from "./TaskDirectory";

export function Overview({ data, weekLabel }: { data: any; weekLabel: string }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg-mobile font-bold text-on-surface md:text-display-lg">Welcome back, Team.</h1>
          <p className="mt-1 text-body-lg text-on-surface-variant">Portfolio overview · {weekLabel}</p>
        </div>
      </div>

      <KpiCards data={data} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          <StatusDonut data={data} />
          <DeptPerformance data={data} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <DailyTrend data={data} />
            <WeeklyProductivity data={data} />
          </div>
          <FrequencyChart data={data} />
          <Heatmap data={data} />
        </div>
        <div className="flex flex-col gap-6">
          <TodaySummary data={data} />
          <AiInsights data={data} />
          <RecentActivity data={data} />
        </div>
      </div>

      <TaskDirectory data={data} />
    </div>
  );
}
