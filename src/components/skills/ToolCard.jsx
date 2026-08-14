import { STATUS_STYLE, CATEGORIES } from './skillsData';

export default function ToolCard({ tool, onOpen }) {
  const st = STATUS_STYLE[tool.status] ?? STATUS_STYLE.Disabled;
  const cat = CATEGORIES.find((c) => c.id === tool.category);
  const CI = cat?.icon;
  const permissions = tool.permissions ?? [];
  const agentNames = tool.agentNames ?? [];
  return (
    <button onClick={() => onOpen(tool)} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition hover:border-violet-400/30 hover:bg-white/[.05]">
      <div className="flex items-start gap-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-violet-300 ring-1 ring-violet-400/20">{CI && <CI className="h-5 w-5" />}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{tool.name}</p>
          <p className="text-[10px] text-zinc-500">{tool.version ? `v${tool.version} · ` : ''}{tool.category}</p>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{tool.status}</span>
      </div>
      <p className="mt-2.5 line-clamp-2 flex-1 text-[11px] text-zinc-500">{tool.description}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {permissions.map((p) => <span key={p} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400">{p}</span>)}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[10px] text-zinc-500">
        <span>{agentNames.length === 0 ? 'No agents assigned' : `${agentNames.length} agent${agentNames.length === 1 ? '' : 's'} using`}</span>
        <span className="flex -space-x-1.5">
          {agentNames.slice(0, 3).map((n) => <span key={n} className="grid h-5 w-5 place-items-center rounded-full bg-violet-500/20 text-[9px] text-violet-200 ring-1 ring-[#0c0d13]">{n[0]}</span>)}
        </span>
      </div>
    </button>
  );
}