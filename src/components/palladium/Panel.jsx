export default function Panel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`blackstar-panel group relative overflow-hidden rounded-[22px] border border-white/[.075] p-5 backdrop-blur-2xl ${className}`}>
      <div aria-hidden className="blackstar-panel-highlight" />
      <div aria-hidden className="blackstar-panel-depth" />
      <div aria-hidden className="blackstar-panel-scan" />
      <div aria-hidden className="blackstar-corner-mark blackstar-corner-mark-tl" />
      <div aria-hidden className="blackstar-corner-mark blackstar-corner-mark-br" />
      <div className="relative z-10 mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium tracking-[-.015em] text-zinc-100">{title}</h2>
          {subtitle && <p className="mt-1 text-xs leading-5 text-zinc-500">{subtitle}</p>}
        </div>
        <span aria-hidden className="mt-1 flex shrink-0 items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-zinc-700" />
          <span className="h-1 w-1 rounded-full bg-violet-300/45" />
          <span className="h-1 w-4 rounded-full bg-gradient-to-r from-violet-300/20 to-transparent" />
        </span>
      </div>
      <div className="relative z-10">{children}</div>
    </section>
  )
}
