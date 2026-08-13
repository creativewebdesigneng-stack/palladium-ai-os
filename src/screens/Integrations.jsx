import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plug, BookOpen, Store, Code2, Brain, Briefcase, MessageSquare, HardDrive, Database, Workflow, Boxes, Search } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import IntegrationsOverviewCards from '@/components/integrations/IntegrationsOverviewCards';
import IntegrationsToolbar from '@/components/integrations/IntegrationsToolbar';
import IntegrationsSidebar from '@/components/integrations/IntegrationsSidebar';
import IntegrationSection from '@/components/integrations/IntegrationSection';
import IntegrationCard from '@/components/integrations/IntegrationCard';
import ConnectedIntegrations from '@/components/integrations/ConnectedIntegrations';
import RecommendedIntegrations from '@/components/integrations/RecommendedIntegrations';
import MarketplaceSection from '@/components/integrations/MarketplaceSection';
import CustomAPISection from '@/components/integrations/CustomAPISection';
import SecurityPanel from '@/components/integrations/SecurityPanel';
import APIUsageCharts from '@/components/integrations/APIUsageCharts';
import RecentActivity from '@/components/integrations/RecentActivity';
import IntegrationsRightSidebar from '@/components/integrations/IntegrationsRightSidebar';
import IntegrationsEmptyState from '@/components/integrations/IntegrationsEmptyState';
import LiveConnections from '@/components/integrations/LiveConnections';
import IntegrationDetailDrawer from '@/components/integrations/IntegrationDetailDrawer';
import { AgentAccess, WorkflowAccess, PermissionsMatrix } from '@/components/integrations/AccessPanels';
import {
  AI_PROVIDERS, BUSINESS, COMMUNICATION, DEVELOPER, DATABASES, STORAGE, AUTOMATION,
  ALL_INTEGRATIONS
} from '@/components/integrations/integrationsData';
import { SectionHead } from '@/components/integrations/shared';
import { motion } from 'framer-motion';

const HEADER_ACTIONS = [
  { label: 'Connect Integration', icon: Plug, primary: true },
  { label: 'Browse Marketplace', icon: Store },
  { label: 'Create Custom Integration', icon: Code2 },
  { label: 'API Documentation', icon: BookOpen },
];

export default function Integrations() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [activeCat, setActiveCat] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showEmpty, setShowEmpty] = useState(false);

  const headerActions = (
    <div className="flex flex-wrap gap-2">
      {HEADER_ACTIONS.map(a => (
        <button key={a.label} onClick={() => {
            if (a.label === 'Connect Integration') setShowEmpty(true);
            else if (a.label === 'Browse Marketplace') setActiveTab('Marketplace');
            else if (a.label === 'Create Custom Integration') setActiveTab('Custom APIs');
            else navigate('/developer-portal');
          }}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium ${a.primary ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-900/30' : 'border border-white/10 text-zinc-300 hover:bg-white/5'}`}>
          <a.icon className="h-4 w-4" />{a.label}
        </button>
      ))}
    </div>
  );

  // Filter by query + category
  const filtered = useMemo(() => {
    let items = ALL_INTEGRATIONS;
    if (activeCat) items = items.filter(i => i.category === activeCat);
    if (query.trim()) {
      const q = query.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.desc?.toLowerCase().includes(q) || i.capabilities?.some(c => c.toLowerCase().includes(q)) || i.category.toLowerCase().includes(q));
    }
    return items;
  }, [query, activeCat]);

  const showSidebar = ['All Integrations', 'AI Providers', 'Business', 'Developer', 'Communication', 'Storage', 'Databases', 'Automation'].includes(activeTab);

  if (showEmpty) {
    return (
      <>
        <PageHeader eyebrow="Workspace" title="Integrations" description="Connect your favourite AI models, apps and services to give your PalladiumAI workforce more capabilities." action={headerActions} />
        <IntegrationsEmptyState onConnect={() => setShowEmpty(false)} />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Integrations" description="Connect your favourite AI models, apps and services to give your PalladiumAI workforce more capabilities." action={headerActions} />

      {/* Overview cards always visible */}
      <div className="mb-5"><IntegrationsOverviewCards /></div>

      {/* Toolbar */}
      <div className="mb-5"><IntegrationsToolbar query={query} setQuery={setQuery} activeTab={activeTab} setActiveTab={setActiveTab} resultCount={filtered.length} /></div>

      {/* Main layout */}
      <div className="grid gap-4 xl:grid-cols-[15rem_1fr_17rem]">
        {/* Left sidebar */}
        {showSidebar && (
          <div className="hidden xl:block">
            <div className="sticky top-6 rounded-2xl border border-white/10 bg-white/[.035] p-3">
              <h3 className="mb-2 px-1 text-xs font-semibold text-zinc-400">Categories</h3>
              <IntegrationsSidebar activeCat={activeCat} setActiveCat={setActiveCat} />
            </div>
          </div>
        )}

        {/* Center content */}
        <div className={`${showSidebar ? 'min-w-0' : 'xl:col-span-2'} space-y-6`}>
          {/* OVERVIEW */}
          {activeTab === 'Overview' && (
            <>
              <LiveConnections />
              <RecommendedIntegrations onOpen={setSelected} />
              <ConnectedIntegrations onOpen={setSelected} />
              <APIUsageCharts />
              <div className="grid gap-4 lg:grid-cols-2">
                <AgentAccess />
                <WorkflowAccess />
              </div>
              <PermissionsMatrix />
              <RecentActivity />
              <SecurityPanel />
            </>
          )}

          {/* ALL INTEGRATIONS */}
          {activeTab === 'All Integrations' && (
            <div>
              <div className="mb-4"><SectionHead icon={Search} title={activeCat || 'All Integrations'} count={filtered.length} grad="from-violet-500 to-indigo-500" /></div>
              <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(it => <IntegrationCard key={it.id} item={it} onOpen={setSelected} />)}
              </motion.div>
            </div>
          )}

          {/* CATEGORY TABS */}
          {['AI Providers','Business','Developer','Communication','Storage','Databases','Automation'].includes(activeTab) && (
            <>
              {activeTab === 'AI Providers' && <IntegrationSection icon={Brain} title="AI Providers" items={query ? filtered.filter(i => AI_PROVIDERS.includes(i)) : AI_PROVIDERS} onOpen={setSelected} grad="from-violet-500 to-indigo-500" featured />}
              {activeTab === 'Business' && <IntegrationSection icon={Briefcase} title="Business Integrations" items={query ? filtered.filter(i => BUSINESS.includes(i)) : BUSINESS} onOpen={setSelected} grad="from-sky-500 to-blue-500" />}
              {activeTab === 'Communication' && <IntegrationSection icon={MessageSquare} title="Communication" items={query ? filtered.filter(i => COMMUNICATION.includes(i)) : COMMUNICATION} onOpen={setSelected} grad="from-emerald-500 to-teal-500" />}
              {activeTab === 'Storage' && <IntegrationSection icon={HardDrive} title="Storage" items={query ? filtered.filter(i => STORAGE.includes(i)) : STORAGE} onOpen={setSelected} grad="from-fuchsia-500 to-purple-500" />}
              {activeTab === 'Databases' && <IntegrationSection icon={Database} title="Databases" items={query ? filtered.filter(i => DATABASES.includes(i)) : DATABASES} onOpen={setSelected} grad="from-green-500 to-emerald-500" />}
              {activeTab === 'Developer' && <IntegrationSection icon={Code2} title="Developer Tools" items={query ? filtered.filter(i => DEVELOPER.includes(i)) : DEVELOPER} onOpen={setSelected} grad="from-zinc-500 to-slate-600" />}
              {activeTab === 'Automation' && <IntegrationSection icon={Workflow} title="Automation Services" items={query ? filtered.filter(i => AUTOMATION.includes(i)) : AUTOMATION} onOpen={setSelected} grad="from-violet-500 to-purple-500" />}
            </>
          )}

          {/* CUSTOM APIs */}
          {activeTab === 'Custom APIs' && <CustomAPISection />}

          {/* CONNECTED */}
          {activeTab === 'Connected' && <ConnectedIntegrations onOpen={setSelected} />}

          {/* MARKETPLACE */}
          {activeTab === 'Marketplace' && <MarketplaceSection onOpen={setSelected} />}
        </div>

        {/* Right sidebar */}
        <div className="hidden xl:block">
          <div className="sticky top-6"><IntegrationsRightSidebar /></div>
        </div>
      </div>

      <IntegrationDetailDrawer item={selected} onClose={() => setSelected(null)} />
    </>
  );
}