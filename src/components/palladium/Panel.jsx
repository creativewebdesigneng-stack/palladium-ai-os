export default function Panel({ title, subtitle, children, className = '' }) {
  return (
    <section className={`relative overflow-hidden rounded-2xl border border-white/[.07] bg-gradient-to-br from-white/[.045] via-white/[.018] to-violet-500/[.018] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_18px_60px_rgba(0,0,0,.18)] backdrop-blur-xl ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/20 to-transparent" />
      <div className="relative mb-4">
        <h2 className="text-sm font-medium tracking-tight text-zinc-100">{title}</h2>
        {subtitle && <p className="mt-1 text-xs leading-5 text-zinc-600">{subtitle}</p>}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}
