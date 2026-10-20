import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { AlertTriangle, ShieldCheck, Users } from 'lucide-react';
import { getSixAgentBusinessReadiness } from '@/lib/runtime/business-team-readiness.functions';
import { friendlyMessage } from '@/lib/errors';

/**
 * This is a non-executing diagnostic: agent tool GRANTS are not provider or
 * capability certifications. Never imply six agents actually ran a business.
 */
export default function BusinessTeamReadinessPanel({ session }) {
  const readinessFn = useServerFn(getSixAgentBusinessReadiness);
  const readiness = useQuery({
    queryKey: ['autonomous-six-agent-readiness'],
    queryFn: () => readinessFn(),
    enabled: session === 'yes',
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 1,
  });
  const data = readiness.data;

  return <section aria-labelledby="six-agent-readiness-title" className="mt-4 rounded-[28px] border border-cyan-300/10 bg-black/35 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-200/70">Read-only prerequisite check</p>
        <h3 id="six-agent-readiness-title" className="mt-1 text-xl font-semibold text-white">Business team readiness</h3>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-white/45">Matches existing active agents to role-related tool grants. This is not a successful model call, a tested provider connection, an agent skill certification, or proof of revenue.</p>
      </div>
      <button type="button" onClick={() => readiness.refetch()} disabled={session !== 'yes' || readiness.isFetching} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60 disabled:opacity-40">{readiness.isFetching ? 'Checking…' : 'Recheck team'}</button>
    </div>
    {session === 'yes' && readiness.isLoading && <p className="mt-4 text-sm text-white/40">Checking available agent assignments…</p>}
    {readiness.isError && <p className="mt-4 text-sm text-rose-300"><AlertTriangle className="mr-1 inline h-4 w-4" />{friendlyMessage(readiness.error)}</p>}
    {data && <>
      {data.providerConfiguredDistinctCoverage < data.requiredRoles && <div role="status" className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3">
        <p className="text-xs font-semibold text-amber-100">Six-agent mission is not ready to execute</p>
        <p className="mt-1 text-xs leading-5 text-white/55">{Math.max(0, data.requiredRoles - data.activeAgentCount) > 0 ? `At least ${data.requiredRoles - data.activeAgentCount} additional active agents are needed. ` : ''}Each role must have a different active agent, a relevant approved tool grant and an available model route. Drafts cannot run. Configuration is not live certification.</p>
        <p className="mt-2 text-xs text-amber-100/80">Existing drafts: {data.draftAgentCount} ({data.draftAgentsWithToolGrants} with any grants). Even if all eligible drafts were activated, current tool grants could cover at most {data.potentialDistinctRoleCoverage}/{data.requiredRoles} distinct roles; with configured model access the upper bound is {data.potentialProviderConfiguredCoverage}/{data.requiredRoles}. These are possibilities, not completed setup.</p>
        {data.roles.filter((role) => role.candidates.length === 0 && role.draftCandidates.length === 0).length > 0 && <p className="mt-2 text-xs text-amber-100">No matching tool grants on active or draft agents for: {data.roles.filter((role) => role.candidates.length === 0 && role.draftCandidates.length === 0).map((role) => role.title).join(', ')}. Assign only the grants genuinely required, using existing Agent Builder approvals.</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/agents" className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/80 hover:border-white/30">Review existing draft agents</a>
          <a href="/agents/new" className="rounded-lg border border-cyan-300/20 px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-300/[.06]">Configure new specialist</a>
        </div>
      </div>}
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[.07] p-3"><Users className="h-4 w-4 text-cyan-200/65" /><p className="mt-2 text-xl font-semibold text-white">{data.activeAgentCount}</p><p className="mt-1 text-[11px] text-white/45">Active agents visible to owner</p></div>
        <div className="rounded-xl border border-white/[.07] p-3"><Users className="h-4 w-4 text-violet-200/65" /><p className="mt-2 text-xl font-semibold text-white">{data.distinctAgentRoleCoverage} / {data.requiredRoles}</p><p className="mt-1 text-[11px] text-white/45">Maximum roles staffed by distinct agents with matching grants</p></div>
        <div className="rounded-xl border border-white/[.07] p-3"><ShieldCheck className="h-4 w-4 text-cyan-200/65" /><p className="mt-2 text-xl font-semibold text-white">{data.providerConfiguredDistinctCoverage} / {data.requiredRoles}</p><p className="mt-1 text-[11px] text-white/45">Distinct roles with matching grants and configured model access (not live-tested)</p></div>
        <div className="rounded-xl border border-white/[.07] p-3"><ShieldCheck className="h-4 w-4 text-amber-200/65" /><p className="mt-2 text-sm font-semibold text-white">{data.runtimeEnabled ? 'Runtime enabled' : 'Master stop engaged'}</p><p className="mt-1 text-[11px] text-white/45">Existing global runtime control; execution still requires a separate action</p></div>
      </div>
      {data.truncated && <p className="mt-3 text-xs text-amber-200">Agent query limit reached; coverage is incomplete.</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {data.roles.map((role) => <article key={role.id} className="rounded-xl border border-white/[.07] bg-black/20 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="text-xs font-semibold text-white">{role.title}</h4><span className={data.assignedProviderConfiguredAgents?.some((match) => match.roleId === role.id && match.agentId) ? 'text-[10px] text-cyan-200' : 'text-[10px] text-amber-200'}>{data.assignedProviderConfiguredAgents?.some((match) => match.roleId === role.id && match.agentId) ? 'Provider-configured grant match' : role.candidates.length ? 'Distinct provider-ready specialist needed' : 'No tool grant match'}</span></div>
          <p className="mt-2 text-[11px] leading-5 text-white/45">{role.candidates.length ? role.candidates.map((agent) => agent.name).join(', ') : 'Configure an eligible specialist and assign its approved tools in Agent Builder.'}</p>
          {role.candidates.length > 0 && <p className="mt-2 text-[10px] leading-4 text-white/40">Model configuration: {role.candidates.map((agent) => `${agent.name} · ${agent.modelProvider}: ${agent.modelProviderConfiguration === 'missing_configuration' ? 'not configured' : agent.modelProviderConfiguration === 'deployment_configured' ? 'deployment credentials present' : 'owner connection recorded'}`).join(' / ')}</p>}
          {role.draftCandidates.length > 0 && <p className="mt-2 text-[10px] leading-4 text-cyan-100/50">Drafts with matching tool grants (not executable): {role.draftCandidates.map((agent) => `${agent.name} · ${agent.modelProviderConfiguration === 'missing_configuration' ? 'model route unavailable' : 'model configured, not live-tested'}`).join(' / ')}</p>}
          {role.candidates.length === 0 && role.draftCandidates.length === 0 && <p className="mt-2 text-[10px] leading-4 text-amber-100/70">Neither active agents nor drafts currently have a matching tool grant for this role.</p>}
          <p className="mt-2 text-[10px] leading-4 text-white/30">Matching tool grants: {role.acceptedTools.join(', ')}</p>
        </article>)}
      </div>
      <p className="mt-4 text-xs leading-5 text-amber-100/70">Next gate: fix missing model-provider configuration and certify live model calls, tool runs and connections for each role with non-simulated receipts. Do not treat grants, model selection, internal credits or planning results as proof of provider execution or earned money.</p>
    </>}
  </section>;
}
