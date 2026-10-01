import { AstraMark } from '@/components/blackstar/AstraMark'

export default function PageHeader({ eyebrow = 'Blackstar', title, description, action }) {
  return (
    <div className="blackstar-page-header relative mb-8 overflow-hidden rounded-[26px] border border-white/[.075] px-5 py-5 sm:px-6 sm:py-6 lg:px-7">
      <div aria-hidden className="blackstar-page-header-glow" />
      <div aria-hidden className="blackstar-page-header-grid" />
      <div aria-hidden className="blackstar-page-header-orbit blackstar-page-header-orbit-a" />
      <div aria-hidden className="blackstar-page-header-orbit blackstar-page-header-orbit-b" />
      <div aria-hidden className="blackstar-page-header-horizon" />
      <div aria-hidden className="blackstar-corner-mark blackstar-corner-mark-tl" />
      <div aria-hidden className="blackstar-corner-mark blackstar-corner-mark-br" />

      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative min-w-0">
          <div className="mb-3.5 flex items-center gap-3">
            <span className="blackstar-page-header-mark grid h-8 w-8 place-items-center rounded-xl border border-violet-300/10 bg-violet-400/[.04]">
              <AstraMark size={18} />
            </span>
            <div className="min-w-0">
              <p className="astra-room-label truncate text-violet-200/75">{eyebrow}</p>
              <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[.24em] text-zinc-700">Intelligence infrastructure</p>
            </div>
          </div>
          <h1 className="max-w-4xl text-2xl font-semibold tracking-[-.045em] text-white drop-shadow-[0_8px_28px_rgba(123,92,255,.18)] lg:text-[2.05rem]">
            {title}
          </h1>
          {description && <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-400/90">{description}</p>}
        </div>
        {action && <div className="astra-command-bar shrink-0">{action}</div>}
      </div>

      <div aria-hidden className="blackstar-page-header-status relative z-10 mt-5 flex items-center gap-2 border-t border-white/[.045] pt-3">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-300/70 shadow-[0_0_12px_rgba(196,181,253,.6)]" />
        <span className="text-[8px] font-semibold uppercase tracking-[.22em] text-zinc-700">Blackstar operational surface</span>
        <span className="ml-auto hidden text-[8px] uppercase tracking-[.18em] text-zinc-800 sm:block">Astra governed execution</span>
      </div>
    </div>
  )
}
