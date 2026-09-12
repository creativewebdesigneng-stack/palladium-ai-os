export default function Panel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`blackstar-panel group relative overflow-hidden rounded-[22px] border border-white/[.075] p-5 backdrop-blur-2xl ${className}`}>
      <div aria-hidden className="blackstar-panel-highlight" />
      <div aria-hidden className="blackstar-panel-depth" />
      <div className="relative z-10 mb-4">
        <h2 className="text-sm font-medium tracking-[-.015em] text-zinc-100">{title}</h2>
        {subtitle && <p className="mt-1 text-xs leading-5 text-zinc-500">{subtitle}</p>}
      </div>
      <div className="relative z-10">{children}</div>
    </section>
  );
}
