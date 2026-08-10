import { LayoutTemplate, Plus } from 'lucide-react';
import { TEMPLATES, TRIGGERS } from './workflowsData';

export default function WorkflowTemplates({ onUse }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <LayoutTemplate className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">Workflow templates</h3>
        <span className="text-xs text-zinc-500">{TEMPLATES.length} ready to use</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => {
          const trig = (TRIGGERS.find((x) => x.label === t.trigger) || {}).icon || LayoutTemplate;
          const T = trig;
          return (
            <div key={t.name} className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><T className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{t.name}</p><p className="text-[10px] text-zinc-500">{t.category} · {t.trigger}</p></div>
              </div>
              <p className="mt-2 flex-1 text-[11px] text-zinc-500">{t.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[10px] text-zinc-600">{t.nodes} nodes</span>
                <button onClick={() => onUse && onUse(t)} className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/10"><Plus className="h-3 w-3" />Use template</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}