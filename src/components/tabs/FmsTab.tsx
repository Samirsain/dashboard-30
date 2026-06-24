import { Card } from "@/components/ui/card";
import { Layers } from "lucide-react";
import { SectionHeading } from "@/components/common";

export function FmsTab({ data }: { data: any }) {
  const rows: any[] = data.fms || [];

  // No FMS sheet connected yet — show a friendly placeholder.
  if (!rows.length) {
    return (
      <div className="space-y-4">
        <SectionHeading title="FMS" subtitle="Functional process tracking — abhi connect hona baaki hai." />
        <Card>
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
              <Layers className="h-6 w-6" />
            </div>
            <div className="text-lg font-semibold">FMS coming soon</div>
            <div className="max-w-md text-sm text-muted-foreground">
              FMS sheet abhi connect nahi hui hai. Uska Google Sheet share kar do — yahi Done/Pending tracking ke saath
              automatically aa jayegi, koi aur change nahi chahiye.
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // (Reserved) once FMS rows arrive they'll render here.
  return null;
}
