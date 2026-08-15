import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Workflow, Play, Loader2, CheckCircle2, XCircle, MinusCircle, GitBranch, Layers, Users, Clock3 } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { SectionHead } from './wfShared';
import { listWorkforces, getWorkflowRun } from '@/lib/runtime/workforce.functions';
import { queueWorkflow } from '@/lib/runtime/workflow-queue.functions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const STATUS_ICON = {
  succeeded: { Icon: CheckCircle2, cls: 'text-emerald-400' },
  failed: { Icon: XCircle, cls: 'text-rose-400' },
  skipped: { Icon: MinusCircle, cls: 'text-zinc-500' },
};

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled', 'waiting_for_approval']);

function StepRow({ step, index }) {
  const { Icon, cls } = STATUS_ICON[step.status] ?? STATUS_ICON.skipped;
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-white/10 bg-white/[.03] p-3"
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${cls}`} />
        <p className="truncate text-sm font-medium text-white">{step.name}</p>
        <span className="ml-auto shrink-0 text-[10px] text-zinc-500">
          {step.attempts > 1 ? `${step.attempts} attempts · ` : ''}
          {(step.duration_ms / 1000).toFixed(1)}s
        </span>
      </div>
      {step.output ? (
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-zinc-400">{step.output}</p>
      ) : null}
      {step.error ? <p className="mt-2 text-xs text-rose-300">{step.error}</p> : null}
    </motion.div>
  );
}

function displaySteps(rows = []) {
  const latest = new Map();
  for (const row of rows) {
    const key = row.step_id || row.id;
    const previous = latest.get(key);
    if (!previous || Number(row.attempt ?? 1) >= Number(previous.attempt ?? 1)) latest.set(key, row);
  }
  return [...latest.values()]
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
    .map((row) => ({
      step_id: row.step_id ?? row.id,
      name: row.name ?? 'Workflow step',
      status: row.status === 'cancelled' ? 'skipped' : row.status,
      output: String(row.output ?? ''),
      error: row.error ? String(row.error) : null,
      attempts: Number(row.attempt ?? 1),
      duration_ms: Number(row.duration_ms ?? 0),
    }));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Durable workflow launcher. The browser only queues the run, then watches the
 * persisted execution ledger while a protected background worker performs it.
 */
export default function WorkforceOrchestrator() {
  const { toast } = useToast();
  const load = useServerFn(listWorkforces);
  const queue = useServerFn(queueWorkflow);
  const fetchRun = useServerFn(getWorkflowRun);
  const mounted = useRef(true);

  const [workforces, setWorkforces] = useState([]);
  const [workflowId, setWorkflowId] = useState('');
  const [objective, setObjective] = useState('');
  const [busy, setBusy] = useState(false);
  const [runStatus, setRunStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data?.session) return;
      try {
        const res = await load();
        if (!cancelled) setWorkforces(res?.workforces ?? []);
      } catch {
        if (!cancelled) setWorkforces([]);
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  const workflows = useMemo(
    () => workforces.flatMap((w) => (w.workflows ?? []).map((f) => ({ ...f, workforce: w.name }))),
    [workforces],
  );

  useEffect(() => {
    if (!workflowId && workflows.length) setWorkflowId(workflows[0].id);
  }, [workflows, workflowId]);

  const watchRun = useCallback(async (runId) => {
    for (let poll = 0; poll < 400; poll += 1) {
      const detail = await fetchRun({ data: { run_id: runId } });
      const run = detail?.run;
      if (!run) throw new Error('The queued workflow run could not be loaded.');

      const steps = displaySteps(detail?.stepRuns ?? []);
      if (mounted.current) {
        setRunStatus(run.status);
        setMessages(detail?.messages ?? []);
        setResult({ run, steps, output: String(run.output ?? '') });
      }
      if (TERMINAL.has(run.status)) return { run, steps, messages: detail?.messages ?? [] };
      await sleep(1500);
    }
    throw new Error('The workflow is still processing. Its run remains safely stored in the execution ledger.');
  }, [fetchRun]);

  const execute = useCallback(async () => {
    if (!workflowId || !objective.trim()) return;
    setBusy(true);
    setRunStatus('queued');
    setResult(null);
    setMessages([]);
    try {
      const queued = await queue({ data: { workflow_id: workflowId, input: objective.trim() } });
      const runId = queued?.run?.id;
      if (!runId) throw new Error('The workflow could not be queued.');
      toast({
        title: 'Workforce run queued',
        description: 'The background worker will claim it without keeping this browser request open.',
      });

      const final = await watchRun(runId);
      const status = final.run?.status;
      toast({
        title: status === 'succeeded'
          ? 'Workforce run complete'
          : status === 'waiting_for_approval'
            ? 'Workflow needs approval'
            : status === 'cancelled'
              ? 'Workflow run cancelled'
              : 'Workforce run finished with errors',
        description: `${final.steps?.length ?? 0} step(s) recorded in the durable ledger.`,
        ...(status === 'failed' ? { variant: 'destructive' } : {}),
      });
    } catch (error) {
      toast({ title: 'Run failed', description: error?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [workflowId, objective, queue, watchRun, toast]);

  const statusText = runStatus === 'queued'
    ? 'Queued — waiting for the background worker…'
    : runStatus === 'running'
      ? 'Background worker is executing the workflow…'
      : runStatus === 'waiting_for_approval'
        ? 'Paused safely — approval is required in Mission Control.'
        : null;

  return (
    <section className="mb-8">
      <SectionHead
        icon={Workflow}
        title="Workforce orchestration"
        desc="Chain specialised agents into sequential, parallel or conditional workflows."
      />

      {workflows.length ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <label className="text-[11px] font-medium text-zinc-400" htmlFor="wf-select">Workflow</label>
            <select
              id="wf-select"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-violet-500/60"
            >
              {workflows.map((f) => (
                <option key={f.id} value={f.id}>{f.workforce} — {f.name}</option>
              ))}
            </select>

            <label className="mt-4 block text-[11px] font-medium text-zinc-400" htmlFor="wf-objective">Objective</label>
            <textarea
              id="wf-objective"
              rows={4}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Research the UK EV charging market, analyse the gaps and draft a go-to-market report."
              className="mt-1.5 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500/60"
            />

            <button
              type="button"
              onClick={execute}
              disabled={busy || !objective.trim()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3.5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {busy ? (runStatus === 'queued' ? 'Queued…' : 'Running…') : 'Run workforce'}
            </button>

            {statusText ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-violet-200">
                <Clock3 className="h-3.5 w-3.5" />{statusText}
              </p>
            ) : null}

            <div className="mt-4 grid gap-2 text-[11px] text-zinc-500">
              <p className="flex items-center gap-1.5"><Layers className="h-3 w-3" />Steps run in dependency waves — independent steps in parallel.</p>
              <p className="flex items-center gap-1.5"><GitBranch className="h-3 w-3" />Conditional steps skip when their condition is not met.</p>
              <p className="flex items-center gap-1.5"><Users className="h-3 w-3" />Agents only see the run objective and their declared upstream outputs.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
            <p className="text-xs font-semibold text-white">Execution ledger</p>
            <AnimatePresence mode="popLayout">
              {result?.steps?.length ? (
                <div className="mt-3 grid gap-2">
                  {result.steps.map((s, i) => <StepRow key={`${s.step_id}-${i}`} step={s} index={i} />)}
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">
                  {busy ? 'Watching the durable workflow queue…' : 'Run a workflow to see each agent’s output, retries and handoffs.'}
                </p>
              )}
            </AnimatePresence>

            {result?.output ? (
              <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                <p className="text-[11px] font-semibold text-violet-200">Final deliverable</p>
                <p className="mt-1.5 whitespace-pre-wrap text-xs text-zinc-200">{result.output}</p>
              </div>
            ) : null}

            {messages.length ? (
              <p className="mt-3 text-[10px] text-zinc-600">{messages.length} controlled agent-to-agent handoff(s) recorded.</p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-6 py-12 text-center">
          <Workflow className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm font-medium text-white">No workflows yet</p>
          <p className="mt-1 text-xs text-zinc-500">
            Create a workforce with a workflow — for example Research → Analysis → Strategy → Report — to orchestrate your agents.
          </p>
        </div>
      )}
    </section>
  );
}
