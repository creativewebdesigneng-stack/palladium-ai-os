import { useNavigate } from 'react-router-dom';
import { BookOpen, Newspaper, Radio, Search } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

export default function AINews() {
  const navigate = useNavigate();
  return (
    <>
      <PageHeader eyebrow="Intelligence" title="AI News & Research" description="A live news provider is not connected yet. Illustrative articles, browser-only bookmarks and simulated AI article actions have been removed." />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/[.08]"><Newspaper className="h-5 w-5 text-violet-300" /></div>
          <h2 className="text-xl font-semibold text-white">Source-backed news required</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">The previous feed used hard-coded article records and local saved state. PalladiumAI will only restore this feed when stories come from a live source with publication timestamps, canonical URLs and retained provenance for summaries and comparisons.</p>
          <div className="mt-6 space-y-3">
            {[
              [Radio, 'Fresh feed provider', 'Fetch current stories through a server-side provider with source and publication metadata.'],
              [BookOpen, 'Persisted reading state', 'Bookmarks and research notes must be stored per authenticated workspace rather than only in browser memory.'],
              [Search, 'Grounded AI actions', 'Summaries, explanations and comparisons must operate on fetched article text and retain citations to the underlying source.'],
            ].map(([Icon, title, text]) => <div key={title} className="flex gap-3 rounded-xl border border-white/10 bg-black/20 p-4"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" /><div><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{text}</p></div></div>)}
          </div>
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[.025] p-6">
          <h3 className="text-sm font-semibold text-white">Available now</h3>
          <div className="mt-4 space-y-2.5">
            <button onClick={() => navigate('/search')} className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/[.04]"><span className="text-sm font-medium text-white">Research setup</span><span className="mt-1 block text-[11px] text-zinc-500">See requirements for source-backed research and citations.</span></button>
            <button onClick={() => navigate('/knowledge')} className="w-full rounded-xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/[.04]"><span className="text-sm font-medium text-white">Private Knowledge</span><span className="mt-1 block text-[11px] text-zinc-500">Search real indexed workspace documents today.</span></button>
          </div>
        </section>
      </div>
    </>
  );
}
