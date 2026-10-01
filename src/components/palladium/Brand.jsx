import { AstraMark } from '@/components/blackstar/AstraMark'

export default function Brand({ compact = false }) {
  return (
    <div className="blackstar-brand-lockup flex min-w-0 items-center gap-3">
      <span className="blackstar-brand-mark relative grid shrink-0 place-items-center">
        <AstraMark size={compact ? 28 : 36} />
        <span aria-hidden className="blackstar-brand-mark-ring" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-[.21em] text-white">BLACKSTAR</span>
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[7px] font-semibold uppercase tracking-[.22em] text-zinc-700">
            <span className="h-1 w-1 rounded-full bg-violet-300/60" />
            Astra-class intelligence
          </span>
        </span>
      )}
    </div>
  )
}
