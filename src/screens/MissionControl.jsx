import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { Gauge, User, ShieldAlert, ShoppingBag, Brain, ListChecks, ScrollText, Bell, Briefcase, Network } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import BlackstarCommandDeck from '@/components/mission/BlackstarCommandDeck';
import BriefingConsole from '@/components/mission/BriefingConsole';
import OrchestratorConsole from '@/components/mission/OrchestratorConsole';
import ProfessionalPanel from '@/components/mission/ProfessionalPanel';
import ApprovalCentre from '@/components/mission/ApprovalCentre';
import PersonalAISection from '@/components/mission/PersonalAISection';
import AgentBuilder from '@/components/mission/AgentBuilder';
import MemoryVault from '@/components/mission/MemoryVault';
import ShoppingWorkspace from '@/components/mission/ShoppingWorkspace';
import TaskBoard from '@/components/mission/TaskBoard';
import SignalsPanel from '@/components/mission/SignalsPanel';
import { DEFAULT_ALLOWED_DOMAINS } from '@/lib/mission/catalog';
import { friendlyMessage } from '@/lib/errors';
import { useAuth } from '@/lib/AuthContext';
import {
  getMissionOverview,
  savePersonalAgent,
  deletePersonalAgent,
  submitPersonalTask,
  decideApproval,
  chooseAlternative,
  confirmPurchase,
  saveMemory,
  deleteMemory,
  updateTaskStatus,
  markNotifications,
  clearMemoryCategory,
} from '@/lib/mission/mission.functions';
import { submitMissionDiscovery } from '@/lib/mission/mission.discovery.functions';
import { decideEmailApproval } from '@/lib/mission/email-approval.functions';
import { decideExternalActionApproval, retryExternalApprovedAction } from '@/lib/mission/external-action-approval.functions';
import { decideWorkflowApprovalRequest } from '@/lib/runtime/workforce.functions';
import { runOrchestrator } from '@/lib/runtime/orchestrator.functions';

const TABS = [
  ['overview', 'Overview', Gauge],
  ['orchestrator', 'Orchestrator', Network],
  ['personal', 'Personal AI', User],
  ['professional', 'Professional AI', Briefcase],
  ['approvals', 'Approval centre', ShieldAlert],
  ['shopping', 'Live Explorer', ShoppingBag],
  ['tasks', 'Tasks', ListChecks],
  ['signals', 'Notifications & usage', Bell],
  ['memory', 'Memory', Brain],
  ['audit', 'Audit trail', ScrollText],
];

const EXTERNAL_ACTION_TYPES = new Set([
  'calendar_create',
  'slack_post',
  'hubspot_contact_update',
  'hubspot_deal_update',
  'asana_task_create',
  'asana_task_update',
  'linear_issue_create',
  'linear_issue_update',
  'notion_page_create',
]);

function isWorkflowApproval(approval) {
  const details = approval?.details;
  return approval?.action_type === 'workflow_step'
    && details
    && typeof details === 'object'
    && !Array.isArray(details)
    && typeof details.workflow_run_id === 'string'
    && typeof details.workflow_id === 'string'
    && typeof details.workflow_step_id === 'string';
}

const isEmailApproval = (approval) => approval?.action_type === 'email_send';
const isExternalActionApproval = (approval) => EXTERNAL_ACTION_TYPES.has(approval?.action_type);

export default function MissionControl() {
  const qc = useQueryClient();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [tab, setTab] = useState('overview');
  const [builder, setBuilder] = useState({ open: false, initial: null });
  const [busyId, setBusyId] = useState(null);
  const [orchestration, setOrchestration] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const seenNotificationIds = useRef(new Set());
  const notificationsPrimed = useRef(false);

  const overviewFn = useServerFn(getMissionOverview);
  const saveAgentFn = useServerFn(savePersonalAgent);
  const deleteAgentFn = useServerFn(deletePersonalAgent);
  const submitTaskFn = useServerFn(submitPersonalTask);
  const discoveryFn = useServerFn(submitMissionDiscovery);
  const decideFn = useServerFn(decideApproval);
  const decideEmailFn = useServerFn(decideEmailApproval);
  const decideExternalFn = useServerFn(decideExternalActionApproval);
  const retryExternalFn = useServerFn(retryExternalApprovedAction);
  const decideWorkflowFn = useServerFn(decideWorkflowApprovalRequest);
  const orchestratorFn = useServerFn(runOrchestrator);
  const altFn = useServerFn(chooseAlternative);
  const confirmFn = useServerFn(confirmPurchase);
  const saveMemoryFn = useServerFn(saveMemory);
  const deleteMemoryFn = useServerFn(deleteMemory);
  const taskStatusFn = useServerFn(updateTaskStatus);
  const markNotificationsFn = useServerFn(markNotifications);
  const clearCategoryFn = useServerFn(clearMemoryCategory);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['mission-overview'],
    queryFn: async () => {
      const result = await overviewFn({ data: {} });
      setLastSync(Date.now());
      return result;
    },
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 15000,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['mission-overview'] });
  const refreshExplorer = () => qc.invalidateQueries({ queryKey: ['shopping-workspace'] });

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const channel = supabase
      .channel('mission-control')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_activities' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personal_tasks' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_tasks' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_runs' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_requests' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_records' }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  useEffect(() => {
    const notifications = data?.notifications ?? [];
    if (!notificationsPrimed.current) {
      notifications.forEach((notification) => seenNotificationIds.current.add(notification.id));
      notificationsPrimed.current = true;
      return;
    }
    const fresh = notifications
      .filter((notification) => !notification.read_at && !seenNotificationIds.current.has(notification.id))
      .slice(0, 3);
    fresh.forEach((notification) => {
      seenNotificationIds.current.add(notification.id);
      toast({
        title: notification.title || 'Blackstar notification',
        description: notification.body || notification.message || 'New Mission Control update received.',
      });
    });
  }, [data?.notifications]);

  const fail = (err) => {
    console.error('[mission-control]', err);
    toast({ title: 'Something went wrong', description: friendlyMessage(err), variant: 'destructive' });
  };

  const orchestrate = useMutation({
    mutationFn: (goal) => orchestratorFn({ data: { goal } }),
    onSuccess: (res) => {
      setOrchestration(res);
      toast({
        title: res?.execution?.paused ? 'Mission awaiting approval' : 'Orchestration complete',
        description: res?.plan?.summary ?? 'Blackstar delegated the mission to the selected specialists.',
      });
      refresh();
    },
    onError: fail,
  });

  const dispatch = useMutation({
    mutationFn: async (vars) => {
      const payload = { request: vars.request, agentId: vars.agentId ?? null };
      const discovery = await discoveryFn({ data: payload });
      if (discovery?.handled) return discovery;
      return submitTaskFn({ data: payload });
    },
    onSuccess: (res) => {
      const decision = res?.decision;
      const execution = res?.execution;
      if (res?.discovery) {
        const count = res?.results?.length ?? 0;
        toast({
          title: `${count} live option${count === 1 ? '' : 's'} found`,
          description: res?.simulated
            ? 'Explorer is using the development browser provider. Connect a production provider for real listings and live availability.'
            : `Searched and compared live results via ${res?.provider ?? 'the browser provider'}. Nothing has been purchased or reserved.`,
        });
        setTab('shopping');
        refresh();
        refreshExplorer();
        return;
      }
      if (execution?.status === 'failed') {
        toast({ title: 'Task failed', description: execution.error ?? 'The agent could not complete this task.', variant: 'destructive' });
        refresh();
        return;
      }
      toast({
        title: decision?.requiresApproval ? 'Prepared — awaiting your approval' : execution?.status === 'completed' ? 'Task completed' : 'Task dispatched',
        description: execution?.status === 'completed' ? execution.summary : decision?.reason ?? 'Mission Control routed your request.',
      });
      if (decision?.category === 'shopping') setTab(decision?.requiresApproval ? 'approvals' : 'shopping');
      refresh();
    },
    onError: fail,
  });

  const agentMutation = useMutation({
    mutationFn: (vars) => saveAgentFn({ data: vars }),
    onSuccess: (agent) => {
      setBuilder({ open: false, initial: null });
      toast({ title: `${agent?.name ?? 'Agent'} saved` });
      refresh();
    },
    onError: fail,
  });

  const removeAgent = useMutation({
    mutationFn: (id) => deleteAgentFn({ data: { id } }),
    onSuccess: () => { toast({ title: 'Agent deleted' }); refresh(); },
    onError: fail,
  });

  const decide = useMutation({
    mutationFn: async (vars) => {
      if (isWorkflowApproval(vars.approval)) {
        return decideWorkflowFn({ data: { approval_request_id: vars.id, decision: vars.decision === 'approve' ? 'approved' : 'rejected' } });
      }
      if (isEmailApproval(vars.approval)) return decideEmailFn({ data: { id: vars.id, decision: vars.decision } });
      if (isExternalActionApproval(vars.approval)) return decideExternalFn({ data: { id: vars.id, decision: vars.decision } });
      return decideFn({ data: { id: vars.id, decision: vars.decision } });
    },
    onSuccess: (res, vars) => {
      const workflowApproval = isWorkflowApproval(vars.approval);
      const emailApproval = isEmailApproval(vars.approval);
      const externalApproval = isExternalActionApproval(vars.approval);
      const execution = res?.execution;
      toast({
        title: vars.decision === 'approve' ? (externalApproval && execution?.ok === false ? 'Approved, but action failed' : 'Approved') : 'Rejected',
        description: workflowApproval
          ? (vars.decision === 'approve' ? 'The workflow has resumed from the approval step.' : 'The workflow recorded your rejection and applied its error policy.')
          : emailApproval && vars.decision === 'approve' && res?.emailDraft
            ? `The message is now a draft in ${res.emailDraft.provider === 'microsoft' ? 'Outlook' : 'Gmail'}. It has not been sent.`
            : externalApproval && vars.decision === 'approve' && execution?.ok === true
              ? `The approved action completed${execution.provider ? ` through ${execution.provider}` : ''}.`
              : externalApproval && vars.decision === 'approve' && execution?.ok === false
                ? execution.error ?? 'The provider action failed. Reconnect the integration and retry the approved action.'
                : vars.decision === 'approve' && res?.purchase
                  ? 'Confirm the cost breakdown to continue to secure checkout.'
                  : 'The agent has been told your decision.',
        ...(externalApproval && execution?.ok === false ? { variant: 'destructive' } : {}),
      });
      refresh();
    },
    onError: fail,
    onSettled: () => setBusyId(null),
  });

  const retryExternal = useMutation({
    mutationFn: (id) => retryExternalFn({ data: { id } }),
    onSuccess: (res) => {
      toast({
        title: res?.ok ? 'Action completed' : 'Retry failed',
        description: res?.ok ? `The approved action completed${res.provider ? ` through ${res.provider}` : ''}.` : res?.error ?? 'The provider action could not be completed.',
        ...(res?.ok ? {} : { variant: 'destructive' }),
      });
      refresh();
    },
    onError: fail,
    onSettled: () => setBusyId(null),
  });

  const alternative = useMutation({
    mutationFn: (v) => altFn({ data: { approvalId: v.approvalId, resultId: v.resultId } }),
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

  const memoryMutation = useMutation({ mutationFn: (v) => saveMemoryFn({ data: v }), onSuccess: () => { toast({ title: 'Preference saved' }); refresh(); }, onError: fail });
  const memoryDelete = useMutation({ mutationFn: (id) => deleteMemoryFn({ data: { id } }), onSuccess: refresh, onError: fail });
  const notificationsMutation = useMutation({ mutationFn: (v) => markNotificationsFn({ data: v }), onSuccess: refresh, onError: fail });
  const clearCategory = useMutation({ mutationFn: (category) => clearCategoryFn({ data: { category } }), onSuccess: () => { toast({ title: 'Category cleared' }); refresh(); }, onError: fail });
  const completeTask = useMutation({ mutationFn: (id) => taskStatusFn({ data: { id, status: 'completed' } }), onSuccess: refresh, onError: fail });

  const agents = data?.agents ?? [];
  const approvals = data?.approvals ?? [];
  const pendingCount = useMemo(() => approvals.filter((approval) => approval.status === 'pending').length, [approvals]);
  const loading = isLoadingAuth || (isAuthenticated && isLoading);
  const openTemplate = (template) => setBuilder({
    open: true,
    initial: {
      name: template.name,
      category: template.category,
      purpose: template.purpose,
      allowed_tools: template.tools,
      autonomy: template.autonomy,
      budget_limit: template.budget ?? '',
      allowed_domains: DEFAULT_ALLOWED_DOMAINS,
    },
  });

  if (tab === 'overview') {
    return (
      <>
        {isAuthenticated && error ? (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-rose-400/25 bg-rose-500/[.06] p-4">
            <div><p className="text-xs font-semibold text-rose-100">Mission Control could not load</p><p className="mt-1 text-[11px] text-rose-200/80">{friendlyMessage(error)}</p></div>
            <button onClick={() => refetch()} className="ml-auto rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] text-white">Try again</button>
          </div>
        ) : null}
        {!isLoadingAuth && !isAuthenticated ? (
          <div className="mb-3 rounded-xl border border-amber-400/25 bg-amber-500/[.06] p-4"><p className="text-xs font-semibold text-amber-100">Sign in to activate Blackstar Mission Control</p><p className="mt-1 text-[11px] text-amber-200/80">Your agents, missions, approvals and live operational feeds are private to your account.</p></div>
        ) : null}
        <BlackstarCommandDeck
          metrics={data?.metrics ?? {}}
          approvals={approvals}
          notifications={data?.notifications ?? []}
          tasks={data?.tasks ?? []}
          activities={data?.activities ?? []}
          lastSync={lastSync}
          loading={loading}
          onNavigate={setTab}
        />
        <div className="mt-3 rounded-xl border border-cyan-300/10 bg-black/45 p-2">
          <BriefingConsole
            briefing={data?.briefing}
            loading={loading}
            agents={agents}
            submitting={dispatch.isPending || !isAuthenticated}
            onSubmit={(value) => dispatch.mutate(value)}
          />
        </div>
        <AgentBuilder open={builder.open} initial={builder.initial} saving={agentMutation.isPending} onClose={() => setBuilder({ open: false, initial: null })} onSave={(value) => agentMutation.mutate(value)} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Blackstar Operations"
        title="Mission Control"
        description="Live command, execution and decision intelligence across your Blackstar agent network."
        action={pendingCount > 0 ? <button onClick={() => setTab('approvals')} className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200"><ShieldAlert className="mr-1.5 inline h-3.5 w-3.5" />{pendingCount} approval</button> : null}
      />

      <div className="mt-3 flex gap-1 overflow-x-auto rounded-2xl border border-white/8 bg-black/35 p-1.5">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-medium uppercase tracking-[.08em] transition ${tab === id ? 'border border-cyan-300/15 bg-cyan-400/[.07] text-cyan-100' : 'border border-transparent text-zinc-500 hover:bg-white/[.03] hover:text-zinc-300'}`}>
            <Icon className="h-3.5 w-3.5" />{label}{id === 'approvals' && pendingCount > 0 ? <span className="rounded-full bg-amber-500/20 px-1.5 text-[9px] text-amber-200">{pendingCount}</span> : null}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {tab === 'orchestrator' && <OrchestratorConsole onRun={(goal) => orchestrate.mutate(goal)} pending={orchestrate.isPending || !isAuthenticated} result={orchestration} />}
        {tab === 'personal' && <PersonalAISection agents={data?.personalAgents ?? agents} loading={loading} onCreate={(category) => setBuilder({ open: true, initial: category ? { category } : null })} onEdit={(agent) => setBuilder({ open: true, initial: { ...agent, allowed_domains: DEFAULT_ALLOWED_DOMAINS } })} onDelete={(agent) => removeAgent.mutate(agent.id)} onRun={(agent) => { setTab('overview'); toast({ title: `${agent.name} selected`, description: 'Type your request in the command console and select this agent.' }); }} onTemplate={openTemplate} />}
        {tab === 'professional' && <ProfessionalPanel agents={data?.professionalAgents ?? []} workforces={data?.workforces ?? []} runs={data?.workforceRuns ?? []} agentRuns={data?.agentRuns ?? []} loading={loading} />}
        {tab === 'approvals' && <ApprovalCentre approvals={approvals} purchases={data?.purchases ?? []} results={data?.shoppingResults ?? []} loading={loading} busyId={busyId} onDecide={(approval, decisionValue) => { setBusyId(approval.id); decide.mutate({ id: approval.id, decision: decisionValue, approval }); }} onRetry={(approval) => { setBusyId(approval.id); retryExternal.mutate(approval.id); }} onChooseAlternative={(approval, alt) => alternative.mutate({ approvalId: approval.id, resultId: alt.id })} onConfirmPurchase={(purchase) => { setBusyId(purchase.id); checkout.mutate(purchase.id); }} onAskAgent={(approval) => toast({ title: 'Ask the agent', description: `Send a follow-up about “${approval.title}” from the console — the agent keeps this request open.` })} />}
        {tab === 'shopping' && <ShoppingWorkspace agents={(data?.agents ?? []).filter((agent) => agent.category === 'shopping' || agent.scope === 'personal')} />}
        {tab === 'tasks' && <TaskBoard tasks={data?.tasks ?? []} onComplete={(task) => completeTask.mutate(task.id)} />}
        {tab === 'signals' && <SignalsPanel notifications={data?.notifications ?? []} usage={data?.usage} loading={loading} onRead={(notification) => notificationsMutation.mutate({ id: notification.id })} onReadAll={() => notificationsMutation.mutate({ all: true })} />}
        {tab === 'memory' && <MemoryVault memories={data?.memories ?? []} loading={loading} saving={memoryMutation.isPending} onSave={(memory) => memoryMutation.mutate(memory)} onDelete={(memory) => memoryDelete.mutate(memory.id)} onClearCategory={(category) => clearCategory.mutate(category)} />}
        {tab === 'audit' && (
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><ScrollText className="h-4 w-4 text-cyan-300" />Audit trail</h2>
            <p className="mt-1 text-[11px] text-zinc-500">Every sensitive action is recorded server-side.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[11px]"><thead className="text-[10px] uppercase tracking-wider text-zinc-600"><tr><th className="pb-2 pr-3 font-medium">Action</th><th className="pb-2 pr-3 font-medium">Target</th><th className="pb-2 pr-3 font-medium">Status</th><th className="pb-2 font-medium">When</th></tr></thead><tbody>{(data?.audit ?? []).map((entry) => <tr key={entry.id} className="border-t border-white/5 text-zinc-400"><td className="py-2 pr-3 text-zinc-200">{entry.action}</td><td className="py-2 pr-3">{entry.target_type}{entry.target_id ? ` · ${String(entry.target_id).slice(0, 8)}` : ''}</td><td className="py-2 pr-3">{entry.status}</td><td className="py-2">{new Date(entry.created_at).toLocaleString('en-GB')}</td></tr>)}</tbody></table>
            </div>
          </div>
        )}
      </div>

      <AgentBuilder open={builder.open} initial={builder.initial} saving={agentMutation.isPending} onClose={() => setBuilder({ open: false, initial: null })} onSave={(value) => agentMutation.mutate(value)} />
    </>
  );
}
