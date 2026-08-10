import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/palladium/PageHeader';
import WorkflowsToolbar from '@/components/workflows/WorkflowsToolbar';
import WorkflowsStatusTabs from '@/components/workflows/WorkflowsStatusTabs';
import WorkflowCard from '@/components/workflows/WorkflowCard';
import WorkflowTemplates from '@/components/workflows/WorkflowTemplates';
import WorkflowDetailDrawer from '@/components/workflows/WorkflowDetailDrawer';
import { WORKFLOWS, STATUSES } from '@/components/workflows/workflowsData';
import DataPulse from '@/components/visual/DataPulse';
import { useUpgrade } from '@/lib/upgradeContext';

export default function Workflows() {
  const { gate } = useUpgrade();
  const [status, setStatus] = useState('All');
  const [open, setOpen] = useState(null);

  const counts = useMemo(() => {
    const c = { All: WORKFLOWS.length };
    STATUSES.forEach((s) => { c[s] = WORKFLOWS.filter((w) => w.status === s).length; });
    return c;
  }, []);

  const filtered = status === 'All' ? WORKFLOWS : WORKFLOWS.filter((w) => w.status === status);

  return (
    <>
      <PageHeader eyebrow="Automation" title="Workflows" description="A visual, node-based automation builder for humans and AI agents." />
      <div aria-hidden className="mb-4"><DataPulse active duration={2.2} /></div>

      <WorkflowsToolbar onCreate={() => { if (gate('createWorkflows')) setOpen(WORKFLOWS[0]); }} onTemplates={() => document.getElementById('wf-templates')?.scrollIntoView({ behavior: 'smooth' })} onImport={() => { if (gate('createWorkflows')) setOpen(WORKFLOWS[6]); }} />

      <WorkflowsStatusTabs status={status} onStatus={setStatus} counts={counts} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No workflows in this status.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => <WorkflowCard key={w.id} wf={w} onOpen={setOpen} />)}
        </div>
      )}

      <div id="wf-templates" className="mt-10 scroll-mt-6">
        <WorkflowTemplates />
      </div>

      <AnimatePresence>
        {open && <WorkflowDetailDrawer workflow={open} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </>
  );
}