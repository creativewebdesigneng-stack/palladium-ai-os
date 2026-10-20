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
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[.07] p-3"><Users className="h-4 w-4 text-cyan-200/65" /><p className="mt-2 text-xl font-semibold text-white">{data.activeAgentCount}</p><p className="mt-1 text-[11px] text-white/45">Active agents visible to owner</p></div>
        <div className="rounded-xl border border-white/[.07] p-3"><Users className="h-4 w-4 text-violet-200/65" /><p className="mt-2 text-xl font-semibold text-white">{data.distinctAgentRoleCoverage} / {data.requiredRoles}</p><p className="mt-1 text-[11px] text-white/45">Maximum roles staffed by distinct agents with matching grants</p></div>
        <div className="rounded-xl border border-white/[.07] p-3"><ShieldCheck className="h-4 w-4 text-cyan-200/65" /><p className="mt-2 text-xl font-semibold text-white">{data.providerConfiguredDistinctCoverage} / {data.requiredRoles}</p><p className="mt-1 text-[11px] text-white/45">Distinct roles with matching grants and configured model access (not live-tested)</p></div>
        <div className="rounded-xl border border-white/[.07] p-3"><ShieldCheck className="h-4 w-4 text-amber-200/65" /><p className="mt-2 text-sm font-semibold text-white">{data.runtimeEnabled ? 'Runtime enabled' : 'Master stop engaged'}</p><p className="mt-1 text-[11px] text-white/45">Existing global runtime control; execution still requires a separate action</p></div>
      </div>
      {data.truncated && <p className="mt-3 text-xs text-amber-200">Agent query limit reached; coverage is incomplete.</p>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {data.roles.map((role) => <article key={role.id} className="rounded-xl border border-white/[.07] bg-black/20 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="text-xs font-semibold text-white">{role.title}</h4><span className={role.candidates.length ? 'text-[10px] text-cyan-200' : 'text-[10px] text-amber-200'}>{role.candidates.length ? 'Grant match only' : 'No tool grant match'}</span></div>
          <p className="mt-2 text-[11px] leading-5 text-white/45">{role.candidates.length ? role.candidates.map((agent) => agent.name).join(', ') : 'Configure an eligible specialist and assign its approved tools in Agent Builder.'}</p>
          {role.candidates.length > 0 && <p className="mt-2 text-[10px] leading-4 text-white/40">Model configuration: {role.candidates.map((agent) => `${agent.name} · ${agent.modelProvider}: ${agent.modelProviderConfiguration === 'missing_configuration' ? 'not configured' : agent.modelProviderConfiguration === 'deployment_configured' ? 'deployment credentials present' : 'owner connection recorded'}`).join(' / ')}</p>}
          <p className="mt-2 text-[10px] leading-4 text-white/30">Matching tool grants: {role.acceptedTools.join(', ')}</p>
        </article>)}
      </div>
      <p className="mt-4 text-xs leading-5 text-amber-100/70">Next gate: fix missing model-provider configuration and certify live model calls, tool runs and connections for each role with non-simulated receipts. Do not treat grants, model selection, internal credits or planning results as proof of provider execution or earned money.</p>
    </>}
  </section>;
}
