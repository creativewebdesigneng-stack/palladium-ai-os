import { useState } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import BrowserChrome from '@/components/browser/BrowserChrome';
import LivePreview from '@/components/browser/LivePreview';
import ConsoleView from '@/components/browser/ConsoleView';
import NetworkView from '@/components/browser/NetworkView';
import ErrorsView from '@/components/browser/ErrorsView';
import AIDebugPanel from '@/components/browser/AIDebugPanel';
import { HISTORY } from '@/components/browser/browserData';

const TABS = [
  { id: 'preview', label: 'Live Preview' },
  { id: 'console', label: 'Console' },
  { id: 'network', label: 'Network' },
  { id: 'errors', label: 'Errors' },
];

export default function BrowserPreview() {
  const [url, setUrl] = useState(HISTORY[1]);
  const [idx, setIdx] = useState(1);
  const [device, setDevice] = useState('desktop');
  const [tab, setTab] = useState('preview');
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const navigate = (u) => {
    if (u === url) return;
    setUrl(u);
    const next = HISTORY.indexOf(u);
    if (next >= 0) setIdx(next);
  };
  const back = () => { if (idx > 0) { const n = idx - 1; setIdx(n); setUrl(HISTORY[n]); } };
  const forward = () => { if (idx < HISTORY.length - 1) { const n = idx + 1; setIdx(n); setUrl(HISTORY[n]); } };
  const refresh = () => flash('Page refreshed');
  const screenshot = () => flash('Screenshot saved to Files');
  const onAction = (a) => flash(a === 'Open File' ? `Opening ${'src/components/AgentCard.jsx'}:12…` : `${a} — patch generated`);

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Browser Preview" description="Preview your app across devices with live console, network, and AI debugging. Simulated data." />

      <BrowserChrome
        url={url} setUrl={navigate} device={device} setDevice={setDevice}
        canBack={idx > 0} canForward={idx < HISTORY.length - 1}
        onBack={back} onForward={forward} onRefresh={refresh} onScreenshot={screenshot} onToast={flash}
      />

      <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/[.03] p-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-medium ${tab === t.id ? 'bg-violet-500/20 text-white ring-1 ring-violet-400/20' : 'text-zinc-400 hover:text-white'}`}>{t.label}</button>
            ))}
          </div>
          <div className="h-[520px]">
            {tab === 'preview' && <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-black/60"><LivePreview url={url} device={device} /></div>}
            {tab === 'console' && <ConsoleView />}
            {tab === 'network' && <NetworkView />}
            {tab === 'errors' && <ErrorsView />}
          </div>
        </div>
        <div className="h-[560px] lg:h-[620px]"><AIDebugPanel onAction={onAction} /></div>
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}