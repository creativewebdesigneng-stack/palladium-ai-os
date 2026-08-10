import { useMemo, useState } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import BrowserSession from '@/components/computer/BrowserSession';
import AgentActivity from '@/components/computer/AgentActivity';
import SecurityConfirmations from '@/components/computer/SecurityConfirmations';
import SessionControls from '@/components/computer/SessionControls';
import RemoteComputers from '@/components/computer/RemoteComputers';
import { METRICS, BROWSER_TABS, SECURITY_CONFIRMATIONS, REMOTE_COMPUTERS } from '@/components/computer/computerData';

export default function ComputerControl() {
  const [tabs, setTabs] = useState(BROWSER_TABS);
  const [activeTab, setActiveTab] = useState(BROWSER_TABS[0].id);
  const [security, setSecurity] = useState(SECURITY_CONFIRMATIONS);
  const [state, setState] = useState('running');

  const current = tabs.find((t) => t.id === activeTab);
  const nav = useMemo(() => ({
    back: () => {},
    forward: () => {},
    refresh: () => {},
    newTab: () => {
      const id = 't' + Date.now();
      setTabs((t) => [...t, { id, title: 'New Tab', url: 'https://' }]);
      setActiveTab(id);
    },
    close: () => {
      setTabs((t) => {
        const next = t.filter((x) => x.id !== activeTab);
        if (next.length && activeTab === activeTab) setActiveTab(next[0].id);
        return next.length ? next : [{ id: 't1', title: 'New Tab', url: 'https://', active: true }];
      });
    },
  }), [activeTab]);

  return (
    <>
      <PageHeader eyebrow="Runtime" title="Computer Control" description="The control centre for agents that interact with computers and websites." action={<SessionControls state={state} onAction={setState} />} />

      {/* metrics */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRICS.map((m) => { const I = m.icon; return (
          <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${m.grad} text-white`}><I className="h-5 w-5" /></span>
            <div>
              <p className="text-xl font-semibold text-white">{m.value}</p>
              <p className="text-[10px] text-zinc-500">{m.label}</p>
            </div>
          </div>
        ); })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <BrowserSession tabs={tabs} activeTab={activeTab} setActive={setActiveTab} onNav={nav} action="" />
          <AgentActivity />
        </div>
        <div className="space-y-4">
          <SecurityConfirmations settings={security} onChange={setSecurity} />
          <RemoteComputers list={REMOTE_COMPUTERS} />
        </div>
      </div>
    </>
  );
}