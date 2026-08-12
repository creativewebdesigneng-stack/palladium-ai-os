import { Link } from 'react-router-dom';
import { X, ShieldAlert, ShieldCheck, ShieldQuestion, Lock, Wrench, Settings } from 'lucide-react';

const RISK_STYLE = {
  low: { icon: ShieldCheck, cls: 'text-emerald-400' },
  medium: { icon: ShieldQuestion, cls: 'text-amber-400' },
  high: { icon: ShieldAlert, cls: 'text-rose-400' },
};

export default function PluginDetailDrawer({ tool, onClose }) {
  if (!tool) return null;
  const risk = RISK_STYLE[tool.risk_level] || RISK_STYLE.low;
  const RiskIcon = risk.icon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0d13] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-white/10 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white"><Wrench className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-white">{tool.name}</h2>
            <p className="text-[10px] capitalize text-zinc-500">{tool.category} · {tool.kind}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs leading-relaxed text-zinc-300">{tool.description}</p>

          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <h3 className="mb-3 text-xs font-semibold text-white">Details</h3>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between"><dt className="text-zinc-500">Status</dt><dd className={tool.is_active ? 'text-emerald-400' : 'text-zinc-500'}>{tool.is_active ? 'Active' : 'Inactive'}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Risk level</dt><dd className={`flex items-center gap-1 capitalize ${risk.cls}`}><RiskIcon className="h-3.5 w-3.5" />{tool.risk_level}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Minimum plan</dt><dd className="capitalize text-zinc-200">{tool.min_plan || 'free'}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-500">Approval required</dt><dd className="flex items-center gap-1 text-zinc-200">{tool.requires_approval ? <><Lock className="h-3.5 w-3.5" />Yes</> : 'No'}</dd></div>
            </dl>
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] p-4 text-center">
            <p className="text-xs text-zinc-500">Enable this tool for an agent and configure permissions from Tools & Integrations.</p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-white/10 p-4">
          <Link to="/tools-framework" onClick={onClose} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-2.5 text-xs font-medium text-white">
            <Settings className="h-3.5 w-3.5" />Manage in Tools & Integrations
          </Link>
        </div>
      </div>
    </div>
  );
}
