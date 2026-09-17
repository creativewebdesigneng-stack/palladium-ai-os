import { BadgeCheck, BrainCircuit, Plug, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { effectiveAgentSkillsRegistry } from '@/lib/agents/agent-skills-registry';

function Chip({ children, tone = 'default' }) {
  const cls = tone === 'verified'
    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
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

export default function AgentSkillsRegistryPanel({ agent }) {
  const legacySkills = agent?.operating_profile?.skills || [];
  const tools = agent?.allowed_tools || agent?.tools || [];
  const registry = effectiveAgentSkillsRegistry({
    registry: agent?.operating_profile?.skills_registry,
    legacySkills,
    allowedTools: tools,
    modelProvider: agent?.model_provider,
    model: agent?.model,
  });

  if (!registry) return null;

  return (
    <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[.035] p-4 shadow-[0_18px_60px_rgba(0,0,0,.2)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-white"><BrainCircuit className="h-3.5 w-3.5 text-violet-300" />Universal Skills Registry</p>
          <p className="mt-1 text-[10px] leading-4 text-zinc-500">Capability evidence used for bounded matching. Runtime permissions and approvals remain authoritative.</p>
        </div>
        <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-zinc-500">v{registry.version}</span>
      </div>

      <div className="mt-4 space-y-4">
        <Section icon={Sparkles} title="Skills">
          {registry.skills.length ? (
            <div className="space-y-2">
              {registry.skills.map((skill) => {
                const verified = (skill.evidence || []).some((item) => item.verified)
                  || (skill.certifications || []).some((item) => item.status === 'verified');
                return (
                  <div key={skill.name} className="rounded-xl border border-white/8 bg-black/15 p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-xs font-medium text-zinc-200">{skill.name}</span>
                      <span className={`shrink-0 text-[10px] ${verified ? 'text-emerald-300' : 'text-zinc-500'}`}>
                        {verified ? 'Verified evidence' : 'Declared'} · {Math.round((skill.proficiency ?? 0.5) * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <span className="text-[11px] text-zinc-600">No skills declared</span>}
        </Section>

        {registry.tools?.length ? (
          <Section icon={Wrench} title="Tools">
            <div className="flex flex-wrap gap-1.5">{registry.tools.map((item) => <Chip key={item}>{item}</Chip>)}</div>
          </Section>
        ) : null}

        {registry.connectors?.length ? (
          <Section icon={Plug} title="Connectors">
            <div className="flex flex-wrap gap-1.5">{registry.connectors.map((item) => <Chip key={item}>{item}</Chip>)}</div>
          </Section>
        ) : null}

        {registry.certifications?.length ? (
          <Section icon={BadgeCheck} title="Certifications">
            <div className="flex flex-wrap gap-1.5">
              {registry.certifications.map((item) => <Chip key={`${item.name}-${item.issuer || ''}`} tone={item.status === 'verified' ? 'verified' : 'default'}>{item.name} · {item.status}</Chip>)}
            </div>
          </Section>
        ) : null}

        {registry.learnable_skills?.length ? (
          <Section icon={BrainCircuit} title="Can learn">
            <div className="flex flex-wrap gap-1.5">{registry.learnable_skills.map((item) => <Chip key={item} tone="learning">{item}</Chip>)}</div>
          </Section>
        ) : null}

        {registry.permissions?.length ? (
          <Section icon={ShieldCheck} title="Declared scopes">
            <div className="flex flex-wrap gap-1.5">{registry.permissions.map((item) => <Chip key={item}>{item}</Chip>)}</div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
