import { useState } from 'react';
import { LayoutGrid, KeyRound, BookOpen, Compass, Webhook, Package, BarChart3, ScrollText } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import DevPortalOverview from '@/components/dev-portal/DevPortalOverview';
import ApiKeysPanel from '@/components/dev-portal/ApiKeysPanel';
import DocsPanel from '@/components/dev-portal/DocsPanel';
import ApiExplorer from '@/components/dev-portal/ApiExplorer';
import WebhooksPanel from '@/components/dev-portal/WebhooksPanel';
import SDKsPanel from '@/components/dev-portal/SDKsPanel';
import UsagePanel from '@/components/dev-portal/UsagePanel';
import LogsPanel from '@/components/dev-portal/LogsPanel';

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'api-keys', label: 'API Keys', icon: KeyRound },
  { id: 'docs', label: 'Documentation', icon: BookOpen },
  { id: 'explorer', label: 'API Explorer', icon: Compass },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'sdks', label: 'SDKs', icon: Package },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'logs', label: 'Logs', icon: ScrollText },
];

export default function DeveloperPortal() {
  const [active, setActive] = useState('overview');
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Developer Portal" description="Integrate with the PalladiumAI platform — keys, docs, explorer, webhooks, and SDKs." />
      <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-2xl border border-white/10 bg-white/[.03] p-2">
            <nav className="space-y-0.5">
              {NAV.map((n) => { const I = n.icon; return (
                <button key={n.id} onClick={() => setActive(n.id)} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12px] font-medium ${active === n.id ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                  <I className="h-4 w-4 shrink-0" />{n.label}
                </button>
              ); })}
            </nav>
          </div>
        </aside>
        <div>
          {/* mobile nav */}
          <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03] p-1 lg:hidden">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => setActive(n.id)} className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium ${active === n.id ? 'bg-violet-500/20 text-white' : 'text-zinc-400'}`}>{n.label}</button>
            ))}
          </div>
          {active === 'overview' && <DevPortalOverview onNav={setActive} />}
          {active === 'api-keys' && <ApiKeysPanel onToast={flash} />}
          {active === 'docs' && <DocsPanel />}
          {active === 'explorer' && <ApiExplorer />}
          {active === 'webhooks' && <WebhooksPanel onToast={flash} />}
          {active === 'sdks' && <SDKsPanel />}
          {active === 'usage' && <UsagePanel />}
          {active === 'logs' && <LogsPanel />}
        </div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}