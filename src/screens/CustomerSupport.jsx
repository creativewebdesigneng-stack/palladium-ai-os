import { useState } from 'react';
import { Info } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import SupportToolbar from '@/components/support/SupportToolbar';
import SupportMetricCards from '@/components/support/SupportMetricCards';
import AISupportPanel from '@/components/support/AISupportPanel';
import { TicketsView, CustomersView, AgentsView, LiveChatView, KnowledgeView, AutomationView } from '@/components/support/SupportViews';
import { DISCLAIMER } from '@/components/support/supportData';

export default function CustomerSupport() {
  const [view, setView] = useState('tickets');
  const [toast, setToast] = useState(null);
  const [running, setRunning] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1800); };

  const runTool = (id) => {
    setRunning(id);
    setTimeout(() => {
      setRunning(null);
      const labels = { reply: 'AI Reply drafted', summarise: 'Ticket summarised', classify: 'Ticket classified', search: 'Knowledge search complete', escalate: 'Ticket escalated to senior support' };
      flash(labels[id]);
    }, 1300);
  };

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Customer Support Centre" description="Manage tickets, customers, agents, live chat, and a self-serve knowledge base — with AI-assisted support." action={
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] text-zinc-400 sm:flex"><Info className="h-3.5 w-3.5 text-zinc-500" />Mock data</div>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>{DISCLAIMER}</p></div>

      <SupportMetricCards />
      <div className="mt-4"><AISupportPanel onRun={runTool} running={running} /></div>
      <div className="mt-4"><SupportToolbar view={view} setView={setView} onCreate={() => flash('New record form opened')} /></div>
      <div className="mt-4">
        {view === 'tickets' && <TicketsView />}
        {view === 'customers' && <CustomersView />}
        {view === 'agents' && <AgentsView />}
        {view === 'chat' && <LiveChatView />}
        {view === 'kb' && <KnowledgeView />}
        {view === 'automation' && <AutomationView />}
      </div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}