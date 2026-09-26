import { AstraMark } from '@/components/blackstar/AstraMark'

export default function Brand({ compact = false }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AstraMark size={compact ? 28 : 36} />
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-[.20em] text-white">BLACKSTAR</span>
          <span className="mt-0.5 block truncate text-[8px] font-medium uppercase tracking-[.24em] text-zinc-600">Astra-class intelligence</span>
        </span>
      )}
    </div>
  )
}
