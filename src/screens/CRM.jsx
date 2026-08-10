import { useState } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import CRMToolbar from '@/components/crm/CRMToolbar';
import PipelineBoard from '@/components/crm/PipelineBoard';
import ContactDetailDrawer from '@/components/crm/ContactDetailDrawer';
import AIFeaturesPanel from '@/components/crm/AIFeaturesPanel';
import { ContactsView, CompaniesView, LeadsView, ActivitiesView, TasksView, NotesView } from '@/components/crm/CRMViews';
import { CONTACTS, ACTIVITIES, NOTES } from '@/components/crm/crmData';

export default function CRM() {
  const [module, setModule] = useState('contacts');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [running, setRunning] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1800); };

  const openContact = (c) => { if (c) setSelected(c); };

  const runAI = (id, contact) => {
    setRunning(id);
    setTimeout(() => {
      setRunning(null);
      const labels = { research: 'AI Lead Research', followup: 'AI Follow-Up', scoring: 'AI Lead Scoring', email: 'AI Email Generation', meeting: 'AI Meeting Summary' };
      flash(`${labels[id]} completed${contact ? ` for ${contact.name}` : ''}`);
    }, 1400);
  };

  const dealToContact = (d) => CONTACTS.find((c) => c.name === d.contact);

  return (
    <>
      <PageHeader eyebrow="Workspace" title="CRM" description="Manage contacts, companies, leads, deals, activities, tasks, and notes with AI-assisted selling." action={
        <div className="hidden gap-3 sm:flex">
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-zinc-300">{CONTACTS.length} contacts</div>
          <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs text-zinc-300">6 pipeline stages</div>
        </div>
      } />
      <CRMToolbar module={module} setModule={setModule} q={q} setQ={setQ} onCreate={() => flash(`New ${module.slice(0, -1)} form opened`)} />

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <PipelineBoard onOpenDeal={(d) => openContact(dealToContact(d))} />
          <div>
            {module === 'contacts' && <ContactsView q={q} onOpen={openContact} />}
            {module === 'companies' && <CompaniesView q={q} />}
            {module === 'leads' && <LeadsView q={q} onOpen={openContact} />}
            {module === 'activities' && <ActivitiesView q={q} />}
            {module === 'tasks' && <TasksView q={q} />}
            {module === 'notes' && <NotesView q={q} />}
          </div>
        </div>
        <div className="space-y-4">
          <AIFeaturesPanel onRun={(id) => runAI(id, selected)} running={running} />
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <h3 className="text-sm font-semibold text-white">Pipeline Summary</h3>
            <div className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex justify-between"><span className="text-zinc-400">Open deals</span><span className="text-white">6</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Won this quarter</span><span className="text-emerald-300">2</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Lost</span><span className="text-rose-300">1</span></div>
              <div className="flex justify-between"><span className="text-zinc-400">Win rate</span><span className="text-white">67%</span></div>
            </div>
          </div>
        </div>
      </div>

      <ContactDetailDrawer
        contact={selected}
        activities={selected ? ACTIVITIES.filter((a) => a.contact === selected.name) : []}
        notes={selected ? NOTES.filter((n) => n.contact === selected.name) : []}
        onClose={() => setSelected(null)}
        onAIFeature={runAI}
      />

      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}