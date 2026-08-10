import { STATUSES, STATUS_STYLE } from './workflowsData';

export default function WorkflowsStatusTabs({ status, onStatus, counts }) {
  const tabs = ['All', ...STATUSES];
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => {
        const st = STATUS_STYLE[t] || null;
        const active = status === t;
        return (
          <button key={t} onClick={() => onStatus(t)} className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition ${active ? 'bg-white text-black' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>
            {st && <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />}
            {t} <span className={active ? 'opacity-60' : 'text-zinc-600'}>{counts[t] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}