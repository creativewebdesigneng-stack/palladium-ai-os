import { X, Star, Download, BadgeCheck, Sparkles, Shield, TrendingUp, Crown, Zap } from 'lucide-react';
import { creatorById, REVIEWS } from './marketData';

const TAG_ICON = { featured: Crown, trending: TrendingUp, popular: Star, new: Sparkles, free: Zap, enterprise: Shield };

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => <Star key={n} className={`h-3.5 w-3.5 ${n <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />)}
      <span className="ml-1 text-xs font-medium text-zinc-200">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function ItemDetailDrawer({ item, onClose, onInstall }) {
  if (!item) return null;
  const c = creatorById(item.creator);
  const isFree = item.free;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0c0d13] p-5">
        <div className="flex items-start gap-3">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${item.grad}`}><Sparkles className="h-6 w-6 text-white" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-white">{item.name}</p>
            <p className="flex items-center gap-1 text-[11px] text-zinc-500">{c.name}{c.verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-400" />}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {item.tags.map(t => { const I = TAG_ICON[t] || Star; return (
            <span key={t} className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] font-medium capitalize text-zinc-300"><I className="h-2.5 w-2.5" />{t}</span>
          );})}
        </div>

        <p className="mt-3 text-[13px] text-zinc-300">{item.desc}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-white/10 bg-white/[.03] py-3"><Stars rating={item.rating} /><p className="mt-1 text-[10px] text-zinc-500">{item.reviews} reviews</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] py-3"><p className="flex items-center justify-center gap-1 text-sm font-semibold text-white"><Download className="h-4 w-4 text-zinc-400" />{item.downloads}</p><p className="mt-1 text-[10px] text-zinc-500">Downloads</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] py-3"><p className="text-sm font-semibold text-emerald-300">{item.price}</p><p className="mt-1 text-[10px] text-zinc-500">Pricing</p></div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Capabilities</p>
          <div className="flex flex-wrap gap-1.5">
            {item.capabilities.map(cap => <span key={cap} className="rounded-lg border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-zinc-300">{cap}</span>)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-zinc-500">Models</p><p className="mt-0.5 text-zinc-200">{item.models}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-zinc-500">Updated</p><p className="mt-0.5 text-zinc-200">{item.updated}</p></div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => { onInstall(item); onClose(); }} className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${isFree ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white' : 'bg-white text-black'}`}>{isFree ? 'Install' : `Purchase · ${item.price}`}</button>
          <button className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-zinc-300 hover:bg-white/5">Save</button>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Creator</p>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${c.grad} text-xs font-semibold text-white`}>{c.name.split(' ').map(n => n[0]).join('').slice(0,2)}</span>
            <div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-[13px] font-medium text-white">{c.name}{c.verified && <BadgeCheck className="h-3.5 w-3.5 text-sky-400" />}</p><p className="text-[11px] text-zinc-500">{c.handle} · {c.followers} followers</p></div>
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5">Follow</button>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Reviews</p>
          <div className="space-y-3">
            {REVIEWS.map((r, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                <div className="flex items-center gap-2">
                  <span className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br ${r.avatarGrad} text-[10px] font-semibold text-white`}>{r.author.split(' ').map(n => n[0]).join('')}</span>
                  <p className="text-[12px] font-medium text-white">{r.author}</p>
                  {r.verified && <BadgeCheck className="h-3 w-3 text-sky-400" />}
                  <span className="ml-auto text-[10px] text-zinc-500">{r.date}</span>
                </div>
                <Stars rating={r.rating} />
                <p className="mt-1.5 text-[11px] text-zinc-400">{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}