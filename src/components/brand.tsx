import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "brand-gradient relative grid size-9 shrink-0 place-items-center rounded-xl text-primary-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
        <path
          d="M12 2.5 3.5 7.2v9.6L12 21.5l8.5-4.7V7.2L12 2.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M12 7.5v9M8 9.75v4.5M16 9.75v4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function BrandLogo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[15px] font-semibold tracking-tight">PalladiumAI</span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            AI Operating System
          </span>
        </span>
      )}
    </span>
  );
}
