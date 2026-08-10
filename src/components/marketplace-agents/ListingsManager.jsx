import { Download, Star, Pencil, Send, Trash2, ExternalLink } from 'lucide-react';
import { STATUSES } from './marketplaceData';

// The creator's own listings table: status badge, version, downloads, rating,
// price, required plan + per-row actions (edit, submit for review, remove,
// view live). Driven by real MarketplaceItem records.
export default function ListingsManager({ items, onEdit, onSubmit, onRemove }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
        <p className="text-sm font-medium text-white">No agents yet</p>
        <p className="mt-1 text-xs text-zinc-500">Click "New agent" to publish your first AI agent.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const s = STATUSES[it.status] || STATUSES.draft;
        return (
          <div key={it.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-white">{it.title}</h3>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>{s.label}</span>
                {it.status === 'rejected' && it.review_notes && <span className="truncate text-[10px] text-rose-400">“{it.review_notes}”</span>}
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-500">v{it.version || '1.0.0'} · {it.category}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1"><Download className="h-3 w-3" />{Number(it.downloads) || 0}</span>
                <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{Number(it.rating || 0).toFixed(1)} ({Number(it.reviews_count) || 0})</span>
                <span>{Number(it.price) === 0 ? 'Free' : `£${it.price}/mo`}</span>
                {it.required_plan && <span className="rounded bg-white/5 px-1.5 py-0.5 capitalize">{it.required_plan}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {it.status === 'published' && (
                <a href="/agent-marketplace" className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5"><ExternalLink className="h-3 w-3" />View</a>
              )}
              <button onClick={() => onEdit(it)} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5"><Pencil className="h-3 w-3" />Edit</button>
              {(it.status === 'draft' || it.status === 'rejected') && (
                <button onClick={() => onSubmit(it.id)} className="flex items-center gap-1 rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1.5 text-[11px] text-violet-200 hover:bg-violet-500/20"><Send className="h-3 w-3" />Submit</button>
              )}
              {it.status !== 'removed' && (
                <button onClick={() => onRemove(it.id)} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-rose-300 hover:bg-rose-500/10"><Trash2 className="h-3 w-3" />Remove</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}