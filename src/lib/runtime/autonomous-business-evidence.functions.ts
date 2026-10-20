import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { SIX_AGENT_BUSINESS_BLUEPRINT } from './business-operations-blueprint';
import {
  projectBusinessRunEvidence,
  type BusinessFleetAssignment,
  type BusinessWorkflowStep,
  type BusinessStepRun,
  type BusinessToolExecution,
  type BusinessApprovalRecord,
  type BusinessWorkflowGateApproval,
} from './autonomous-business-evidence';

type Sb = { from: (table: string) => any };
const MAX_STEP_RUNS = 120;
const MAX_TOOL_RECORDS = 300;
const MAX_APPROVAL_RECORDS = 200;

export const getAutonomousBusinessRunEvidence = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ goalId: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const owner = context.userId;
    const { data: goal, error: goalError } = await sb.from('autonomous_goals')
      .select('id,name,success_criteria')
      .eq('id', data.goalId).eq('user_id', owner).maybeSingle();
    if (goalError) throw new Error(goalError.message);
    if (!goal) throw new Error('Autonomous goal not found.');
    if (goal.success_criteria?.blueprint_id !== SIX_AGENT_BUSINESS_BLUEPRINT.id)
      throw new Error('This goal does not use the six-agent business blueprint.');

    const { data: run, error: runError } = await sb.from('autonomous_goal_runs')
      .select('id,status,workflow_run_id,created_at')
      .eq('user_id', owner).eq('goal_id', goal.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (runError) throw new Error(runError.message);
    if (!run) return { goalId: goal.id, runId: null, ...projectBusinessRunEvidence({
      runStatus: 'not_started', assignments: [], workflowSteps: [], stepRuns: [], tools: [], approvals: [],
    }) };

    const { data: fleet, error: fleetError } = await sb.from('autonomous_goal_fleet_assignments')
      .select('assignment_id,title,agent_id,status,requires_approval')
      .eq('user_id', owner).eq('run_id', run.id).limit(12);
    if (fleetError) throw new Error(fleetError.message);

    let workflowSteps: BusinessWorkflowStep[] = [];
    let stepRuns: BusinessStepRun[] = [];
    let tools: BusinessToolExecution[] = [];
    let approvals: BusinessApprovalRecord[] = [];
    let workflowGateApprovals: BusinessWorkflowGateApproval[] = [];
    let truncated = false;

    if (run.workflow_run_id) {
      // Check the persisted workflow run's owner before following its workflow FK.
      const { data: workflowRun, error: workflowError } = await sb.from('workflow_runs')
        .select('id,workflow_id')
        .eq('id', run.workflow_run_id).eq('user_id', owner).maybeSingle();
      if (workflowError) throw new Error(workflowError.message);
      if (!workflowRun) throw new Error('The workflow run cannot be verified for this owner.');

      // The workflow-start gate has task_id=null and is not among agent tool
      // approvals. Its owned workflow_run_id lives in the existing JSONB
      // approval details, so query it separately without raw payloads.
      const gateResult = await sb.from('approval_requests')
        .select('status')
        .eq('user_id', owner)
        .eq('action_type', 'workflow_step')
        .contains('details', { workflow_run_id: workflowRun.id })
        .order('created_at', { ascending: false })
        .limit(20);
      if (gateResult.error) throw new Error(gateResult.error.message);
      workflowGateApprovals = (gateResult.data ?? []) as BusinessWorkflowGateApproval[];
      truncated ||= workflowGateApprovals.length >= 20;

      const [stepsResult, stepRunsResult] = await Promise.all([
        sb.from('workflow_steps').select('id,config')
          .eq('workflow_id', workflowRun.workflow_id).limit(50),
        sb.from('workflow_step_runs').select('step_id,task_id,status')
          .eq('run_id', workflowRun.id).eq('user_id', owner).limit(MAX_STEP_RUNS),
      ]);
      if (stepsResult.error) throw new Error(stepsResult.error.message);
      if (stepRunsResult.error) throw new Error(stepRunsResult.error.message);
      workflowSteps = (stepsResult.data ?? []) as BusinessWorkflowStep[];
      stepRuns = (stepRunsResult.data ?? []) as BusinessStepRun[];
      truncated ||= stepRuns.length >= MAX_STEP_RUNS;

      const taskIds = [...new Set(stepRuns
        .map((step) => step.task_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0))];
      if (taskIds.length) {
        // Never return model prompts, connector tokens, tool inputs or raw provider outputs.
        const [toolsResult, approvalsResult] = await Promise.all([
          sb.from('tool_executions').select('agent_task_id,tool,status')
            .eq('user_id', owner).in('agent_task_id', taskIds).limit(MAX_TOOL_RECORDS),
          sb.from('approval_requests').select('task_id,status,execution_status')
            .eq('user_id', owner).in('task_id', taskIds).limit(MAX_APPROVAL_RECORDS),
        ]);
        if (toolsResult.error) throw new Error(toolsResult.error.message);
        if (approvalsResult.error) throw new Error(approvalsResult.error.message);
        tools = (toolsResult.data ?? []) as BusinessToolExecution[];
        approvals = (approvalsResult.data ?? []) as BusinessApprovalRecord[];
        truncated ||= tools.length >= MAX_TOOL_RECORDS || approvals.length >= MAX_APPROVAL_RECORDS;
      }
    }

    return {
      goalId: goal.id,
      runId: run.id,
      ...projectBusinessRunEvidence({
        runStatus: String(run.status),
        assignments: (fleet ?? []) as BusinessFleetAssignment[],
        workflowSteps,
        stepRuns,
        tools,
        approvals,
        workflowGateApprovals,
        truncated,
      }),
    };
  });
