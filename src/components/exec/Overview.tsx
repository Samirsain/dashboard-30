import { KpiCards, StatusDonut, DeptPerformance } from "./OverviewParts";
import { TaskDirectory } from "./TaskDirectory";

export function Overview({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <KpiCards data={data} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatusDonut data={data} className="lg:col-span-1" />
        <DeptPerformance data={data} className="lg:col-span-2" />
      </div>

      <TaskDirectory data={data} />
    </div>
  );
}
