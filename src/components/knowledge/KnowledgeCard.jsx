import { Plus, RefreshCw, Share2, Trash2, Search, ListRestart } from 'lucide-react';
import { KB_ICONS, STATUS_STYLE, SOURCE_TYPES } from './knowledgeData';

export default function KnowledgeCard({ kb, onAction }) {
  const meta = KB_ICONS[kb.name];
  const I = meta?.icon;
  const st = STATUS_STYLE[kb.status] || STATUS_STYLE.Ready;
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 transition hover:bg-white/[.05]">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${meta?.grad} text-white`}>{I && <I className="h-5 w-5" />}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-white">{kb.name}</h3>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${st}`}>{kb.status}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <Stat label="Documents" value={kb.docs.toLocaleString()} />
        <Stat label="Web Sources" value={kb.web} />
        <Stat label="Databases" value={kb.databases} />
        <Stat label="Agents" value={kb.agents} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {kb.sources.map((sid) => {
          const s = SOURCE_TYPES.find((x) => x.id === sid);
          if (!s) return null;
          const SI = s.icon;
          return <span key={sid} className="flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400"><SI className="h-3 w-3" />{s.label}</span>;
        })}
      </div>

      <p className="mt-3 text-[10px] text-zinc-600">Last indexed {kb.lastIndexed}</p>

      <div className="mt-2.5 flex flex-wrap gap-1 border-t border-white/5 pt-2.5">
        <Btn icon={Plus} label="Add Source" onClick={() => onAction(kb, 'add')} />
        <Btn icon={ListRestart} label="Index" onClick={() => onAction(kb, 'index')} />
        <Btn icon={RefreshCw} label="Refresh" onClick={() => onAction(kb, 'refresh')} />
        <Btn icon={Search} label="Search" onClick={() => onAction(kb, 'search')} />
        <Btn icon={Share2} label="Share" onClick={() => onAction(kb, 'share')} />
        <Btn icon={Trash2} label="Delete" danger onClick={() => onAction(kb, 'delete')} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-2.5 py-1.5">
      <p className="text-[9px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Btn({ icon: Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition ${danger ? 'border-rose-400/20 text-rose-300 hover:bg-rose-400/10' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}>
      <Icon className="h-3 w-3" />{label}
    </button>
  );
}