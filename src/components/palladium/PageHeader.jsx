import { AstraMark } from '@/components/blackstar/AstraMark'

export default function PageHeader({ eyebrow = 'Blackstar', title, description, action }) {
  return (
    <div className="blackstar-page-header relative mb-8 overflow-hidden rounded-[24px] border border-white/[.075] px-5 py-5 sm:px-6 lg:px-7">
      <div aria-hidden className="blackstar-page-header-glow" />
      <div aria-hidden className="blackstar-page-header-grid" />
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <AstraMark size={20} />
            <p className="astra-room-label text-violet-200/75">{eyebrow} · Intelligence infrastructure</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-.04em] text-white drop-shadow-[0_6px_24px_rgba(123,92,255,.18)] lg:text-[2rem]">{title}</h1>
          {description && <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-400/90">{description}</p>}
        </div>
        {action && <div className="astra-command-bar shrink-0">{action}</div>}
      </div>
    </div>
  )
}
