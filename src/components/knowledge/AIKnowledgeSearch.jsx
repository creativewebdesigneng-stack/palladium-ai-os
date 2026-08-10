import { useState } from 'react';
import { Sparkles, Search, FileText, Globe, Link2, Quote, ChevronRight } from 'lucide-react';
import { AI_SEARCH_EXAMPLES, AI_SEARCH_RESULT, SOURCE_TYPES } from './knowledgeData';

const TYPE_ICON = { PDF: FileText, Web: Globe, DOCX: FileText, URL: Link2 };

export default function AIKnowledgeSearch() {
  const [q, setQ] = useState(AI_SEARCH_EXAMPLES[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(AI_SEARCH_RESULT);

  const run = (query) => {
    setQ(query);
    setLoading(true);
    setResult(null);
    setTimeout(() => { setResult(AI_SEARCH_RESULT); setLoading(false); }, 600);
  };

  const conf = result?.confidence ?? 0;
  const confColor = conf >= 0.8 ? 'text-emerald-400' : conf >= 0.5 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-400" />
        <h3 className="text-sm font-semibold text-white">AI Knowledge Search</h3>
        <span className="ml-auto text-[10px] text-zinc-500">natural language</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run(q)} placeholder="Ask anything across your knowledge bases…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-400/40" />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {AI_SEARCH_EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => run(ex)} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-400 transition hover:bg-white/5 hover:text-white">{ex}</button>
        ))}
      </div>

      {loading && <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500"><span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />Searching knowledge bases…</div>}

      {result && !loading && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Answer</p>
            <p className="text-xs leading-relaxed text-zinc-200">{result.answer}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Confidence</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${conf * 100}%` }} /></div>
            <span className={`text-[11px] font-semibold ${confColor}`}>{Math.round(conf * 100)}%</span>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Sources</p>
            <div className="space-y-1.5">
              {result.sources.map((s, i) => { const TI = TYPE_ICON[s.type] || FileText; return (
                <div key={i} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                  <div className="flex items-center gap-2">
                    <TI className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-[11px] font-medium text-white">{s.title}</span>
                    <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400">{s.kb}</span>
                  </div>
                  <p className="mt-1 flex items-start gap-1 text-[10px] text-zinc-500"><Quote className="mt-0.5 h-2.5 w-2.5 shrink-0" />{s.snippet}</p>
                </div>
              ); })}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Related documents</p>
            <div className="flex flex-wrap gap-1.5">
              {result.related.map((r) => (
                <span key={r} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-zinc-300"><ChevronRight className="h-3 w-3 text-zinc-600" />{r}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}