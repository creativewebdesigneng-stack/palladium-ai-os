import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';

import { Gauge, User, ShieldAlert, ShoppingBag, Brain, ListChecks, ScrollText, Cpu, Globe2, Bell, Briefcase } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import BriefingConsole from '@/components/mission/BriefingConsole';
import MissionMetrics from '@/components/mission/MissionMetrics';
import ActivityStream from '@/components/mission/ActivityStream';
import ProfessionalPanel from '@/components/mission/ProfessionalPanel';

import ApprovalCentre from '@/components/mission/ApprovalCentre';
import PersonalAISection from '@/components/mission/PersonalAISection';
import AgentBuilder from '@/components/mission/AgentBuilder';
import MemoryVault from '@/components/mission/MemoryVault';
import ShoppingBoard from '@/components/mission/ShoppingBoard';
import TaskBoard from '@/components/mission/TaskBoard';
import SignalsPanel from '@/components/mission/SignalsPanel';
import { DEFAULT_ALLOWED_DOMAINS } from '@/lib/mission/catalog';
import { friendlyMessage } from '@/lib/errors';
import {
  getMissionOverview, savePersonalAgent, deletePersonalAgent, submitPersonalTask,
  decideApproval, chooseAlternative, confirmPurchase, saveMemory, deleteMemory, updateTaskStatus,
  markNotifications, clearMemoryCategory,
} from '@/lib/mission/mission.functions';

const TABS = [
  ['overview', 'Overview', Gauge],
  ['personal', 'Personal AI', User],
  ['professional', 'Professional AI', Briefcase],
  ['approvals', 'Approval centre', ShieldAlert],

  ['shopping', 'Shopping', ShoppingBag],
  ['tasks', 'Tasks', ListChecks],
  ['signals', 'Notifications & usage', Bell],
  ['memory', 'Memory', Brain],
  ['audit', 'Audit trail', ScrollText],
];

export default function MissionControl() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [builder, setBuilder] = useState({ open: false, initial: null });
  const [busyId, setBusyId] = useState(null);

  const overviewFn = useServerFn(getMissionOverview);
  const saveAgentFn = useServerFn(savePersonalAgent);
  const deleteAgentFn = useServerFn(deletePersonalAgent);
  const submitTaskFn = useServerFn(submitPersonalTask);
  const decideFn = useServerFn(decideApproval);
  const altFn = useServerFn(chooseAlternative);
  const confirmFn = useServerFn(confirmPurchase);
  const saveMemoryFn = useServerFn(saveMemory);
  const deleteMemoryFn = useServerFn(deleteMemory);
  const taskStatusFn = useServerFn(updateTaskStatus);
  const markNotificationsFn = useServerFn(markNotifications);
  const clearCategoryFn = useServerFn(clearMemoryCategory);

  // Mission Control's server functions require a real backend session bearer
  // token, so only query once a session exists on the client.
  const [session, setSession] = useState('unknown');
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ? 'yes' : 'no'); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ? 'yes' : 'no'));
    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mission-overview'],
    queryFn: () => overviewFn({ data: {} }),
    enabled: session === 'yes',
    retry: false,
    refetchInterval: 30000,
  });


  const refresh = () => qc.invalidateQueries({ queryKey: ['mission-overview'] });

  // Live updates: agent activity, tasks, approvals and notifications stream in.
  useEffect(() => {
    if (session !== 'yes') return undefined;
    const channel = supabase
      .channel('mission-control')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_activities' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_tasks' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  const fail = (e) => {
    console.error('[mission-control]', e);
    toast({ title: 'Something went wrong', description: friendlyMessage(e), variant: 'destructive' });
  };

  const dispatch = useMutation({
    mutationFn: (vars) => submitTaskFn({ data: { request: vars.request, agentId: vars.agentId ?? null } }),
    onSuccess: (res) => {
      const d = res?.decision;
      toast({
        title: d?.requiresApproval ? 'Prepared — awaiting your approval' : 'Task dispatched',
        description: d?.reason ?? 'Mission Control routed your request.',
      });
      if (d?.category === 'shopping') setTab('approvals');
      refresh();
    },
    onError: fail,
  });

  const agentMutation = useMutation({
    mutationFn: (vars) => saveAgentFn({ data: vars }),
    onSuccess: (agent) => { setBuilder({ open: false, initial: null }); toast({ title: `${agent?.name ?? 'Agent'} saved` }); refresh(); },
    onError: fail,
  });

  const removeAgent = useMutation({
    mutationFn: (id) => deleteAgentFn({ data: { id } }),
    onSuccess: () => { toast({ title: 'Agent deleted' }); refresh(); },
    onError: fail,
  });

  const decide = useMutation({
    mutationFn: (vars) => decideFn({ data: { id: vars.id, decision: vars.decision } }),
    onSuccess: (res, vars) => {
      toast({
        title: vars.decision === 'approve' ? 'Approved' : 'Rejected',
        description: vars.decision === 'approve' && res?.purchase
          ? 'Confirm the cost breakdown to continue to secure checkout.'
          : 'The agent has been told your decision.',
      });
      refresh();
    },
    onError: fail,
    onSettled: () => setBusyId(null),
  });

  const alternative = useMutation({
    mutationFn: (vars) => altFn({ data: { approvalId: vars.approvalId, resultId: vars.resultId } }),
    onSuccess: () => { toast({ title: 'Alternative prepared', description: 'Review the new cost breakdown before approving.' }); refresh(); },
    onError: fail,
  });

  const checkout = useMutation({
    mutationFn: (id) => confirmFn({ data: { purchaseId: id } }),
    onSuccess: (res) => {
      toast({ title: 'Checkout ready', description: 'You are being sent to the seller to complete payment yourself.' });
      if (res?.checkoutUrl && typeof window !== 'undefined') window.open(res.checkoutUrl, '_blank', 'noopener,noreferrer');
      refresh();
    },
    onError: fail,
    onSettled: () => setBusyId(null),
  });

  const memoryMutation = useMutation({
    mutationFn: (vars) => saveMemoryFn({ data: vars }),
    onSuccess: () => { toast({ title: 'Preference saved' }); refresh(); },
    onError: fail,
  });

  const memoryDelete = useMutation({
    mutationFn: (id) => deleteMemoryFn({ data: { id } }),
    onSuccess: () => refresh(),
    onError: fail,
  });

  const notificationsMutation = useMutation({
    mutationFn: (vars) => markNotificationsFn({ data: vars }),
    onSuccess: refresh,
    onError: fail,
  });

  const clearCategory = useMutation({
    mutationFn: (category) => clearCategoryFn({ data: { category } }),
    onSuccess: () => { toast({ title: 'Category cleared' }); refresh(); },
    onError: fail,
  });

  const completeTask = useMutation({
    mutationFn: (id) => taskStatusFn({ data: { id, status: 'completed' } }),
    onSuccess: () => refresh(),
    onError: fail,
  });

  const agents = data?.agents ?? [];
  const approvals = data?.approvals ?? [];
  const pendingCount = useMemo(() => approvals.filter((a) => a.status === 'pending').length, [approvals]);

  const openTemplate = (t) => setBuilder({
    open: true,
    initial: {
      name: t.name, category: t.category, purpose: t.purpose,
      allowed_tools: t.tools, autonomy: t.autonomy,
      budget_limit: t.budget ?? '', allowed_domains: DEFAULT_ALLOWED_DOMAINS,
    },
  });

  return (
    <>
      <PageHeader
        eyebrow="Mission Control"
        title="Mission Control"
        description="Your command centre for personal and professional AI. Tell it what you need — it routes the right agent, does the work, and asks before anything sensitive happens."
        action={
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] text-zinc-400 sm:inline-flex">
              <Cpu className="h-3.5 w-3.5 text-violet-400" />{agents.length} agents online
            </span>
            {pendingCount > 0 && (
              <button onClick={() => setTab('approvals')} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
                <ShieldAlert className="h-3.5 w-3.5" />{pendingCount} awaiting approval
              </button>
            )}
          </div>
        }
      />

      {session === 'yes' && error && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/[.06] p-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold text-rose-100"><ShieldAlert className="h-4 w-4" />Mission Control could not load</p>
            <p className="mt-1 text-[11px] text-rose-200/80">{friendlyMessage(error)}</p>
          </div>
          <button onClick={() => refetch()} className="ml-auto rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/10">Try again</button>
        </div>
      )}

      {session === 'no' && (
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/[.06] p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-100"><ShieldAlert className="h-4 w-4" />Sign in to activate Mission Control</p>
          <p className="mt-1 text-[11px] text-amber-200/80">Your agents, tasks, approvals and memory are private to your account, so Mission Control needs a signed-in session before it can load or run anything.</p>
        </div>
      )}

      <BriefingConsole
        briefing={data?.briefing}
        loading={isLoading && session !== 'no'}
        agents={agents}
        submitting={dispatch.isPending}
        onSubmit={(vars) => dispatch.mutate(vars)}
      />


      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
              tab === id ? 'bg-violet-500/15 text-white ring-1 ring-violet-400/25' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />{label}
            {id === 'approvals' && pendingCount > 0 && <span className="rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-200">{pendingCount}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {tab === 'overview' && (
          <>
            <MissionMetrics metrics={data?.metrics} loading={isLoading && session !== 'no'} />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <TaskBoard tasks={data?.tasks ?? []} onComplete={(t) => completeTask.mutate(t.id)} />
              </div>
              <ActivityStream activities={data?.activities ?? []} loading={isLoading && session !== 'no'} />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Globe2 className="h-4 w-4 text-cyan-400" />Browser agent</h2>
              <p className="mt-1 text-[11px] text-zinc-500">
                Provider-agnostic automation layer. Agents may only visit domains on their allowlist, can prepare a checkout, and can never authorise a payment.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {DEFAULT_ALLOWED_DOMAINS.map((d) => <span key={d} className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] text-zinc-400">{d}</span>)}
              </div>
            </div>
          </>
        )}

        {tab === 'personal' && (
          <PersonalAISection
            agents={data?.personalAgents ?? agents}

            loading={isLoading && session !== 'no'}
            onCreate={(category) => setBuilder({ open: true, initial: category ? { category } : null })}
            onEdit={(agent) => setBuilder({ open: true, initial: { ...agent, allowed_domains: DEFAULT_ALLOWED_DOMAINS } })}
            onDelete={(agent) => removeAgent.mutate(agent.id)}
            onRun={(agent) => { setTab('overview'); toast({ title: `${agent.name} selected`, description: 'Type your request in the console and pick this agent to route it.' }); }}
            onTemplate={openTemplate}
          />
        )}

        {tab === 'approvals' && (
          <ApprovalCentre
            approvals={approvals}
            purchases={data?.purchases ?? []}
            results={data?.shoppingResults ?? []}
            loading={isLoading && session !== 'no'}
            busyId={busyId}
            onDecide={(a, decision) => { setBusyId(a.id); decide.mutate({ id: a.id, decision }); }}
            onChooseAlternative={(a, alt) => alternative.mutate({ approvalId: a.id, resultId: alt.id })}
            onConfirmPurchase={(p) => { setBusyId(p.id); checkout.mutate(p.id); }}
            onAskAgent={(a) => toast({ title: 'Ask the agent', description: `Send a follow-up about “${a.title}” from the console — the agent keeps this request open.` })}
          />
        )}

        {tab === 'shopping' && (
          <ShoppingBoard shoppingResults={data?.shoppingResults ?? []} purchases={data?.purchases ?? []} loading={isLoading && session !== 'no'} />
        )}

        {tab === 'tasks' && <TaskBoard tasks={data?.tasks ?? []} onComplete={(t) => completeTask.mutate(t.id)} />}

        {tab === 'signals' && (
          <SignalsPanel
            notifications={data?.notifications ?? []}
            usage={data?.usage}
            loading={isLoading && session !== 'no'}
            onRead={(n) => notificationsMutation.mutate({ id: n.id })}
            onReadAll={() => notificationsMutation.mutate({ all: true })}
          />
        )}

        {tab === 'memory' && (
          <MemoryVault
            memories={data?.memories ?? []}
            loading={isLoading && session !== 'no'}
            saving={memoryMutation.isPending}
            onSave={(m) => memoryMutation.mutate(m)}
            onDelete={(m) => memoryDelete.mutate(m.id)}
            onClearCategory={(category) => clearCategory.mutate(category)}
          />
        )}

        {tab === 'audit' && (
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><ScrollText className="h-4 w-4 text-violet-400" />Audit trail</h2>
            <p className="mt-1 text-[11px] text-zinc-500">Every sensitive action is recorded server-side.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[11px]">
                <thead className="text-[10px] uppercase tracking-wider text-zinc-600">
                  <tr><th className="pb-2 pr-3 font-medium">Action</th><th className="pb-2 pr-3 font-medium">Target</th><th className="pb-2 pr-3 font-medium">Status</th><th className="pb-2 font-medium">When</th></tr>
                </thead>
                <tbody>
                  {(data?.audit ?? []).map((row) => (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="py-2 pr-3 text-zinc-200">{row.action.replace(/_/g, ' ')}</td>
                      <td className="py-2 pr-3 text-zinc-500">{row.target_type ?? '—'}</td>
                      <td className="py-2 pr-3 text-zinc-400">{row.status}</td>
                      <td className="py-2 text-zinc-600">{new Date(row.created_at).toLocaleString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data?.audit ?? []).length === 0 && <p className="text-xs text-zinc-600">No recorded actions yet.</p>}
            </div>
          </div>
        )}
      </div>

      <AgentBuilder
        open={builder.open}
        initial={builder.initial}
        saving={agentMutation.isPending}
        onClose={() => setBuilder({ open: false, initial: null })}
        onSave={(payload) => agentMutation.mutate(payload)}
      />
    </>
  );
}
