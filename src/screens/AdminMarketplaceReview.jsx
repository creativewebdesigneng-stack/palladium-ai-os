import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import { listPendingListings } from '@/components/marketplace-agents/api';
import ReviewQueue from '@/components/marketplace-agents/ReviewQueue';

// Admin marketplace moderation: review submitted agents (pending_review) and
// moderate published / rejected / removed listings. Approve / reject / remove
// go through the reviewMarketplaceAgent backend function (admin-only).
export default function AdminMarketplaceReview() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending_review');

  const load = useCallback(async () => {
    try {
      setItems(await listPendingListings(tab));
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageHeader eyebrow="Admin" title="Marketplace Review" description="Approve, reject and moderate agent submissions." />
      <div className="mb-5 flex gap-1.5">
        {['pending_review', 'published', 'rejected', 'removed'].map((s) => (
          <button key={s} onClick={() => setTab(s)} className={`rounded-xl px-3.5 py-2 text-sm capitalize ${tab === s ? 'bg-white text-black' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}>{s.replace('_', ' ')}</button>
        ))}
      </div>
      {loading ? <div className="text-sm text-zinc-500">Loading…</div> : <ReviewQueue items={items} onDone={load} />}
    </>
  );
}