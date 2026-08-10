import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { rateMarketplaceAgent } from './api';
import { RatingStars, Panel } from './shared';

// Renders existing reviews + a star-rating + text submission form. Prevents
// a creator from reviewing their own agent. On submit, calls the
// rateMarketplaceAgent backend function (which recomputes the aggregate rating)
// and updates the local review list.
export default function ReviewForm({ agent }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reviews, setReviews] = useState(agent.reviews || []);

  const isOwner = !!(user && agent.creatorId && user.id === agent.creatorId);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const res = await rateMarketplaceAgent({ item_id: agent.id, rating, text });
      setReviews((res.item && res.item.reviews) || []);
      setText('');
      setRating(5);
      toast({ title: 'Review posted' });
    } catch (e) {
      toast({ title: 'Review failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Reviews" icon={Star}>
      {isOwner && (
        <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
          You can't review your own agent.
        </p>
      )}
      <div className="space-y-3">
        {reviews.length === 0 && <p className="text-xs text-zinc-600">No reviews yet — be the first.</p>}
        {reviews.map((r, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-white">{r.user_name || r.user || 'User'}</p>
              <RatingStars rating={r.rating} compact />
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">{r.text}</p>
            {r.date && <p className="mt-1 text-[10px] text-zinc-600">{new Date(r.date).toLocaleDateString()}</p>}
          </div>
        ))}
      </div>

      {!isOwner && (
        <form onSubmit={submit} className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} aria-label={`${n} stars`}>
                <Star className={`h-5 w-5 ${(hover || rating) >= n ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`} />
              </button>
            ))}
            <span className="ml-1 text-[11px] text-zinc-500">{rating}/5</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Share your experience with this agent…"
            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
            Post review
          </button>
        </form>
      )}
    </Panel>
  );
}