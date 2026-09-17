import { useEffect, useState } from 'react';
import { BadgeCheck, BrainCircuit, Check, Pencil, Plug, ShieldCheck, Sparkles, Wrench, X } from 'lucide-react';
import { updateAgent } from '@/lib/agents/agents.functions';
import { effectiveAgentSkillsRegistry } from '@/lib/agents/agent-skills-registry';
import { useToast } from '@/components/ui/use-toast';

function Chip({ children, tone = 'default' }) {
  const cls = tone === 'verified'
    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
    : tone === 'expired'
      ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
      : tone === 'learning'
        ? 'border-violet-400/20 bg-violet-400/10 text-violet-200'
        : 'border-white/10 bg-white/5 text-zinc-300';
  return <span className={`rounded-lg border px-2 py-1 text-[11px] ${cls}`}>{children}</span>;
}

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
        <Icon className="h-3.5 w-3.5 text-violet-400" />{title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

const areaCls = 'w-full rounded-xl border border-white/10 bg-black/20 p-2.5 text-xs text-zinc-100 outline-none focus:border-violet-500';
const splitList = (value) => [...new Set(String(value || '').split(/[,;\n]+/).map(item => item.trim()).filter(Boolean))];
const keyOf = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');

function draftFromRegistry(registry) {
  return {
    skills: (registry?.skills || []).map(item => item.name).join(', '),
    connectors: (registry?.connectors || []).join(', '),
    certifications: (registry?.certifications || []).map(item => item.name).join(', '),
    experience: (registry?.previous_experience || []).join('\n'),
    learnable: (registry?.learnable_skills || []).join(', '),
  };
}

export default function AgentSkillsRegistryPanel({ agent, onAgentUpdated }) {
  const [savedAgent, setSavedAgent] = useState(agent);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(() => draftFromRegistry(null));
  const { toast } = useToast();

  useEffect(() => { setSavedAgent(agent); }, [agent]);
  const currentAgent = savedAgent || agent;
  const learningEnabled = currentAgent?.memory_enabled !== false;
  const legacySkills = currentAgent?.operating_profile?.skills || [];
  const tools = currentAgent?.allowed_tools || currentAgent?.tools || [];
  const registry = effectiveAgentSkillsRegistry({
    registry: currentAgent?.operating_profile?.skills_registry,
    legacySkills,
    allowedTools: tools,
    modelProvider: currentAgent?.model_provider,
    model: currentAgent?.model,
  });

  if (!registry) return null;

  const beginEdit = () => {
    setDraft(draftFromRegistry(registry));
    setEditing(true);
  };

  const save = async () => {
    if (!currentAgent?.id || saving) return;
    setSaving(true);
    try {
      const existingSkills = new Map(registry.skills.map(item => [keyOf(item.name), item]));
      const skills = splitList(draft.skills).map((name) => {
        const existing = existingSkills.get(keyOf(name));
        return existing ? { ...existing, name } : {
          name,
          proficiency: 0.6,
          learnable: true,
          evidence: [{ kind: 'declared', verified: false, label: 'Configured by operator' }],
        };
      });
      const existingCertifications = new Map((registry.certifications || []).map(item => [keyOf(item.name), item]));
      const certifications = splitList(draft.certifications).map((name) => existingCertifications.get(keyOf(name)) || ({ name, status: 'declared' }));
      const nextRegistry = {
        ...registry,
        skills,
        connectors: splitList(draft.connectors),
        certifications,
        previous_experience: splitList(draft.experience),
        learnable_skills: splitList(draft.learnable),
      };
      const operatingProfile = {
        ...(currentAgent.operating_profile || {}),
        role: currentAgent.operating_profile?.role || currentAgent.category || 'AI agent',
        objective: currentAgent.operating_profile?.objective || currentAgent.description || currentAgent.purpose || '',
        skills: skills.map(item => item.name),
        skills_registry: nextRegistry,
      };
      const updated = await updateAgent({ data: {
        id: currentAgent.id,
        name: currentAgent.name,
        description: currentAgent.description || '',
        category: currentAgent.category || 'custom',
        purpose: currentAgent.purpose || '',
        personality: currentAgent.personality || '',
        system_prompt: currentAgent.system_prompt || '',
        model: currentAgent.model || '',
        model_provider: currentAgent.model_provider || 'openai',
        temperature: currentAgent.temperature,
        max_tokens: currentAgent.max_tokens,
        memory_enabled: currentAgent.memory_enabled,
        requires_approval: currentAgent.requires_approval,
        autonomy: currentAgent.autonomy,
        instructions: currentAgent.instructions || '',
        allowed_tools: currentAgent.allowed_tools || currentAgent.tools || [],
        preferences: currentAgent.preferences || {},
        status: currentAgent.status || 'draft',
        operating_profile: operatingProfile,
      } });
      setSavedAgent(updated);
      onAgentUpdated?.(updated);
      setEditing(false);
      toast({ title: 'Skills registry updated', description: 'Blackstar will use the updated capability profile for future matching.' });
    } catch (error) {
      toast({ title: 'Could not update skills registry', description: error?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[.035] p-4 shadow-[0_18px_60px_rgba(0,0,0,.2)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-white"><BrainCircuit className="h-3.5 w-3.5 text-violet-300" />Universal Skills Registry</p>
          <p className="mt-1 text-[10px] leading-4 text-zinc-500">Capability evidence used for bounded matching. Blackstar verification can expire after repeated verifier-confirmed failures and be earned back; runtime permissions and approvals remain authoritative.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`rounded-md border px-2 py-1 text-[10px] ${learningEnabled ? 'border-emerald-400/15 bg-emerald-400/[.06] text-emerald-300' : 'border-white/10 bg-black/20 text-zinc-500'}`}>{learningEnabled ? 'Verified learning on' : 'Learning paused'}</span>
          <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-zinc-500">v{registry.version}</span>
          {!editing ? (
            <button type="button" onClick={beginEdit} className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-zinc-400 hover:text-white" aria-label="Edit skills registry"><Pencil className="h-3.5 w-3.5" /></button>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <textarea value={draft.skills} onChange={e => setDraft(p => ({ ...p, skills: e.target.value }))} placeholder="Core skills" className={`${areaCls} h-16`} />
          <textarea value={draft.connectors} onChange={e => setDraft(p => ({ ...p, connectors: e.target.value }))} placeholder="Connectors / services" className={`${areaCls} h-14`} />
          <textarea value={draft.certifications} onChange={e => setDraft(p => ({ ...p, certifications: e.target.value }))} placeholder="Certifications" className={`${areaCls} h-14`} />
          <textarea value={draft.experience} onChange={e => setDraft(p => ({ ...p, experience: e.target.value }))} placeholder="Previous experience" className={`${areaCls} h-16`} />
          <textarea value={draft.learnable} onChange={e => setDraft(p => ({ ...p, learnable: e.target.value }))} placeholder="Skills this agent can learn" className={`${areaCls} h-14`} />
          <p className="text-[10px] leading-4 text-zinc-600">Existing verified evidence and verified certification state are preserved when the matching skill or certification remains in the list. New entries start as declared, not verified.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-white"><X className="h-3.5 w-3.5" />Cancel</button>
            <button type="button" onClick={save} disabled={saving} className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-violet-500 disabled:opacity-60"><Check className="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <Section icon={Sparkles} title="Skills">
            {registry.skills.length ? (
              <div className="space-y-2">
                {registry.skills.map((skill) => {
                  const verifiedTasks = (skill.evidence || []).filter((item) => item.kind === 'verified_task' && item.verified).length;
                  const verifiedFailures = (skill.evidence || []).filter((item) => item.kind === 'verified_failure' && item.verified).length;
                  const verified = verifiedTasks > 0
                    || (skill.evidence || []).some((item) => item.verified && item.kind !== 'verified_failure')
                    || (skill.certifications || []).some((item) => item.status === 'verified');
                  const evidenceLabel = verifiedTasks > 0 && verifiedFailures > 0
                    ? `${verifiedTasks} verified · ${verifiedFailures} flagged`
                    : verifiedTasks > 0
                      ? `${verifiedTasks} verified task${verifiedTasks === 1 ? '' : 's'}`
                      : verifiedFailures > 0
                        ? `${verifiedFailures} verifier flag${verifiedFailures === 1 ? '' : 's'}`
                        : verified ? 'Verified evidence' : 'Declared';
                  return (
                    <div key={skill.name} className="rounded-xl border border-white/8 bg-black/15 p-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-xs font-medium text-zinc-200">{skill.name}</span>
                        <span className={`shrink-0 text-[10px] ${verifiedFailures > 0 ? 'text-amber-300' : verified ? 'text-emerald-300' : 'text-zinc-500'}`}>
                          {evidenceLabel} · {Math.round((skill.proficiency ?? 0.5) * 100)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <span className="text-[11px] text-zinc-600">No skills declared</span>}
          </Section>

          {registry.tools?.length ? (
            <Section icon={Wrench} title="Tools"><div className="flex flex-wrap gap-1.5">{registry.tools.map((item) => <Chip key={item}>{item}</Chip>)}</div></Section>
          ) : null}
          {registry.connectors?.length ? (
            <Section icon={Plug} title="Connectors"><div className="flex flex-wrap gap-1.5">{registry.connectors.map((item) => <Chip key={item}>{item}</Chip>)}</div></Section>
          ) : null}
          {registry.certifications?.length ? (
            <Section icon={BadgeCheck} title="Certifications"><div className="flex flex-wrap gap-1.5">{registry.certifications.map((item) => <Chip key={`${item.name}-${item.issuer || ''}`} tone={item.status === 'verified' ? 'verified' : item.status === 'expired' ? 'expired' : 'default'}>{item.name} · {item.status}</Chip>)}</div></Section>
          ) : null}
          {registry.learnable_skills?.length ? (
            <Section icon={BrainCircuit} title="Learning gaps">
              <div className="flex flex-wrap gap-1.5">{registry.learnable_skills.map((item) => <Chip key={item} tone="learning">{item}</Chip>)}</div>
              <p className="mt-2 text-[10px] leading-4 text-zinc-600">Operator-declared skills awaiting verifier-backed execution evidence.</p>
            </Section>
          ) : null}
          {registry.permissions?.length ? (
            <Section icon={ShieldCheck} title="Declared scopes"><div className="flex flex-wrap gap-1.5">{registry.permissions.map((item) => <Chip key={item}>{item}</Chip>)}</div></Section>
          ) : null}
        </div>
      )}
    </div>
  );
}
