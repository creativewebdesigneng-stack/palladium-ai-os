import { useNavigate } from 'react-router-dom';
import { BookOpen, Newspaper, Radio, Search } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function AINews() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader eyebrow="Blackstar Research" title="Intelligence Research" description="A live news provider is not connected yet. Blackstar only presents source-backed research with retained provenance instead of illustrative feeds or simulated article actions." />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <section className="relative overflow-hidden rounded-[24px] border border-violet-300/10 bg-black/35 p-6 backdrop-blur-xl"><div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/20 to-transparent" /><div className="mb-5 grid h-11 w-11 place-items-center rounded-xl border border-violet-300/15 bg-violet-400/[.07]"><Newspaper className="h-5 w-5 text-violet-300" /></div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/60">Provenance required</p><h2 className="mt-2 text-xl font-semibold text-white">Source-backed intelligence only</h2><p className="mt-2 text-sm leading-6 text-zinc-500">The previous feed used hard-coded article records and browser-only saved state. Blackstar will restore the feed only when stories come from live sources with publication timestamps, canonical URLs and retained provenance for summaries and comparisons.</p>
          <div className="mt-6 space-y-3">{[[Radio,'Fresh feed provider','Fetch current stories through a server-side provider with source and publication metadata.'],[BookOpen,'Persisted research state','Bookmarks and research notes must be stored per authenticated workspace rather than only in browser memory.'],[Search,'Grounded intelligence actions','Summaries, explanations and comparisons must operate on fetched article text and retain citations to the underlying source.']].map(([Icon,title,text])=><div key={title} className="flex gap-3 rounded-xl border border-violet-300/[.08] bg-black/25 p-4"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /><div><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div></div>)}</div>
        </section>
        <section className="relative overflow-hidden rounded-[24px] border border-violet-300/10 bg-black/35 p-6 backdrop-blur-xl"><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-violet-300/60">Available now</p><h3 className="mt-2 text-sm font-semibold text-white">Live research surfaces</h3><div className="mt-4 space-y-2.5"><button onClick={()=>navigate('/search')} className="w-full rounded-xl border border-violet-300/[.08] bg-black/25 p-4 text-left hover:bg-violet-400/[.035]"><span className="text-sm font-medium text-white">Research setup</span><span className="mt-1 block text-[11px] text-zinc-500">See requirements for source-backed research and citations.</span></button><button onClick={()=>navigate('/knowledge')} className="w-full rounded-xl border border-violet-300/[.08] bg-black/25 p-4 text-left hover:bg-violet-400/[.035]"><span className="text-sm font-medium text-white">Private Knowledge</span><span className="mt-1 block text-[11px] text-zinc-500">Search real indexed workspace documents today.</span></button></div></section>
      </div>
    </>
  );
}
