import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { Gauge, User, ShieldAlert, ShoppingBag, Brain, ListChecks, ScrollText, Bell, Briefcase, Network } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import { toast } from '@/components/ui/use-toast';
import BlackstarCommandDeck from '@/components/mission/BlackstarCommandDeck';
import CommandTheatre from '@/components/mission/CommandTheatre';
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
