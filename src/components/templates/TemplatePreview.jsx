import { X, Star, ArrowRight, Heart, Share2 } from 'lucide-react';

export default function TemplatePreview({ t, onClose, onUse, onFav, favs }) {
  if (!t) return null;
  const fav = favs.includes(t.id);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0c0d13]">
        <div className={`relative h-44 bg-gradient-to-br ${t.grad} p-4`}>
          <div className="absolute inset-0 bg-black/10" />
          <button onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-black/30 text-white/90 backdrop-blur hover:text-white"><X className="h-4 w-4" /></button>
          <div className="relative flex h-full flex-col justify-end">
            <span className="mb-2 w-fit rounded-md bg-black/30 px-2 py-0.5 text-[10px] text-white backdrop-blur">{t.category}</span>
            <p className="text-lg font-semibold text-white drop-shadow">{t.preview.hero}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">{t.name}</h3>
              <p className="text-[11px] text-zinc-500">by {t.creator}</p>
            </div>
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${t.price === 'Free' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-violet-400/10 text-violet-300'}`}>{t.price}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-400">
            <span className="flex items-center gap-0.5 text-amber-300"><Star className="h-3 w-3 fill-amber-300" />{t.rating}</span>
            <span>{t.uses.toLocaleString()} uses</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-zinc-300">{t.desc}</p>

          <p className="mt-4 mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Includes</p>
          <div className="flex flex-wrap gap-1">{t.preview.sections.map(s => <span key={s} className="rounded-md border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] text-zinc-300">{s}</span>)}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-white/10 p-3">
          <button onClick={() => onFav(t.id)} className={`flex items-center justify-center gap-1 rounded-xl border py-2.5 text-xs ${fav ? 'border-rose-400/20 bg-rose-400/10 text-rose-300' : 'border-white/10 text-zinc-300 hover:bg-white/5'}`}><Heart className={`h-3.5 w-3.5 ${fav ? 'fill-rose-400' : ''}`} />{fav ? 'Saved' : 'Save'}</button>
          <button onClick={() => navigator.clipboard?.writeText(window.location.origin + '/templates#' + t.id)} className="flex items-center justify-center gap-1 rounded-xl border border-white/10 py-2.5 text-xs text-zinc-300 hover:bg-white/5"><Share2 className="h-3.5 w-3.5" />Share</button>
          <button onClick={() => { onUse(t); onClose(); }} className="flex items-center justify-center gap-1 rounded-xl bg-violet-500 py-2.5 text-xs font-medium text-white hover:bg-violet-600"><ArrowRight className="h-3.5 w-3.5" />Use template</button>
        </div>
      </div>
    </div>
  );
}