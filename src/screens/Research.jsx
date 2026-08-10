import { useState } from 'react';
import { Search, Sparkles, Bookmark, Download, Quote, Clock, Lightbulb } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import Panel from '@/components/palladium/Panel';

const sources = [
  { title: 'The state of AI in 2026 — McKinsey', url: 'mckinsey.com/ai-2026', snippet: 'Enterprise adoption of generative AI has tripled, with analytics-led workflows leading adoption.' },
  { title: 'AI analytics market report — Gartner', url: 'gartner.com/reports/ai-analytics', snippet: 'By 2027, 80% of analytics will be augmented by AI, reshaping the BI market.' },
  { title: 'Why teams switch to AI-first tools — Forbes', url: 'forbes.com/ai-first-tools', snippet: 'Speed and consolidation are the top two reasons teams migrate to unified AI workspaces.' },
];

const related = ['AI analytics vs traditional BI', 'Best AI workspaces 2026', 'How to evaluate AI agents', 'Unified AI platform ROI'];

export default function Research() {
  const [query, setQuery] = useState('AI analytics market trends 2026');
  const [run, setRun] = useState(true);

  return (
    <>
      <PageHeader eyebrow="AI" title="Research" description="Perplexity-style research with sources, citations, and export." />
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-[#15161f] p-2 shadow-2xl focus-within:border-violet-500/50">
          <Search className="ml-2 h-5 w-5 text-zinc-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={() => setRun(true)} className="h-11 flex-1 bg-transparent text-sm outline-none" />
          <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white">Search</button>
        </div>
        <div className="mt-3 flex gap-2">{['Deep research','Academic','News','Code'].map(t => <button key={t} className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400 hover:bg-white/5">{t}</button>)}</div>
      </div>

      <div className="mx-auto mt-6 max-w-3xl space-y-4">
        <Panel title="Answer" subtitle="Synthesized from 3 sources">
          <div className="space-y-2 text-sm leading-7 text-zinc-300">
            <p>The AI analytics market in 2026 is defined by rapid consolidation: teams are moving from fragmented BI tools toward unified, AI-first workspaces<sup className="text-violet-400">[1]</sup>. Adoption has tripled year over year, with analytics-led workflows leading<sup className="text-violet-400">[2]</sup>.</p>
            <p>Top reasons teams switch include speed, consolidation, and agent-driven automation<sup className="text-violet-400">[3]</sup>.</p>
          </div>
          <div className="mt-4 flex gap-2"><button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><Bookmark className="h-3.5 w-3.5" />Save</button><button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><Download className="h-3.5 w-3.5" />Export</button></div>
        </Panel>

        <Panel title="Sources" subtitle="Cited and ranked by relevance">
          <div className="space-y-3">{sources.map((s, i) => (
            <div key={s.url} className="rounded-xl border border-white/10 p-3">
              <div className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded bg-violet-500/15 text-xs text-violet-300">{i + 1}</span><a href="#" className="text-sm font-medium text-white hover:underline">{s.title}</a></div>
              <p className="mt-1.5 text-xs text-zinc-400">{s.snippet}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-600"><Quote className="h-3 w-3" />{s.url}</p>
            </div>
          ))}</div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title="Research timeline"><div className="space-y-2 text-xs text-zinc-400">{['Searched 14 sources','Ranked by relevance','Synthesized answer','Generated citations'].map((s, i) => <div key={s} className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-cyan-400" />{s}<span className="ml-auto text-zinc-600">{(i + 1) * 0.4}s</span></div>)}</div></Panel>
          <Panel title="Related searches"><div className="space-y-1.5">{related.map(r => <button key={r} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-white/5"><Lightbulb className="h-3.5 w-3.5 text-violet-400" />{r}</button>)}</div></Panel>
        </div>
      </div>
    </>
  );
}