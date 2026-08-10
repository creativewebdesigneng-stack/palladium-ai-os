import { useState } from 'react';
import { Workflow } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import AutomationToolbar from '@/components/business-automation/AutomationToolbar';
import AutomationCard from '@/components/business-automation/AutomationCard';
import AutomationTemplates from '@/components/business-automation/AutomationTemplates';
import { AUTOMATIONS } from '@/components/business-automation/automationData';

export default function BusinessAutomation() {
  const [active, setActive] = useState('all');
  const [q, setQ] = useState('');
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const filtered = AUTOMATIONS.filter((a) => (active === 'all' || a.category === active) && (!q || (a.name + a.agent + a.trigger).toLowerCase().includes(q.toLowerCase())));

  const counts = { active: 0, paused: 0, error: 0, draft: 0 };
  AUTOMATIONS.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });

  return (
    <>
      <PageHeader eyebrow="Workspace" title="Business Automation" description="Automate work across Sales, Marketing, Finance, Operations, HR, Support, and IT." action={
        <div className="hidden gap-3 sm:flex">
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-zinc-300">{counts.active} active</div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-zinc-300">{counts.paused} paused</div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-zinc-300">{AUTOMATIONS.length} total</div>
        </div>
      } />
      <AutomationToolbar active={active} setActive={setActive} q={q} setQ={setQ} onCreate={() => flash('Create automation form opened')} />

      <div className="mt-4">
        <div className="mb-3 flex items-center gap-2"><Workflow className="h-4 w-4 text-violet-400" /><h2 className="text-sm font-semibold text-white">Active Automations <span className="text-zinc-500">({filtered.length})</span></h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => <AutomationCard key={a.id} auto={a} onToast={flash} />)}
          {!filtered.length && <p className="text-sm text-zinc-600">No automations match your filters.</p>}
        </div>
      </div>

      <div className="mt-6"><AutomationTemplates onToast={flash} /></div>

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}