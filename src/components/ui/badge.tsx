import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Translucent, ring-outlined pills that read clearly on the dark glass canvas.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-500/10 text-slate-600 ring-1 ring-inset ring-slate-500/20",
        ok: "bg-ok/15 text-ok ring-1 ring-inset ring-ok/30",
        warn: "bg-warn/15 text-warn ring-1 ring-inset ring-warn/30",
        bad: "bg-bad/15 text-bad ring-1 ring-inset ring-bad/30",
        gold: "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
