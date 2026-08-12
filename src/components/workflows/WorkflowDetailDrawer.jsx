import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw, Loader2 } from 'lucide-react';
import { STATUS_STYLE } from './workflowsData';
import WorkflowBuilder from './WorkflowBuilder';
import RunHistoryTable from './RunHistoryTable';
import { useToast } from '@/components/ui/use-toast';
import { runWorkflow } from '@/lib/runtime/workforce.functions';
import { listWorkflowRuns, setWorkflowStatus } from '@/lib/tasks/tasks.functions';

export default function WorkflowDetailDrawer({ workflow, onClose, onChanged }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('builder');
  const [runs, setRuns] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadRuns = useCallback(async () => {
    if (!workflow) return;
    setLoadingRuns(true);
    try {
      const res = await listWorkflowRuns({ data: { workflow_id: workflow.id } });
      setRuns((res.runs || []).map((r) => ({ ...r, workflow: workflow.name })));
    } catch (e) {
      console.error('[workflow-runs]', e);
      setRuns([]);
    } finally {
      setLoadingRuns(false);
    }
  }, [workflow]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  if (!workflow) return null;
  const st = STATUS_STYLE[workflow.status] || STATUS_STYLE.Draft;

  const handleRun = async () => {
    setBusy(true);
    try {
      await runWorkflow({ data: { workflow_id: workflow.id, input: '' } });
      toast({ title: 'Workflow run started', description: workflow.name });
      await loadRuns();
      onChanged?.();
    } catch (e) {
      console.error('[workflow-run]', e);
      toast({ title: 'Could not run this workflow', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleStatus = async (status) => {
    setBusy(true);
    try {
      await setWorkflowStatus({ data: { id: workflow.id, status } });
      toast({ title: `Workflow ${status}`, description: workflow.name });
      onChanged?.();
    } catch (e) {
      console.error('[workflow-status]', e);
      toast({ title: 'Could not update this workflow', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#0b0c12]">
        {/* header */}
        <div className="border-b border-white/10 p-4">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-white">{workflow.name}</h2>
              <p className="mt-0.5 text-xs text-zinc-400">{workflow.description}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{workflow.status}</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">Trigger · {workflow.trigger}</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">{workflow.nodes.length} nodes</span>
            <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-zinc-400">{workflow.runs} runs</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy} onClick={handleRun} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}Run</button>
            <button disabled={busy} onClick={() => handleStatus(workflow.status === 'Paused' ? 'active' : 'paused')} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50"><Pause className="h-3.5 w-3.5" />{workflow.status === 'Paused' ? 'Resume' : 'Pause'}</button>
            <button disabled={busy} onClick={handleRun} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />Retry</button>
          </div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-white/10 px-3 pt-2">
          {[['builder', 'Builder'], ['runs', 'Run History']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-t-lg px-3 py-2 text-xs font-medium transition ${tab === k ? 'border-b-2 border-violet-500 text-white' : 'text-zinc-400 hover:text-white'}`}>{l}</button>
          ))}
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {tab === 'builder' ? (
                <WorkflowBuilder workflow={workflow} />
              ) : loadingRuns ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-zinc-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading run history…</div>
              ) : runs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500">No runs yet. Click Run to start the first one.</div>
              ) : (
                <RunHistoryTable runs={runs} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.aside>
    </div>
  );
}
