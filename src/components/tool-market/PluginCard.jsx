import { ShieldAlert, ShieldCheck, ShieldQuestion, Lock, Wrench } from 'lucide-react';

const RISK_STYLE = {
  low: { icon: ShieldCheck, cls: 'text-emerald-400' },
  medium: { icon: ShieldQuestion, cls: 'text-amber-400' },
  high: { icon: ShieldAlert, cls: 'text-rose-400' },
};

export default function PluginCard({ tool, onOpen }) {
  const risk = RISK_STYLE[tool.risk_level] || RISK_STYLE.low;
  const RiskIcon = risk.icon;
  return (
    <button onClick={() => onOpen(tool)} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 text-left transition hover:border-violet-400/30 hover:bg-white/[.05]">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white"><Wrench className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{tool.name}</h3>
          <p className="text-[10px] capitalize text-zinc-500">{tool.category}</p>
        </div>
        {!tool.is_active && <span className="rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] text-zinc-400">Inactive</span>}
      </div>

      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs text-zinc-400">{tool.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500">
        <span className={`flex items-center gap-1 capitalize ${risk.cls}`}><RiskIcon className="h-3 w-3" />{tool.risk_level} risk</span>
        {tool.requires_approval && <span className="flex items-center gap-0.5"><Lock className="h-3 w-3" />Needs approval</span>}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-[10px] font-medium capitalize text-violet-300">Min plan: {tool.min_plan || 'free'}</span>
        <span className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300">Details</span>
      </div>
    </button>
  );
}
