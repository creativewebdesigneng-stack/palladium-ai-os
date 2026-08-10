import { useMemo, useState } from 'react';
import { Plug, KeyRound, GitCompare, Store, Search } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ModelsOverviewCards from '@/components/models/ModelsOverviewCards';
import ModelsSidebar from '@/components/models/ModelsSidebar';
import ProviderCard from '@/components/models/ProviderCard';
import ModelCard from '@/components/models/ModelCard';
import ModelDetailsDrawer from '@/components/models/ModelDetailsDrawer';
import ModelComparison from '@/components/models/ModelComparison';
import DefaultModels from '@/components/models/DefaultModels';
import AgentModelAssignments from '@/components/models/AgentModelAssignments';
import LocalModels from '@/components/models/LocalModels';
import APIManagement from '@/components/models/APIManagement';
import ModelMarketplace from '@/components/models/ModelMarketplace';
import ModelsRecommendations from '@/components/models/ModelsRecommendations';
import ModelsRightPanel from '@/components/models/ModelsRightPanel';
import ModelsEmptyState from '@/components/models/ModelsEmptyState';
import { PROVIDERS, MODELS, DEFAULT_MODELS } from '@/components/models/modelsData';

const HEAD_ACTIONS = [
  { label: 'Connect Provider', icon: Plug, primary: true, key: 'connect' },
  { label: 'Add API Key', icon: KeyRound, key: 'apikey' },
  { label: 'Compare Models', icon: GitCompare, key: 'compare' },
  { label: 'Model Marketplace', icon: Store, key: 'market' },
];

export default function Models() {
  const [active, setActive] = useState('all');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null);
  const [compare, setCompare] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showEmpty] = useState(false); // toggle to demo empty state

  const providers = useMemo(() => {
    let list = PROVIDERS;
    if (active !== 'all') list = list.filter(p => p.id === active);
    if (q) list = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [active, q]);

  const models = useMemo(() => {
    let list = MODELS;
    if (active !== 'all') {
      const prov = PROVIDERS.find(p => p.id === active)?.name;
      if (prov) list = list.filter(m => m.provider === prov);
    }
    if (q) list = list.filter(m => m.name.toLowerCase().includes(q.toLowerCase()) || m.provider.toLowerCase().includes(q.toLowerCase()));
    return list;
  }, [active, q]);

  const toggleCompare = (m) => {
    setCompare(c => {
      const exists = c.find(x => x.id === m.id);
      if (exists) return c.filter(x => x.id !== m.id);
      if (c.length >= 4) return c;
      return [...c, m];
    });
    setShowCompare(true);
  };

  const updateDefault = (task, model) => {
    DEFAULT_MODELS.find(d => d.task === task).model = model;
  };

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {HEAD_ACTIONS.map(a => (
        <button key={a.key} className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${a.primary ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}>
          <a.icon className="h-4 w-4" />{a.label}
        </button>
      ))}
    </div>
  );

  if (showEmpty) {
    return (
      <>
        <PageHeader eyebrow="AI" title="AI Models" description="Manage every AI provider powering your workforce." action={headerActions} />
        <ModelsEmptyState onConnect={() => {}} />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="AI" title="AI Models" description="Manage every AI provider powering your workforce." action={headerActions} />
      <ModelsOverviewCards />

      <div className="mt-6 flex gap-4">
        <div className="hidden lg:block"><ModelsSidebar active={active} onSelect={setActive} /></div>

        <div className="min-w-0 flex-1 space-y-6">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2">
            <Search className="h-4 w-4 text-zinc-600" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search providers and models" className="w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600" />
            <span className="text-xs text-zinc-600">{providers.length} providers · {models.length} models</span>
          </div>

          {/* Comparison */}
          {showCompare && compare.length > 0 && (
            <ModelComparison models={compare} onClose={() => { setCompare([]); setShowCompare(false); }} onRemove={(m) => setCompare(c => c.filter(x => x.id !== m.id))} />
          )}

          {/* Providers */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-white">Providers</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{providers.map(p => <ProviderCard key={p.id} provider={p} />)}</div>
          </section>

          {/* Model grid */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-white">Models</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{models.map(m => (
              <ModelCard key={m.id} model={m} selected={!!compare.find(c => c.id === m.id)} onSelect={setDetail} onCompare={toggleCompare} />
            ))}</div>
          </section>

          {/* Default models */}
          <DefaultModels onChange={updateDefault} />

          {/* Recommendations */}
          <ModelsRecommendations />

          {/* Agent assignments */}
          <AgentModelAssignments />

          {/* Local models */}
          <LocalModels />

          {/* API management */}
          <APIManagement />

          {/* Marketplace */}
          <ModelMarketplace />
        </div>

        {/* Right panel */}
        <div className="hidden xl:block"><ModelsRightPanel onAction={() => {}} /></div>
      </div>

      <ModelDetailsDrawer model={detail} onClose={() => setDetail(null)} />
    </>
  );
}