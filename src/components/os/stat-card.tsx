import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  trend = "up",
  icon: Icon,
  hint,
  className,
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: LucideIcon;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "panel group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {Icon && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-secondary/60 text-primary">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-[28px]">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              trend === "up" && "bg-success/12 text-success",
              trend === "down" && "bg-destructive/12 text-destructive",
              trend === "flat" && "bg-muted text-muted-foreground",
            )}
          >
            {trend === "up" ? <ArrowUpRight className="size-3" /> : null}
            {trend === "down" ? <ArrowDownRight className="size-3" /> : null}
            {delta}
          </span>
        )}
        {hint && <span className="truncate text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}
