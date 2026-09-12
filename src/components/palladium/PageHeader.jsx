export default function PageHeader({ eyebrow = 'Blackstar', title, description, action }) {
  return (
    <div className="blackstar-page-header relative mb-8 overflow-hidden rounded-[24px] border border-white/[.075] px-5 py-5 sm:px-6 lg:px-7">
      <div aria-hidden className="blackstar-page-header-glow" />
      <div aria-hidden className="blackstar-page-header-grid" />
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative min-w-0">
          <div aria-hidden className="absolute -left-3 top-1 h-11 w-px bg-gradient-to-b from-violet-300/80 via-violet-400/35 to-transparent" />
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.32em] text-violet-200/75">{eyebrow} · Intelligence Infrastructure</p>
          <h1 className="text-2xl font-semibold tracking-[-.04em] text-white drop-shadow-[0_6px_24px_rgba(139,92,246,.18)] lg:text-[2rem]">{title}</h1>
          {description && <p className="mt-2.5 max-w-3xl text-sm leading-6 text-zinc-400/90">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
