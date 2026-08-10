import { useState, useMemo } from 'react';
import { Info, Bookmark } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ArticleCard from '@/components/news-research/ArticleCard';
import AIPanel from '@/components/news-research/AIPanel';
import { SECTIONS, ARTICLES } from '@/components/news-research/newsData';

export default function AINews() {
  const [section, setSection] = useState('all');
  const [active, setActive] = useState(null);   // { article, action }
  const [saved, setSaved] = useState({});
  const [onlySaved, setOnlySaved] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const filtered = useMemo(() => ARTICLES.filter(a =>
    (section === 'all' || a.section === section) && (!onlySaved || saved[a.id])
  ), [section, onlySaved, saved]);

  const handleAction = (article, action) => {
    if (action === 'save') {
      setSaved(s => ({ ...s, [article.id]: !s[article.id] }));
      flash(saved[article.id] ? 'Removed from saved' : 'Article saved');
      return;
    }
    setActive({ article, action });
  };

  const current = active ? active.article : null;
  const toggleSavedInPanel = () => {
    setSaved(s => ({ ...s, [current.id]: !s[current.id] }));
    flash(saved[current.id] ? 'Removed from saved' : 'Article saved');
  };

  return (
    <>
      <PageHeader eyebrow="Intelligence" title="AI News & Research" description="Track the AI ecosystem — latest news, research papers, model releases, industry, developer, business and security updates — with AI summarise, explain, compare and ask features." action={
        <button onClick={() => setOnlySaved(v => !v)} className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm ${onlySaved ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-white/10 text-zinc-300 hover:bg-white/5'}`}><Bookmark className="h-4 w-4" />{onlySaved ? 'Saved' : 'Show saved'}</button>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Articles are illustrative mock data. The interface is backend-ready for a future news/research integration.</p></div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${section === s.id ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>{s.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-10 text-center text-sm text-zinc-500">No articles in this view.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(a => <ArticleCard key={a.id} article={a} onAction={handleAction} saved={!!saved[a.id]} />)}
        </div>
      )}

      <AIPanel article={current} action={active?.action} onClose={() => setActive(null)} onSavedToggle={toggleSavedInPanel} saved={current ? !!saved[current.id] : false} />

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}