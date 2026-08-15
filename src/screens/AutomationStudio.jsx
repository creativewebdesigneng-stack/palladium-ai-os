import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, CheckCircle2, Loader2, Plus, Save, ShieldCheck, Trash2, Workflow, X } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { useWorkspace } from '@/hooks/use-workspace';
import { listAgents } from '@/lib/agents/agents.functions';
import { importWorkflow } from '@/lib/tasks/tasks.functions';
import { friendlyMessage } from '@/lib/errors';

const blankStep = () => ({
  key: crypto.randomUUID(),
  name: '',
  agentId: '',
  instructions: '',
  requiresApproval: false,
});

export default function AutomationStudio() {
  const navigate = useNavigate();
  const { session } = useWorkspace();
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const [schedule, setSchedule] = useState('');
  const [steps, setSteps] = useState([blankStep()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (session !== 'yes') return;
    let alive = true;
    setLoadingAgents(true);
    listAgents({ data: { limit: 250, withTasks: false } })
      .then((result) => {
        if (!alive) return;
        setAgents((result.agents ?? []).filter((agent) => !agent.org_id));
      })
      .catch((err) => alive && setError(err))
      .finally(() => alive && setLoadingAgents(false));
    return () => { alive = false; };
  }, [session]);

  const valid = useMemo(() => {
    if (!name.trim() || steps.length === 0) return false;
    if (triggerType === 'schedule' && !schedule.trim()) return false;
    return steps.every((step) => step.agentId && step.name.trim());
  }, [name, steps, triggerType, schedule]);

  const updateStep = (key, patch) => setSteps((current) => current.map((step) => step.key === key ? { ...step, ...patch } : step));
  const removeStep = (key) => setSteps((current) => current.filter((step) => step.key !== key));

  const submit = async (event) => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    setCreated(null);
    try {
      const result = await importWorkflow({
        data: {
          definition: {
            name: name.trim(),
            description: description.trim(),
            trigger_type: triggerType,
            schedule: triggerType === 'schedule' ? schedule.trim() : null,
            steps: steps.map((step, index) => ({
              kind: 'agent',
              mode: 'sequential',
              name: step.name.trim(),
              position: index,
              agent_id: step.agentId,
              input_template: step.instructions.trim() || null,
              requires_approval: step.requiresApproval,
              max_retries: 1,
              retry_delay_ms: 500,
              timeout_ms: 120000,
            })),
          },
        },
      });
      setCreated(result);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Automation"
        title="Automation Studio"
        description="Create real persisted draft workflows backed by PalladiumAI's validated workflow runtime."
        action={(
          <button onClick={() => navigate('/workflows')} className="rounded-xl border border-white/10 px-3.5 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5">
            View workflows
          </button>
        )}
      />

      <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/[.05] p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
          <div>
            <p className="text-sm font-semibold text-emerald-100">Live workflow creation</p>
            <p className="mt-1 max-w-4xl text-xs leading-5 text-emerald-100/70">
              Saving here creates a real draft workflow and workflow-step rows. Agent references are revalidated server-side against your personal workspace before anything is inserted. Execution remains governed by the durable workflow queue and approval rules.
            </p>
          </div>
        </div>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-xs text-rose-200">{friendlyMessage(error)}</div>}
      {created && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-xs text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          <span><strong>{created.name}</strong> was saved as a draft with {created.steps} step{created.steps === 1 ? '' : 's'}.</span>
          <button onClick={() => navigate('/workflows')} className="ml-auto rounded-lg border border-emerald-300/20 px-3 py-1.5 font-medium hover:bg-emerald-500/10">Open workflows</button>
        </div>
      )}

      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="mb-4 flex items-center gap-2"><Workflow className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Workflow details</h2></div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Name"><input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Customer follow-up" /></Field>
              <Field label="Trigger">
                <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="field">
                  <option value="manual">Manual</option>
                  <option value="schedule">Schedule</option>
                </select>
              </Field>
            </div>
            <div className="mt-3"><Field label="Description"><textarea maxLength={1000} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="field resize-none" placeholder="What this workflow is responsible for" /></Field></div>
            {triggerType === 'schedule' && (
              <div className="mt-3"><Field label="Schedule" hint="Runtime schedule expression"><input required maxLength={200} value={schedule} onChange={(e) => setSchedule(e.target.value)} className="field" placeholder="0 9 * * 1-5" /></Field></div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-violet-300" /><h2 className="text-sm font-semibold text-white">Sequential agent steps</h2></div>
              <button type="button" disabled={steps.length >= 25} onClick={() => setSteps((current) => [...current, blankStep()])} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5 disabled:opacity-40"><Plus className="h-3 w-3" />Add step</button>
            </div>

            {loadingAgents ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading agents…</div>
            ) : agents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-zinc-500">
                You need at least one personal agent before creating an agent workflow.
                <div><button type="button" onClick={() => navigate('/agents')} className="mt-3 rounded-lg bg-violet-600 px-3 py-1.5 font-medium text-white">Create an agent</button></div>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.key} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold text-white">Step {index + 1}</p>{steps.length > 1 && <button type="button" onClick={() => removeStep(step.key)} className="text-zinc-600 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>}</div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Step name"><input required maxLength={120} value={step.name} onChange={(e) => updateStep(step.key, { name: e.target.value })} className="field" placeholder="Research the request" /></Field>
                      <Field label="Agent"><select required value={step.agentId} onChange={(e) => updateStep(step.key, { agentId: e.target.value })} className="field"><option value="">Select agent…</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></Field>
                    </div>
                    <div className="mt-3"><Field label="Instructions / input template"><textarea maxLength={4000} rows={3} value={step.instructions} onChange={(e) => updateStep(step.key, { instructions: e.target.value })} className="field resize-none" placeholder="Instructions passed into this step" /></Field></div>
                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-zinc-400"><input type="checkbox" checked={step.requiresApproval} onChange={(e) => updateStep(step.key, { requiresApproval: e.target.checked })} />Require human approval for this step</label>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <h2 className="text-sm font-semibold text-white">Draft summary</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <Row label="Trigger" value={triggerType === 'schedule' ? 'Scheduled' : 'Manual'} />
              <Row label="Steps" value={String(steps.length)} />
              <Row label="Approval steps" value={String(steps.filter((step) => step.requiresApproval).length)} />
              <Row label="Scope" value="Personal workspace" />
              <Row label="Save state" value="Draft" />
            </dl>
            <button disabled={!valid || saving || loadingAgents || agents.length === 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save real workflow
            </button>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-xs leading-5 text-zinc-500">
            <p className="font-medium text-zinc-300">Current supported creator</p>
            <p className="mt-2">This UI creates sequential personal-agent workflows. Advanced delay, notification and approval-only nodes remain available through validated workflow import until they receive dedicated form controls.</p>
          </section>
        </aside>
      </form>

      <style>{`.field{width:100%;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.22);border-radius:.75rem;padding:.6rem .7rem;font-size:.75rem;color:white;outline:none}.field:focus{border-color:rgba(167,139,250,.45)}.field option{background:#11131a}`}</style>
    </>
  );
}

function Field({ label, hint, children }) {
  return <label className="block"><span className="mb-1 flex items-center justify-between text-[11px] font-medium text-zinc-400"><span>{label}</span>{hint && <span className="font-normal text-zinc-600">{hint}</span>}</span>{children}</label>;
}

function Row({ label, value }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-zinc-500">{label}</dt><dd className="font-medium text-zinc-200">{value}</dd></div>;
}
