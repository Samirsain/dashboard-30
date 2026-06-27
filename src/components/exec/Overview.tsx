import { HeroMetric, KpiCards, StatusDonut, DeptPerformance } from "./OverviewParts";
import { TaskDirectory } from "./TaskDirectory";

export function Overview({ data, onChanged }: { data: any; onChanged?: () => void }) {
  return (
    <div className="space-y-6">
      <HeroMetric data={data} />

      <KpiCards data={data} />

      <TaskDirectory data={data} todayOnly title="Today's Followup" onChanged={onChanged} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <DeptPerformance data={data} className="lg:col-span-7" />
        <StatusDonut data={data} className="lg:col-span-5" />
      </div>
    </div>
  );
}
