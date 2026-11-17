import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Bot, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { SectionHead, EmptyState } from './shared';
import { useWorkspace } from '@/hooks/use-workspace';
import { listAgents } from '@/lib/agents/agents.functions';
import { listTeams, saveTeam } from '@/lib/platform/platform.functions';
import { friendlyMessage } from '@/lib/errors';

function withAssignmentTimeout(promise, label, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} did not respond within 15 seconds.`)), timeoutMs);
    Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export default function AgentAssignments() {
  const queryClient = useQueryClient();
  const { session, organisations, activeOrgId } = useWorkspace();
  const org = organisations.find((item) => item.id === activeOrgId) ?? organisations[0] ?? null;
  const orgId = org?.id ?? null;
  const canManage = org?.role === 'owner' || org?.role === 'admin';
  const teamsFn = useServerFn(listTeams);
  const agentsFn = useServerFn(listAgents);
  const saveTeamFn = useServerFn(saveTeam);

  const teams = useQuery({
    queryKey: ['team-agent-assignment-teams', orgId],
    queryFn: () => withAssignmentTimeout(teamsFn({ data: { orgId } }), 'Team list'),
    enabled: session === 'yes' && Boolean(orgId),
    retry: false,
  });
  const agents = useQuery({
    queryKey: ['team-agent-assignment-agents', orgId],
    queryFn: () => withAssignmentTimeout(agentsFn({ data: { limit: 200, withTasks: false } }), 'Agent list'),
    enabled: session === 'yes' && Boolean(orgId),
    retry: false,
  });
  const organisationAgents = useMemo(
    () => (agents.data?.agents ?? []).filter((agent) => agent.org_id === orgId || agent.org_id_fk === orgId),
    [agents.data, orgId],
  );

  const assignment = useMutation({
    mutationFn: ({ team, leadAgentId }) => saveTeamFn({
      data: {
        id: team.id,
        orgId,
        name: team.name,
        description: team.description ?? '',
        leadAgentId: leadAgentId || null,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-agent-assignment-teams', orgId] });
      queryClient.invalidateQueries({ queryKey: ['team-teams', orgId] });
      queryClient.invalidateQueries({ queryKey: ['org-teams', orgId] });
    },
  });

  const retry = () => {
    teams.refetch();
    agents.refetch();
  };

  return (
    <div>
      <SectionHead icon={Bot} title="AI Agent Assignments" grad="from-violet-500 to-fuchsia-500" />
      {session === 'no' ? <EmptyState icon={ShieldAlert} title="Sign in required" desc="Sign in to view team agent assignments." /> :
        session === 'unknown' || teams.isLoading || agents.isLoading ? (
          <div role="status" className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.02] p-5 text-xs text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Loading teams and organisation agents…</div>
        ) : !orgId ? <EmptyState icon={Bot} title="No organisation selected" desc="Create or join an organisation before assigning agents to teams." /> :
        teams.error || agents.error ? (
          <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/[.05] p-4 text-xs text-rose-200">{friendlyMessage(teams.error || agents.error)}<button onClick={retry} className="ml-2 inline-flex items-center gap-1 underline"><RefreshCw className="h-3 w-3" />Retry</button></div>
        ) : (teams.data ?? []).length === 0 ? <EmptyState icon={Bot} title="No teams yet" desc="Create a team in Team Structure, then assign its lead AI agent here." /> : (
          <>
            <p className="mb-3 text-[11px] text-zinc-500">Assign one organisation-owned AI agent as the lead for each team. Assignments are saved to the team's lead_agent_id field and validated against the selected organisation.</p>
            {organisationAgents.length === 0 && <div className="mb-3 rounded-xl border border-amber-300/15 bg-amber-300/[.04] p-3 text-[11px] text-amber-100/80">No AI agents are currently assigned to this organisation. Create or move an agent into this organisation before assigning a team lead.</div>}
            <div className="space-y-2">
              {(teams.data ?? []).map((team) => {
                const currentAgent = organisationAgents.find((agent) => agent.id === team.lead_agent_id);
                return (
                  <div key={team.id} className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white">{team.name}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">{currentAgent ? `Lead: ${currentAgent.name}` : 'No lead agent assigned'}</p>
                    </div>
                    <select
                      aria-label={`Lead AI agent for ${team.name}`}
                      value={team.lead_agent_id ?? ''}
                      disabled={!canManage || organisationAgents.length === 0 || assignment.isPending}
                      onChange={(event) => assignment.mutate({ team, leadAgentId: event.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-[240px]"
                    >
                      <option value="">No lead agent</option>
                      {organisationAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            {!canManage && <p className="mt-3 text-[10px] text-zinc-600">Only organisation owners and admins can change team lead-agent assignments.</p>}
            {assignment.error && <p role="alert" className="mt-3 text-xs text-rose-300">{friendlyMessage(assignment.error)}</p>}
          </>
        )}
    </div>
  );
}
