import { Pin, Pencil, Trash2, Database, FileText } from 'lucide-react';
import { IMPORTANCE_STYLE, CATEGORY_LABELS, VECTOR_STATUS_STYLE } from './memoryData';
import { typeMeta, scopeMeta, createdLabel, relTime } from './normalizeMemory';

export default function MemoryCard({ entry, onAction }) {
  const t = typeMeta(entry.memory_type);
  const s = scopeMeta(entry.scope);
  const imp = IMPORTANCE_STYLE[entry.importance] || IMPORTANCE_STYLE.medium;
  const vs = VECTOR_STATUS_STYLE[entry.vector_status] || VECTOR_STATUS_STYLE.disabled;
  const TI = t.icon;
  const SI = s.icon;

  return (
    <div className={`flex flex-col rounded-2xl border bg-white/[.03] p-4 transition hover:bg-white/[.05] ${entry.pinned ? 'border-violet-400/30' : 'border-white/10'}`}>
      <div className="flex items-start gap-2.5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.grad} text-white`}>{TI && <TI className="h-4 w-4" />}</span>
        <div className="min-w-0 flex-1">
          {entry.title && <p className="text-xs font-semibold text-white">{entry.title}</p>}
          <p className="text-sm text-white">{entry.content}</p>
          {entry.source && <p className="mt-1 text-[10px] text-zinc-500">{entry.source}</p>}
        </div>
        {entry.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-violet-400" />}
      </div>

      {entry.file_url && (
        <a href={entry.file_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 text-[11px] text-cyan-400 hover:underline">
          <FileText className="h-3 w-3" />Attached document
        </a>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${imp.bg} ${imp.text}`}><span className={`h-1.5 w-1.5 rounded-full ${imp.dot}`} />{imp.label}</span>
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-400">{t.label}</span>
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-400">{CATEGORY_LABELS[entry.category] || entry.category}</span>
        <span className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-zinc-400"><SI className="h-3 w-3" />{s.label}</span>
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-400">{entry.agent_name}</span>
        <span className={`rounded px-1.5 py-0.5 ${vs.cls}`}>{vs.label}</span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-[10px] text-zinc-600">
        <span>Created {createdLabel(entry.created)}</span>
        <span>Used {relTime(entry.lastUsed)}</span>
      </div>

      <div className="mt-2 flex gap-1">
        <ActionBtn icon={Pencil} label="Edit" onClick={() => onAction(entry, 'edit')} />
        <ActionBtn icon={Pin} label={entry.pinned ? 'Unpin' : 'Pin'} active={entry.pinned} onClick={() => onAction(entry, 'pin')} />
        <ActionBtn icon={Database} label="Index" onClick={() => onAction(entry, 'index')} />
        <ActionBtn icon={Trash2} label="Delete" danger onClick={() => onAction(entry, 'delete')} />
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, active, danger }) {
  return (
    <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium transition ${danger ? 'border-rose-400/20 text-rose-300 hover:bg-rose-400/10' : active ? 'border-violet-400/30 bg-violet-500/10 text-violet-200' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}>
      <Icon className="h-3 w-3" />{label}
    </button>
  );
}