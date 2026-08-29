import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2, Workflow as WorkflowIcon } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import WorkflowsToolbar from '@/components/workflows/WorkflowsToolbar';
import WorkflowsStatusTabs from '@/components/workflows/WorkflowsStatusTabs';
import WorkflowCard from '@/components/workflows/WorkflowCard';
import WorkflowTemplates from '@/components/workflows/WorkflowTemplates';
import WorkflowDetailDrawer from '@/components/workflows/WorkflowDetailDrawer';
import { STATUSES } from '@/components/workflows/workflowsData';
import DataPulse from '@/components/visual/DataPulse';
import { useUpgrade } from '@/lib/upgradeContext';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspace } from '@/hooks/use-workspace';
import { listWorkflows, importWorkflow } from '@/lib/tasks/tasks.functions';
import { adaptN8nWorkflowDefinition, isN8nWorkflowDefinition } from '@/lib/workflows/n8n-interoperability';
import ImportWorkflowModal from '@/components/workflows/ImportWorkflowModal';
import { useNavigate } from 'react-router-dom';

export default function Workflows() {
  const { gate } = useUpgrade();
  const { toast } = useToast();
  const { session } = useWorkspace();
  const navigate = useNavigate();
  const [status, setStatus] = useState('All');
  const [open, setOpen] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workflows, setWorkflows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listWorkflows({ data: undefined });
      setWorkflows(res.workflows || []);
    } catch (e) {
      console.error('[workflows]', e);
      setError('We could not load your workflows right now.');
      toast({ title: 'Could not load workflows', description: 'Please try again in a moment.', variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    if (session !== 'yes') return;
    load();
  }, [session, load]);

  const handleImport = useCallback(async (definition) => {
    const fromN8n = isN8nWorkflowDefinition(definition);
    const normalized = adaptN8nWorkflowDefinition(definition);
    const res = await importWorkflow({ data: { definition: normalized } });
    toast({
      title: fromN8n ? 'n8n workflow translated' : 'Workflow imported',
      description: `${res.name} · ${res.steps} step${res.steps === 1 ? '' : 's'} · saved as a draft${fromN8n ? ' for review before activation' : ''}.`,
    });
    await load();
  }, [toast, load]);

  const counts = useMemo(() => {
    const c = { All: workflows.length };
    STATUSES.forEach((s) => { c[s] = workflows.filter((w) => w.status === s).length; });
    return c;
  }, [workflows]);

  const filtered = status === 'All' ? workflows : workflows.filter((w) => w.status === status);

  return (
    <>
      <PageHeader eyebrow="Automation" title="Workflows" description="A visual, node-based automation builder for humans and AI agents, with safe import interoperability for supported n8n-style workflow JSON." />
      <div aria-hidden className="mb-4"><DataPulse active duration={2.2} /></div>

      <WorkflowsToolbar
        onCreate={() => { if (gate('createWorkflows')) navigate('/automation'); }}
        onTemplates={() => document.getElementById('wf-templates')?.scrollIntoView({ behavior: 'smooth' })}
        onImport={() => { if (gate('createWorkflows')) setImportOpen(true); }}
      />

      <ImportWorkflowModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
      <WorkflowsStatusTabs status={status} onStatus={setStatus} counts={counts} />

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[.02] p-16 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading workflows…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-rose-400/20 bg-rose-400/5 p-12 text-center text-sm text-rose-300">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">
          <WorkflowIcon className="mx-auto mb-3 h-6 w-6 text-zinc-600" />
          {workflows.length === 0 ? 'No workflows yet. Build one in the Automation Studio to see it here.' : 'No workflows in this status.'}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => <WorkflowCard key={w.id} wf={w} onOpen={setOpen} />)}
        </div>
      )}

      <div id="wf-templates" className="mt-10 scroll-mt-6"><WorkflowTemplates /></div>

      <AnimatePresence>
        {open && <WorkflowDetailDrawer workflow={open} onClose={() => setOpen(null)} onChanged={load} />}
      </AnimatePresence>
    </>
  );
}
