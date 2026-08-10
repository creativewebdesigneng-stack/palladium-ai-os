import { useMemo, useState } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import MarketplaceToolbar from '@/components/tool-market/MarketplaceToolbar';
import PluginCard from '@/components/tool-market/PluginCard';
import PluginDetailDrawer from '@/components/tool-market/PluginDetailDrawer';
import SubmitPluginModal from '@/components/tool-market/SubmitPluginModal';
import { PLUGINS, CATEGORIES } from '@/components/tool-market/toolMarketData';

export default function ToolMarketplace() {
  const [plugins, setPlugins] = useState(PLUGINS);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [submit, setSubmit] = useState(false);
  const [installed, setInstalled] = useState([]);

  const counts = useMemo(() => {
    const c = { all: plugins.length };
    CATEGORIES.forEach((cat) => { c[cat.id] = plugins.filter((p) => p.category === cat.id).length; });
    return c;
  }, [plugins]);

  const filtered = useMemo(() => {
    let list = plugins;
    if (category !== 'All') list = list.filter((p) => p.category === category);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.creator.toLowerCase().includes(q) || p.capabilities.join(' ').toLowerCase().includes(q));
    }
    return list;
  }, [plugins, category, query]);

  const install = (p) => setInstalled((ids) => ids.includes(p.id) ? ids : [...ids, p.id]);
  const onSubmit = (form) => {
    setPlugins((ps) => [{ id: 'u-' + Date.now(), name: form.name || 'Untitled', icon: CATEGORIES[0].icon, category: 'Developer', grad: 'from-violet-500 to-indigo-500', description: form.description || 'New plugin', creator: 'You', rating: 0, installs: '0', version: '0.1.0', price: 'Free', permissions: form.perms ? form.perms.split(',').map((s) => s.trim()) : [], agents: [], capabilities: [], workflows: [], docs: form.docs || '', reviews: [], versions: ['0.1.0 — initial'] }, ...ps]);
  };

  return (
    <>
      <PageHeader eyebrow="Marketplace" title="Tool & Plugin Marketplace" description="Discover and install capabilities for your AI agents." action={
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{plugins.length} plugins</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{installed.length} installed</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{CATEGORIES.length} categories</span>
        </div>
      } />

      <MarketplaceToolbar category={category} onCategory={setCategory} query={query} onQuery={setQuery} onNew={() => setSubmit(true)} counts={counts} />

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => <PluginCard key={p.id} plugin={p} onOpen={setOpen} onInstall={install} installed={installed.includes(p.id)} />)}
      </div>
      {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No plugins match your search.</div>}

      {open && <PluginDetailDrawer plugin={open} onClose={() => setOpen(null)} onInstall={install} installed={installed.includes(open.id)} />}
      {submit && <SubmitPluginModal onClose={() => setSubmit(false)} onSubmit={onSubmit} />}
    </>
  );
}