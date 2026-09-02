import React from 'react'

const cx = (...parts) => parts.filter(Boolean).join(' ')

export function PrimarySurfaceFrame({ eyebrow = 'BLACKSTAR', title, description, actions, children, className = '' }) {
  return (
    <section className={cx('relative overflow-hidden rounded-[28px] border border-white/10 bg-black/45 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-7', className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.045),transparent_35%)]" />
      <div className="relative">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-violet-300/80">{eyebrow}</div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">{title}</h1>
            {description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58 sm:text-base">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        <div className="mt-7">{children}</div>
      </div>
    </section>
  )
}

export function SurfaceGrid({ children, className = '' }) {
  return <div className={cx('grid gap-4 md:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
}

export function IntelligenceTile({ label, value, detail, tone = 'neutral', className = '' }) {
  const toneClasses = {
    neutral: 'border-white/8 bg-white/[0.035]',
    violet: 'border-violet-400/20 bg-violet-400/[0.07]',
    emerald: 'border-emerald-400/20 bg-emerald-400/[0.06]',
    amber: 'border-amber-400/20 bg-amber-400/[0.06]',
  }

  return (
    <div className={cx('rounded-2xl border p-4 backdrop-blur-xl', toneClasses[tone] || toneClasses.neutral, className)}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/42">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{value}</div>
      {detail ? <div className="mt-2 text-xs leading-5 text-white/48">{detail}</div> : null}
    </div>
  )
}

export function StatusRail({ items = [], className = '' }) {
  return (
    <div className={cx('rounded-2xl border border-white/8 bg-black/30 p-3', className)}>
      <div className="grid gap-2 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2.5">
            <span className="h-2 w-2 rounded-full bg-violet-300 shadow-[0_0_18px_rgba(196,181,253,0.7)]" />
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-white/78">{item.label}</div>
              <div className="truncate text-[11px] text-white/38">{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
