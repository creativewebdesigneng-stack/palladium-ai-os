import { useState } from 'react';
import { Check, X, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { reviewMarketplaceAgent } from './api';
import { STATUSES } from './marketplaceData';

// Admin review queue. Each pending submission shows metadata, features and a
// review-notes field; admins can approve (-> published), reject (-> rejected,
// notes shown to creator) or remove (-> removed).
export default function ReviewQueue({ items, onDone }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(null);
  const [notes, setNotes] = useState({});

  const act = async (id, action) => {
    setBusy(`${id}:${action}`);
    try {
      await reviewMarketplaceAgent({ item_id: id, action, notes: notes[id] || '' });
      toast({ title: action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Removed' });
      onDone?.();
    } catch (e) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center">
        <p className="text-sm font-medium text-white">Nothing to review</p>
        <p className="mt-1 text-xs text-zinc-500">Submitted agents will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((it) => {
        const s = STATUSES[it.status] || STATUSES.draft;
        return (
          <div key={it.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-white">{it.title}</h3>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>{s.label}</span>
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">by {it.creator_name} · v{it.version || '1.0.0'} · {it.category} · {Number(it.price) === 0 ? 'Free' : `£${it.price}/mo`} · {it.required_plan || 'free'} plan</p>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{it.description}</p>
                {it.features && it.features.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">{it.features.slice(0, 6).map((f) => <span key={f} className="rounded-lg border border-white/10 bg-white/[.04] px-2 py-0.5 text-[10px] text-zinc-300">{f}</span>)}</div>
                )}
                <input
                  value={notes[it.id] || ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [it.id]: e.target.value }))}
                  placeholder="Review notes (shown to creator on reject)…"
                  className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none"
                />
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => act(it.id, 'approve')} disabled={busy === `${it.id}:approve`} className="flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50">{busy === `${it.id}:approve` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Approve</button>
                <button onClick={() => act(it.id, 'reject')} disabled={busy === `${it.id}:reject`} className="flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-200 hover:bg-rose-500/20 disabled:opacity-50">{busy === `${it.id}:reject` ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}Reject</button>
                <button onClick={() => act(it.id, 'remove')} disabled={busy === `${it.id}:remove`} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5 disabled:opacity-50"><Trash2 className="h-3 w-3" />Remove</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}