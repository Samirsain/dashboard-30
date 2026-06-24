import { Card } from "@/components/ui/card";
import { Layers } from "lucide-react";

export function FmsTab({ data }: { data: any }) {
  const rows: any[] = data.fms || [];

  // No FMS sheet connected yet — show a friendly placeholder.
  if (!rows.length) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <Layers className="h-6 w-6" />
          </div>
          <div className="text-lg font-semibold">FMS coming soon</div>
          <div className="max-w-md text-sm text-muted-foreground">
            The FMS (functional process) sheet isn't connected yet. Share its Google Sheet and it will appear here with
            the same Done/Pending tracking — no other changes needed.
          </div>
        </div>
      </Card>
    );
  }

  // (Reserved) once FMS rows arrive they'll render here.
  return null;
}
