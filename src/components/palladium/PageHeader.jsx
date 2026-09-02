export default function PageHeader({ eyebrow = 'Blackstar', title, description, action }) {
  return (
    <div className="relative mb-7 flex flex-col gap-5 border-b border-white/[.055] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="relative">
        <div aria-hidden className="absolute -left-4 top-0 h-12 w-px bg-gradient-to-b from-violet-300/55 to-transparent" />
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.28em] text-violet-300/75">{eyebrow} · Intelligence Infrastructure</p>
        <h1 className="text-2xl font-semibold tracking-[-.03em] text-white lg:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
