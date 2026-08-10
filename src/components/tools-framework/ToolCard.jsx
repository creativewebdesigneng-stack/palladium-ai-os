import { Globe, FileText, BarChart3, Plug, Database, Code2, Power, Play } from 'lucide-react';
import { PERMISSION_META, PLAN_BADGE } from './toolsData';

const CATEGORY_ICON = {
  research: Globe, automation: Globe, api: Plug, knowledge: FileText, data: BarChart3,
  database: Database, development: Code2, commerce: Plug, communication: Plug, productivity: FileText,
};

export default function ToolCard({ tool, onOpen, onRun }) {
  const Icon = CATEGORY_ICON[tool.category] || Plug;
  const plan = PLAN_BADGE[tool.required_plan] || PLAN_BADGE.free;
  return (
    <div className={`pglass pcard p-4 rounded-2xl ${tool.enabled ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{tool.name}</p>
            <p className="text-[11px] text-zinc-500">{tool.category}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${plan.cls}`}>{plan.label}</span>
      </div>
      <p className="mt-2.5 line-clamp-2 text-xs text-zinc-400">{tool.description}</p>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {(tool.permissions || []).map((p) => {
          const M = PERMISSION_META[p];
          if (!M) return null;
          const I = M.icon;
          return <span key={p} className={`inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] ${M.color}`}><I className="h-3 w-3" />{p}</span>;
        })}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 text-[11px] ${tool.enabled ? 'text-emerald-400' : 'text-zinc-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tool.enabled ? 'bg-emerald-400' : 'bg-zinc-500'}`} />{tool.enabled ? 'Enabled' : 'Disabled'}
        </span>
        <div className="flex gap-1.5">
          <button onClick={() => onRun(tool)} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5"><Play className="mr-1 inline h-3 w-3" />Test</button>
          <button onClick={() => onOpen(tool)} className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5">Details</button>
        </div>
      </div>
    </div>
  );
}