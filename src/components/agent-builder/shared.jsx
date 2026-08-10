export function SectionTitle({ icon: Icon, title, desc }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/15 ring-1 ring-violet-400/20">{Icon && <Icon className="h-3.5 w-3.5 text-violet-300" />}</span>
      <div><h3 className="text-xs font-semibold text-white">{title}</h3>{desc && <p className="text-[10px] text-zinc-500">{desc}</p>}</div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-zinc-400">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-zinc-600">{hint}</p>}
    </div>
  );
}

export function inputCls() {
  return 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none';
}

export function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-violet-500' : 'bg-white/10'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[1.125rem]' : 'left-0.5'}`} />
    </button>
  );
}

export function Pill({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${active ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'}`}>{children}</button>
  );
}