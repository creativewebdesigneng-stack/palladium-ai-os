import { Star, ExternalLink } from 'lucide-react';

const PRICE_COLOR = { Free: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20', Paid: 'text-sky-300 bg-sky-400/10 border-sky-400/20', Freemium: 'text-violet-300 bg-violet-400/10 border-violet-400/20', 'Open Source': 'text-amber-300 bg-amber-400/10 border-amber-400/20', Enterprise: 'text-fuchsia-300 bg-fuchsia-400/10 border-fuchsia-400/20' };

export default function ToolCard({ tool }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 hover:border-violet-400/30">
      <div className="flex items-start gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tool.grad} text-sm font-semibold text-white`}>{tool.name[0]}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold text-white">{tool.name}</h3>
          <p className="text-[11px] text-zinc-500">{tool.category}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${PRICE_COLOR[tool.pricing]}`}>{tool.pricing}</span>
      </div>
      <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-zinc-400">{tool.desc}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {tool.capabilities.map(c => <span key={c} className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-zinc-400">{c}</span>)}
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1 text-amber-300"><Star className="h-3.5 w-3.5 fill-current" />{tool.rating}</span>
        <span className="truncate">{tool.website}</span>
        <a href={`https://${tool.website}`} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-violet-300 hover:underline">Visit <ExternalLink className="h-3 w-3" /></a>
      </div>
    </div>
  );
}