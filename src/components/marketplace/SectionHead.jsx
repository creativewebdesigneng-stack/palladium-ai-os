export default function SectionHead({ icon: Icon, title, count, action, grad = 'from-violet-500 to-indigo-500' }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${grad} text-white`}>
        {Icon && <Icon className="h-4 w-4" />}
      </span>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {count !== undefined && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-zinc-500">{count}</span>}
      <div className="ml-auto">{action}</div>
    </div>
  );
}