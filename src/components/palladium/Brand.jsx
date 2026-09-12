export default function Brand({ compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="blackstar-brand-core relative grid h-10 w-10 shrink-0 place-items-center" aria-hidden="true">
        <span className="blackstar-brand-orbit blackstar-brand-orbit-one" />
        <span className="blackstar-brand-orbit blackstar-brand-orbit-two" />
        <span className="blackstar-brand-center" />
        <span className="blackstar-brand-cross blackstar-brand-cross-a" />
        <span className="blackstar-brand-cross blackstar-brand-cross-b" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-[.20em] text-white drop-shadow-[0_3px_16px_rgba(139,92,246,.22)]">BLACKSTAR</span>
          <span className="mt-0.5 block truncate text-[8px] font-medium uppercase tracking-[.24em] text-zinc-600">Intelligence Infrastructure</span>
        </span>
      )}
    </div>
  );
}
