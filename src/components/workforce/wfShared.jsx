export function SectionHead({ icon: Icon, title, desc, action }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="h-4 w-4 text-violet-400" />
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {desc && <span className="text-xs text-zinc-500">· {desc}</span>}
      {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
    </div>
  );
}

export function MiniAvatar({ letter, grad, size = 'h-9 w-9', text = 'text-sm' }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-xl bg-gradient-to-br ${grad} ${text} font-semibold text-white shadow-lg shadow-black/30`}>
      {letter}
    </span>
  );
}