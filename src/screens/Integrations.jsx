import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Brain, Briefcase, Code2, Database, HardDrive, MessageSquare, Search, ShieldCheck, Workflow, Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import IntegrationSection from '@/components/integrations/IntegrationSection';
import IntegrationCard from '@/components/integrations/IntegrationCard';
import IntegrationsSidebar from '@/components/integrations/IntegrationsSidebar';
import {
  AI_PROVIDERS,
  AUTOMATION,
  BUSINESS,
  COMMUNICATION,
  DATABASES,
  DEVELOPER,
  STORAGE,
  ALL_INTEGRATIONS,
} from '@/components/integrations/integrationsData';
import { SectionHead } from '@/components/integrations/shared';
import { motion } from 'framer-motion';

const TABS = ['Overview', 'All Integrations', 'AI Providers', 'Business', 'Developer', 'Communication', 'Storage', 'Databases', 'Automation'];

function catalogueItem(item) {
  return {
    ...item,
    status: 'disconnected',
    metrics: {},
    connectedDate: null,
    lastUsed: null,
  };
}

const CATALOGUE = ALL_INTEGRATIONS.map(catalogueItem);
const byId = new Map(CATALOGUE.map((item) => [item.id, item]));
const safeGroup = (rows) => rows.map((item) => byId.get(item.id)).filter(Boolean);

export default function Integrations() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [activeCat, setActiveCat] = useState(null);
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    let items = CATALOGUE;
    if (activeCat) items = items.filter((item) => item.category === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter((item) =>
        item.name.toLowerCase().includes(q) ||
        item.desc?.toLowerCase().includes(q) ||
        item.capabilities?.some((capability) => capability.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q),
      );
    }
    return items;
  }, [query, activeCat]);

  const showSidebar = ['All Integrations', 'AI Providers', 'Business', 'Developer', 'Communication', 'Storage', 'Databases', 'Automation'].includes(activeTab);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Integrations"
        description="Browse the integration catalogue. External provider connections are not yet enabled in this PalladiumAI deployment."
        action={(
          <button onClick={() => navigate('/developer-portal')} className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5">
            <BookOpen className="h-4 w-4" />API documentation
          </button>
        )}
      />

      <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/[.06] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-semibold text-amber-100">Connection backend not configured</p>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-amber-100/70">
              This page is a capability catalogue only. PalladiumAI does not currently store generic third-party OAuth connections, API credentials, connection health or per-provider request statistics here. Items marked in the catalogue are therefore not presented as connected.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Catalogue entries" value={CATALOGUE.length} icon={Wrench} />
        <Metric label="Live connections" value="0" icon={ShieldCheck} />
        <Metric label="Connection telemetry" value="Not configured" icon={Workflow} />
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search provider capabilities…"
            className="w-full rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-400/40"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setActiveCat(null); }}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-medium ${activeTab === tab ? 'bg-violet-500/15 text-violet-200' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'Overview' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <InfoCard title="What is available now" icon={Brain}>
            <p>Use this catalogue to see the provider categories and capabilities PalladiumAI is designed to integrate with. Actual external credentials and OAuth sessions are not created from this page yet.</p>
          </InfoCard>
          <InfoCard title="What production integration requires" icon={Code2}>
            <p>A real integration needs encrypted credential storage, provider-specific OAuth/API-key setup, scoped permissions, token refresh/revocation, health checks and audited tool access. Those controls will be built before Connect buttons are enabled.</p>
          </InfoCard>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[15rem_1fr]">
          {showSidebar && (
            <aside className="hidden xl:block">
              <div className="sticky top-6 rounded-2xl border border-white/10 bg-white/[.035] p-3">
                <h3 className="mb-2 px-1 text-xs font-semibold text-zinc-400">Categories</h3>
                <IntegrationsSidebar activeCat={activeCat} setActiveCat={setActiveCat} />
              </div>
            </aside>
          )}

          <div className="min-w-0">
            {activeTab === 'All Integrations' && (
              <div>
                <div className="mb-4"><SectionHead icon={Search} title={activeCat || 'All Integrations'} count={filtered.length} grad="from-violet-500 to-indigo-500" /></div>
                <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((item) => <IntegrationCard key={item.id} item={item} onOpen={setSelected} />)}
                </motion.div>
              </div>
            )}

            {activeTab === 'AI Providers' && <IntegrationSection icon={Brain} title="AI Providers" items={filterGroup(safeGroup(AI_PROVIDERS), query)} onOpen={setSelected} grad="from-violet-500 to-indigo-500" featured />}
            {activeTab === 'Business' && <IntegrationSection icon={Briefcase} title="Business Integrations" items={filterGroup(safeGroup(BUSINESS), query)} onOpen={setSelected} grad="from-sky-500 to-blue-500" />}
            {activeTab === 'Communication' && <IntegrationSection icon={MessageSquare} title="Communication" items={filterGroup(safeGroup(COMMUNICATION), query)} onOpen={setSelected} grad="from-emerald-500 to-teal-500" />}
            {activeTab === 'Storage' && <IntegrationSection icon={HardDrive} title="Storage" items={filterGroup(safeGroup(STORAGE), query)} onOpen={setSelected} grad="from-fuchsia-500 to-purple-500" />}
            {activeTab === 'Databases' && <IntegrationSection icon={Database} title="Databases" items={filterGroup(safeGroup(DATABASES), query)} onOpen={setSelected} grad="from-green-500 to-emerald-500" />}
            {activeTab === 'Developer' && <IntegrationSection icon={Code2} title="Developer Tools" items={filterGroup(safeGroup(DEVELOPER), query)} onOpen={setSelected} grad="from-zinc-500 to-slate-600" />}
            {activeTab === 'Automation' && <IntegrationSection icon={Workflow} title="Automation Services" items={filterGroup(safeGroup(AUTOMATION), query)} onOpen={setSelected} grad="from-violet-500 to-purple-500" />}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0d13] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-violet-300">{selected.category}</p>
                <h2 className="mt-1 text-lg font-semibold text-white">{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-zinc-500 hover:text-white">Close</button>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-400">{selected.desc}</p>
            {(selected.capabilities ?? []).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selected.capabilities.map((capability) => <span key={capability} className="rounded-lg bg-white/5 px-2 py-1 text-[10px] text-zinc-400">{capability}</span>)}
              </div>
            )}
            <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/[.06] p-3 text-xs leading-5 text-amber-100/70">
              No live {selected.name} connection is configured. Connect and credential-management controls are intentionally disabled until the provider backend exists.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function filterGroup(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    item.name.toLowerCase().includes(q) ||
    item.desc?.toLowerCase().includes(q) ||
    item.capabilities?.some((capability) => capability.toLowerCase().includes(q)),
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Icon className="h-4 w-4" /></span>
      <div><p className="text-lg font-semibold text-white">{value}</p><p className="text-[10px] text-zinc-500">{label}</p></div>
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">{title}</h2></div>
      <div className="mt-3 text-xs leading-6 text-zinc-400">{children}</div>
    </div>
  );
}
