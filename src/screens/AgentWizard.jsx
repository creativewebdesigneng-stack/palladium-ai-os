import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAgent } from '@/lib/agents/agents.functions';
import { useUpgrade } from '@/lib/upgradeContext';
import { useToast } from '@/components/ui/use-toast';
import { Check, ArrowRight, ArrowLeft, Bot, Sparkles, Brain, Wrench, Shield, User, MessageSquare, MemoryStick } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { WIZARD_MODELS, WIZARD_TOOLS, AVATAR_COLORS, DEPARTMENTS } from '@/components/agents/agentsData';

const STEPS = [
  ['identity', 'Identity', User],
  ['model', 'Model', Sparkles],
  ['instructions', 'Instructions', MessageSquare],
  ['memory', 'Memory', MemoryStick],
  ['tools', 'Tools', Wrench],
  ['permissions', 'Permissions', Shield],
];

const TOOL_ICONS = Object.fromEntries(WIZARD_TOOLS.map(t => [t.id, t.icon]));

function Field({ label, children }) {
  return <div><label className="text-xs text-zinc-400">{label}</label><div className="mt-1.5">{children}</div></div>;
}
const inputCls = 'h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-zinc-100 outline-none focus:border-violet-500';
const areaCls = 'w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-100 outline-none focus:border-violet-500';

function Toggle({ label, desc, on, onToggle }) {
  return (
    <button onClick={onToggle} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${on ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-white/[.02] hover:bg-white/5'}`}>
      <div><p className="text-sm text-zinc-200">{label}</p><p className="text-[11px] text-zinc-500">{desc}</p></div>
      <span className={`relative h-6 w-10 shrink-0 rounded-full transition ${on ? 'bg-violet-600' : 'bg-white/10'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? 'left-[18px]' : 'left-0.5'}`} /></span>
    </button>
  );
}

export default function AgentWizard() {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    name: '', desc: '', letter: 'A', color: AVATAR_COLORS[0], dept: 'Research',
    model: 'gpt',
    role: '', goals: '', rules: '', behaviour: '', personality: '',
    mem: { long: true, short: true, history: false, kb: true },
    tools: ['web', 'files'],
    perms: { internet: true, files: true, automation: false, apis: false },
  });

  const navigate = useNavigate();
  const { gate } = useUpgrade();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const set = (patch) => setD(p => ({ ...p, ...patch }));
  const setMem = (k) => setD(p => ({ ...p, mem: { ...p.mem, [k]: !p.mem[k] } }));
  const setPerm = (k) => setD(p => ({ ...p, perms: { ...p.perms, [k]: !p.perms[k] } }));
  const toggleTool = (id) => setD(p => ({ ...p, tools: p.tools.includes(id) ? p.tools.filter(t => t !== id) : [...p.tools, id] }));
  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  // Persists the configured agent as a real Agent record (org-scoped, plan-
  // gated). The workforce list on /agents reads the same backend, so the new
  // agent appears immediately. Users without a workspace get a clear error.
  const createAgent = async () => {
    if (!gate('createAgents')) return;
    if (!d.name.trim()) { toast({ title: 'Agent name is required', variant: 'destructive' }); return; }
    setCreating(true);
    try {
      const modelName = WIZARD_MODELS.find(m => m.id === d.model)?.name || 'gpt-4o-mini';
      await createAgent({
        data: {
          name: d.name.trim(),
          description: d.desc,
          category: d.dept,
          model: modelName,
          instructions: d.rules || d.behaviour || '',
          allowed_tools: d.tools,
          status: 'draft',
          preferences: { grad: d.color, letter: d.letter, category: d.dept, memory: d.mem, perms: d.perms, role: d.role, goals: d.goals, rules: d.rules, behaviour: d.behaviour, personality: d.personality },
        },
      });
      toast({ title: 'Agent created', description: `${d.name} is now in your workforce.` });
      navigate('/agents');
    } catch (e) {
      toast({ title: 'Could not create agent', description: e?.message || 'Create a workspace first, then try again.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="AI" title="Agent Builder" description="Build an autonomous AI teammate in six steps." />
      <div className="mx-auto max-w-2xl">
        {/* Stepper */}
        <div className="mb-6 flex items-center">
          {STEPS.map(([key, label, Icon], i) => (
            <div key={key} className="flex flex-1 items-center last:flex-none">
              <div className="flex items-center">
                <div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-medium transition ${i <= step ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-500'}`}>
                  {i < step ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`ml-2 hidden text-xs sm:block ${i <= step ? 'text-white' : 'text-zinc-600'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-2 h-px flex-1 ${i < step ? 'bg-violet-600' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-6">
          {/* Step 1 — Identity */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <div className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${d.color} text-lg font-semibold text-white`}>{d.letter || 'A'}</div>
                <div className="text-xs text-zinc-400">Live preview of your agent avatar</div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Agent name"><input value={d.name} onChange={e => set({ name: e.target.value, letter: (e.target.value[0] || 'A').toUpperCase() })} placeholder="e.g. Research Analyst" className={inputCls} /></Field>
                <Field label="Department">
                  <select value={d.dept} onChange={e => set({ dept: e.target.value })} className={inputCls}>{DEPARTMENTS.map(x => <option key={x}>{x}</option>)}</select>
                </Field>
              </div>
              <Field label="Description"><textarea value={d.desc} onChange={e => set({ desc: e.target.value })} placeholder="What does this agent do?" className={`${areaCls} h-20`} /></Field>
              <Field label="Avatar letter"><input value={d.letter} maxLength={2} onChange={e => set({ letter: e.target.value.toUpperCase() })} className={inputCls} /></Field>
              <Field label="Avatar colour"><div className="flex flex-wrap gap-2">{AVATAR_COLORS.map(c => <button key={c} onClick={() => set({ color: c })} className={`h-9 w-9 rounded-xl bg-gradient-to-br ${c} ${d.color === c ? 'ring-2 ring-white' : ''}`} />)}</div></Field>
            </div>
          )}

          {/* Step 2 — Model */}
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Choose AI model">
                <div className="grid gap-2 sm:grid-cols-2">
                  {WIZARD_MODELS.map(m => (
                    <button key={m.id} onClick={() => set({ model: m.id })} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${d.model === m.id ? 'border-violet-400/50 bg-violet-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                      <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${m.grad} text-sm font-semibold text-white`}>{m.letter}</span>
                      <div className="min-w-0"><p className="text-sm font-medium text-white">{m.name}</p><p className="text-[11px] text-zinc-500">{m.desc}</p><p className="mt-1 text-[10px] text-zinc-600">Context {m.context}</p></div>
                      {d.model === m.id && <Check className="ml-auto h-4 w-4 text-violet-400" />}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* Step 3 — Instructions */}
          {step === 2 && (
            <div className="space-y-4">
              <Field label="Role"><textarea value={d.role} onChange={e => set({ role: e.target.value })} placeholder="e.g. You are a senior research analyst…" className={`${areaCls} h-16`} /></Field>
              <Field label="Goals"><textarea value={d.goals} onChange={e => set({ goals: e.target.value })} placeholder="What should this agent achieve?" className={`${areaCls} h-16`} /></Field>
              <Field label="Rules"><textarea value={d.rules} onChange={e => set({ rules: e.target.value })} placeholder="Boundaries and constraints" className={`${areaCls} h-16`} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Behaviour"><textarea value={d.behaviour} onChange={e => set({ behaviour: e.target.value })} placeholder="Tone & style" className={`${areaCls} h-16`} /></Field>
                <Field label="Personality"><textarea value={d.personality} onChange={e => set({ personality: e.target.value })} placeholder="Character traits" className={`${areaCls} h-16`} /></Field>
              </div>
            </div>
          )}

          {/* Step 4 — Memory */}
          {step === 3 && (
            <div className="space-y-3">
              <Toggle label="Long-term memory" desc="Persist facts across sessions" on={d.mem.long} onToggle={() => setMem('long')} />
              <Toggle label="Short-term memory" desc="Remember within a session" on={d.mem.short} onToggle={() => setMem('short')} />
              <Toggle label="Conversation history" desc="Store full transcripts" on={d.mem.history} onToggle={() => setMem('history')} />
              <Toggle label="Knowledge base" desc="Search your uploaded documents" on={d.mem.kb} onToggle={() => setMem('kb')} />
            </div>
          )}

          {/* Step 5 — Tools */}
          {step === 4 && (
            <div>
              <p className="mb-3 text-xs text-zinc-400">Select the tools this agent can use</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {WIZARD_TOOLS.map(t => {
                  const Icon = t.icon;
                  const on = d.tools.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleTool(t.id)} className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${on ? 'border-violet-400/40 bg-violet-500/10 text-white' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}>
                      <span className={`grid h-9 w-9 place-items-center rounded-lg ${on ? 'bg-violet-600/30 text-violet-200' : 'bg-white/5 text-zinc-500'}`}><Icon className="h-4 w-4" /></span>
                      <span className="text-xs font-medium">{t.name}</span>
                      {on && <Check className="ml-auto h-3.5 w-3.5 text-violet-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 6 — Permissions */}
          {step === 5 && (
            <div className="space-y-3">
              <Toggle label="Allow internet" desc="Agent may browse the web" on={d.perms.internet} onToggle={() => setPerm('internet')} />
              <Toggle label="Allow file access" desc="Read & write workspace files" on={d.perms.files} onToggle={() => setPerm('files')} />
              <Toggle label="Allow automation" desc="Run workflows and automations" on={d.perms.automation} onToggle={() => setPerm('automation')} />
              <Toggle label="Allow external APIs" desc="Call third-party services" on={d.perms.apis} onToggle={() => setPerm('apis')} />
              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="mb-2 text-xs font-medium text-zinc-300">Review</p>
                <div className="space-y-1.5 text-xs text-zinc-400">
                  <p><span className="text-zinc-600">Name:</span> {d.name || '—'} · <span className="text-zinc-600">Dept:</span> {d.dept} · <span className="text-zinc-600">Model:</span> {WIZARD_MODELS.find(m => m.id === d.model)?.name}</p>
                  <p><span className="text-zinc-600">Tools:</span> {d.tools.map(t => WIZARD_TOOLS.find(x => x.id === t)?.name).join(', ') || '—'}</p>
                  <p><span className="text-zinc-600">Memory:</span> {Object.entries(d.mem).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <button onClick={back} disabled={step === 0} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-zinc-400 disabled:opacity-40 hover:bg-white/5"><ArrowLeft className="h-4 w-4" />Back</button>
            {step < STEPS.length - 1 ? (
              <button onClick={next} className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">Continue <ArrowRight className="h-4 w-4" /></button>
            ) : (
              <button onClick={createAgent} disabled={creating} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"><Bot className="h-4 w-4" />{creating ? 'Creating…' : 'Create agent'}</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}