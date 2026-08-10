import { useState } from 'react';
import { Globe, FileText, ImageIcon, Play, Newspaper, BookmarkPlus, Info } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import SearchBar from '@/components/web/SearchBar';
import AIAnswer from '@/components/web/AIAnswer';
import SourceCards from '@/components/web/SourceCards';
import { WebTab, NewsTab, ImagesTab, VideosTab, SourcesTab } from '@/components/web/ResultsTabs';
import { SearchHistory, SavedSearches } from '@/components/web/SearchHistory';

const TABS = [
  { id: 'web', label: 'Web Results', icon: Globe },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'videos', label: 'Videos', icon: Play },
  { id: 'sources', label: 'Sources', icon: FileText },
];

export default function Web() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('web');
  const [toast, setToast] = useState(null);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const run = (q) => {
    const term = (typeof q === 'string' ? q : query).trim();
    if (!term) return;
    setQuery(term);
    setActiveQuery(term);
    setLoading(true);
    setTab('web');
    setTimeout(() => setLoading(false), 900);
  };

  const pickHistory = (q) => run(q);

  const saveCurrent = () => {
    if (!activeQuery) return;
    flash('Search saved');
  };

  return (
    <>
      <PageHeader
        eyebrow="Discovery"
        title="PalladiumAI Web"
        description="AI-powered web discovery — ask anything in natural language and get a synthesised answer with sources, results, news, images and videos."
        action={activeQuery ? (
          <button onClick={saveCurrent} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-zinc-300 hover:bg-white/5"><BookmarkPlus className="h-4 w-4" />Save search</button>
        ) : null}
      />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Results are illustrative mock data. The interface is backend-ready for a future web search integration.</p></div>

      <SearchBar query={query} setQuery={setQuery} onSearch={run} loading={loading} />

      {!activeQuery ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 ring-1 ring-violet-400/20"><Globe className="h-8 w-8 text-violet-400" /></span>
          <p className="mt-4 text-sm text-zinc-400">Ask a question above to get an AI answer with sources and results.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_17rem]">
          <div className="min-w-0 space-y-5">
            <AIAnswer loading={loading} />
            <SourceCards loading={loading} />

            <div className="flex flex-wrap gap-1.5 border-b border-white/10 pb-2">
              {TABS.map(t => { const I = t.icon; return (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium ${tab === t.id ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:text-white'}`}><I className="h-3.5 w-3.5" />{t.label}</button>
              );})}
            </div>

            {tab === 'web' && <WebTab loading={loading} />}
            {tab === 'news' && <NewsTab loading={loading} />}
            {tab === 'images' && <ImagesTab loading={loading} />}
            {tab === 'videos' && <VideosTab loading={loading} />}
            {tab === 'sources' && <SourcesTab loading={loading} />}
          </div>

          <div className="space-y-4">
            <SearchHistory onPick={pickHistory} />
            <SavedSearches onPick={pickHistory} />
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}