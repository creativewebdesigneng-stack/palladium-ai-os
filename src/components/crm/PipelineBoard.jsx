import { PIPELINE, STAGE_TONE, DEALS } from './crmData';

export default function PipelineBoard({ onOpenDeal }) {
  const byStage = (s) => DEALS.filter((d) => d.stage === s);
  const total = DEALS.filter((d) => d.stage !== 'Lost').reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Pipeline</h3>
          <p className="text-[11px] text-zinc-500">Open value ${(total / 1000).toFixed(0)}k across {PIPELINE.length} stages</p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE.map((stage) => {
          const deals = byStage(stage);
          const sum = deals.reduce((s, d) => s + d.value, 0);
          return (
            <div key={stage} className="w-56 shrink-0">
              <div className={`mb-2 flex items-center gap-2 rounded-xl bg-gradient-to-r ${STAGE_TONE[stage]} px-2.5 py-1.5`}>
                <span className="text-[11px] font-medium">{stage}</span>
                <span className="ml-auto rounded-full bg-black/30 px-1.5 py-px text-[10px]">{deals.length}</span>
              </div>
              <div className="space-y-2">
                {deals.map((d) => (
                  <button key={d.id} onClick={() => onOpenDeal?.(d)} className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-left hover:border-violet-400/30 hover:bg-white/5">
                    <p className="text-[12px] font-medium text-white">{d.name}</p>
                    <p className="text-[10px] text-zinc-500">{d.company}</p>
                    <div className="mt-2 flex items-center gap-2 text-[10px]">
                      <span className="text-emerald-300">${(d.value / 1000).toFixed(0)}k</span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-500">{d.owner}</span>
                    </div>
                  </button>
                ))}
                {!deals.length && <p className="rounded-xl border border-dashed border-white/10 px-2.5 py-3 text-center text-[10px] text-zinc-600">No deals</p>}
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-600">Total ${(sum / 1000).toFixed(0)}k</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}