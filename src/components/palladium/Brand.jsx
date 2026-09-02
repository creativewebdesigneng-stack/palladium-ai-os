export default function Brand({ compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center" aria-hidden="true">
        <span className="absolute h-8 w-8 rounded-full border border-violet-300/25 shadow-[0_0_28px_rgba(124,58,237,.24)]" />
        <span className="absolute h-4 w-4 rounded-full bg-[#030306] shadow-[0_0_18px_rgba(167,139,250,.55)]" />
        <span className="absolute h-px w-9 rotate-45 bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />
        <span className="absolute h-px w-9 -rotate-45 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-[.18em] text-white">BLACKSTAR</span>
          <span className="mt-0.5 block truncate text-[8px] font-medium uppercase tracking-[.22em] text-zinc-600">Intelligence Infrastructure</span>
        </span>
      )}
    </div>
  );
}
