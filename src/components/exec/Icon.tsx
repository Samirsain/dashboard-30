import { cn } from "@/lib/utils";

// Thin wrapper over the Material Symbols font loaded in index.html.
export function Icon({ name, filled, className }: { name: string; filled?: boolean; className?: string }) {
  return <span className={cn("material-symbols-outlined", filled && "filled-icon", className)}>{name}</span>;
}
