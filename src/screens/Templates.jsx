import { useState, useMemo } from 'react';
import { Search, Upload, Info, Star } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import TemplateCard from '@/components/templates/TemplateCard';
import TemplatePreview from '@/components/templates/TemplatePreview';
import PublishTemplate from '@/components/templates/PublishTemplate';
import { CATEGORIES, TEMPLATES } from '@/components/templates/templatesData';

const SORTS = [
  { id: 'popular', label: 'Most used' },
  { id: 'rating', label: 'Top rated' },
  { id: 'newest', label: 'Newest' },
];

export default function Templates() {
  const [templates, setTemplates] = useState(TEMPLATES);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('popular');
  const [favs, setFavs] = useState([]);
  const [preview, setPreview] = useState(null);
  const [showPublish, setShowPublish] = useState(false);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const toggleFav = (id) => setFavs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filtered = useMemo(() => {
    let list = templates.filter(t => cat === 'all' || t.category === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s) || t.creator.toLowerCase().includes(s));
    }
    list = [...list].sort((a, b) => sort === 'rating' ? b.rating - a.rating : sort === 'newest' ? a.id.localeCompare(b.id) : b.uses - a.uses);
    return list;
  }, [templates, cat, q, sort]);

  const onUse = (t) => flash(`Creating project from "${t.name}"…`);
  const onPublish = (data) => {
    setTemplates(prev => [{ ...data, id: 'u' + Date.now() }, ...prev]);
    setShowPublish(false);
    flash('Template published');
  };

  return (
    <>
      <PageHeader eyebrow="Marketplace" title="Templates Marketplace" description="Start from a production-ready template — websites, apps, SaaS, agents and workflows." action={
        <button onClick={() => setShowPublish(true)} className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"><Upload className="h-4 w-4" />Publish template</button>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Templates are illustrative mock data. The interface is backend-ready for template publishing and instantiation.</p></div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates, creators…" className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-violet-400/40 focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          {SORTS.map(s => (
            <button key={s.id} onClick={() => setSort(s.id)} className={`rounded-lg px-3 py-2 text-[11px] font-medium ${sort === s.id ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>{s.label}</button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <button onClick={() => setCat('all')} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === 'all' ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-lg px-3 py-1.5 text-[11px] font-medium ${cat === c ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'bg-white/[.03] text-zinc-400 hover:text-white'}`}>{c}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-10 text-center text-sm text-zinc-500">No templates match your filters.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(t => <TemplateCard key={t.id} t={t} favs={favs} onPreview={setPreview} onUse={onUse} onFav={toggleFav} />)}
        </div>
      )}

      <TemplatePreview t={preview} onClose={() => setPreview(null)} onUse={onUse} onFav={toggleFav} favs={favs} />
      {showPublish && <PublishTemplate onClose={() => setShowPublish(false)} onPublish={onPublish} />}
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}