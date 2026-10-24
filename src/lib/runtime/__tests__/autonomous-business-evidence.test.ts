import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { projectBusinessRunEvidence } from '../autonomous-business-evidence';

const source = readFileSync(new URL('../autonomous-business-evidence.functions.ts', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../../../components/workforce/BusinessRunEvidencePanel.jsx', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../../../screens/AutonomousOS.jsx', import.meta.url), 'utf8');
const scheduler = readFileSync(new URL('../autonomous-os.scheduler.server.ts', import.meta.url), 'utf8');
const fleetReconciliationSql = readFileSync(new URL('../../../../supabase/migrations/20260919174000_reconcile_autonomous_safety_activity.sql', import.meta.url), 'utf8');

const empty = {
  runStatus: 'not_started',
  assignments: [],
  workflowSteps: [],
  stepRuns: [],
  tools: [],
  approvals: [],
};

describe('six-agent workflow execution evidence', () => {
  it('does not manufacture results for a not-started goal', () => {
    expect(projectBusinessRunEvidence(empty)).toMatchObject({
      plannedAssignments: 0,
      distinctAgentsAssigned: 0,
      completedAssignments: 0,
      recordedToolCalls: 0,
      approvalRecords: 0,
      financialOutcome: 'unverified',
      evidenceLevel: 'internal_execution_records_only',
    });
  });

  it('separates planned roles, distinct agent IDs, successful and failed tool records', () => {
    const result = projectBusinessRunEvidence({
      runStatus: 'running',
      assignments: [
        { assignment_id: 'research', title: 'Research', agent_id: 'agent-1', status: 'completed' },
        { assignment_id: 'marketing', title: 'Marketing', agent_id: 'agent-1', status: 'running', requires_approval: true },
        { assignment_id: 'finance', title: 'Financial audit', agent_id: 'agent-2', status: 'queued' },
      ],
      workflowSteps: [
        { id: 'step-1', config: { orchestrator_assignment_id: 'research' } },
        { id: 'step-2', config: { orchestrator_assignment_id: 'marketing' } },
      ],
      stepRuns: [
        { step_id: 'step-1', task_id: 'task-1', status: 'succeeded' },
        { step_id: 'step-2', task_id: 'task-2', status: 'failed' },
      ],
      tools: [
        { agent_task_id: 'task-1', tool: 'web_fetch', status: 'succeeded' },
        { agent_task_id: 'task-2', tool: 'browser_task', status: 'failed' },
        { agent_task_id: 'other-task', tool: 'bank_transfer', status: 'succeeded' },
      ],
      approvals: [
        { task_id: 'task-2', status: 'pending', execution_status: null },
        { task_id: 'other-task', status: 'approved', execution_status: 'succeeded' },
      ],
    });
    expect(result).toMatchObject({
      plannedAssignments: 3,
      distinctAgentsAssigned: 2,
      completedAssignments: 1,
      recordedToolCalls: 2,
      succeededToolRecords: 1,
      failedToolRecords: 1,
      approvalRecords: 1,
      financialOutcome: 'unverified',
    });
    expect(result.assignments[0]).toMatchObject({
      toolRecords: 1, toolsSucceeded: 1, toolNames: ['web_fetch'],
    });
    expect(result.assignments[1]).toMatchObject({
      toolRecords: 1, toolsFailed: 1, approvalRecords: 1, approvalExecutionReceipts: 0,
    });
    expect(result.assignments[2]).toMatchObject({
      toolRecords: 0, taskRecords: 0, status: 'queued',
    });
    expect(JSON.stringify(result)).not.toContain('bank_transfer');
  });

  it('reports the distinct owner workflow-start gate without treating it as a tool execution', () => {
    const pending = projectBusinessRunEvidence({
      ...empty,
      runStatus: 'waiting_for_approval',
      workflowGateApprovals: [{ status: 'pending' }],
    });
    expect(pending.workflowGateRecords).toBe(1);
    expect(pending.workflowGateStatus).toBe('pending');
    expect(pending.approvalRecords).toBe(0);
    expect(pending.recordedToolCalls).toBe(0);
    expect(pending.financialOutcome).toBe('unverified');

    const decided = projectBusinessRunEvidence({
      ...empty,
      runStatus: 'queued',
      workflowGateApprovals: [{ status: 'approved' }],
    });
    expect(decided.workflowGateStatus).toBe('approved');
    expect(decided.financialOutcome).toBe('unverified');
  });

  it('never upgrades a recorded tool success to a financial or provider certification', () => {
    const result = projectBusinessRunEvidence({
      ...empty,
      runStatus: 'completed',
      assignments: [{ assignment_id: 'audit', title: 'Audit', agent_id: 'one', status: 'completed' }],
      workflowSteps: [{ id: 'step-a', config: { orchestrator_assignment_id: 'audit' } }],
      stepRuns: [{ step_id: 'step-a', task_id: 'task-a', status: 'succeeded' }],
      tools: [{ agent_task_id: 'task-a', tool: 'data_analysis', status: 'succeeded' }],
      truncated: true,
    });
    expect(result.succeededToolRecords).toBe(1);
    expect(result.financialOutcome).toBe('unverified');
    expect(result.evidenceLevel).toBe('internal_execution_records_only');
    expect(result.truncated).toBe(true);
  });

  it('never counts blanket completed fleet statuses without individual successful step receipts', () => {
    const result = projectBusinessRunEvidence({
      ...empty,
      runStatus: 'completed',
      assignments: [
        { assignment_id: 'research', title: 'Research', agent_id: 'a', status: 'completed' },
        { assignment_id: 'validation', title: 'Validation', agent_id: 'b', status: 'completed' },
        { assignment_id: 'delivery', title: 'Delivery', agent_id: 'c', status: 'completed' },
      ],
      workflowSteps: [
        { id: 's1', config: { orchestrator_assignment_id: 'research' } },
        { id: 's2', config: { orchestrator_assignment_id: 'validation' } },
      ],
      stepRuns: [
        { step_id: 's1', task_id: 't1', status: 'succeeded' },
        { step_id: 's2', task_id: 't2', status: 'failed' },
      ],
    });
    expect(result.completedAssignments).toBe(1);
    expect(result.unverifiedCompletionClaims).toBe(2);
    expect(result.assignments.map((item) => item.status)).toEqual([
      'completed', 'failed', 'unverified_completion',
    ]);
    expect(result.financialOutcome).toBe('unverified');
  });

  it('does not treat an approval pause or a pending specialist as a successful task', () => {
    const result = projectBusinessRunEvidence({
      ...empty,
      runStatus: 'waiting_for_approval',
      assignments: [{ assignment_id: 'research', title: 'Research', agent_id: 'a', status: 'completed' }],
      workflowSteps: [{ id: 's1', config: { orchestrator_assignment_id: 'research' } }],
      stepRuns: [{ step_id: 's1', task_id: null, status: 'pending' }],
      workflowGateApprovals: [{ status: 'pending' }],
    });
    expect(result.completedAssignments).toBe(0);
    expect(result.assignments[0]?.status).toBe('queued');
    expect(result.unverifiedCompletionClaims).toBe(1);
    expect(result.workflowGateStatus).toBe('pending');
  });

  it('uses the existing per-workflow-step DB trigger rather than overwriting all agent statuses', () => {
    const reconciliation = scheduler.split('export async function reconcileAutonomousGoalRuns')[1]!.split('export async function processDueAutonomousGoals')[0]!;
    expect(reconciliation).not.toContain('.from("autonomous_goal_fleet_assignments")');
    expect(fleetReconciliationSql).toContain('function public.sync_autonomous_fleet_step_state()');
    expect(fleetReconciliationSql).toContain('after insert or update of status on public.workflow_step_runs');
    expect(panel).toContain('step-verified completions');
    expect(panel).toContain('unverified completion claims');
  });

  it('uses the latest recorded agent attempt rather than an earlier failed retry', () => {
    const result = projectBusinessRunEvidence({
      ...empty,
      runStatus: 'running',
      assignments: [{ assignment_id: 'research', title: 'Research', agent_id: 'one', status: 'completed' }],
      workflowSteps: [{ id: 's1', config: { orchestrator_assignment_id: 'research' } }],
      stepRuns: [
        { step_id: 's1', task_id: 'failed-task', status: 'failed', attempt: 1, started_at: '2026-10-20T10:00:00Z' },
        { step_id: 's1', task_id: 'successful-task', status: 'succeeded', attempt: 2, started_at: '2026-10-20T10:01:00Z' },
      ],
      tools: [
        { agent_task_id: 'failed-task', tool: 'web_search', status: 'failed' },
        { agent_task_id: 'successful-task', tool: 'web_search', status: 'succeeded' },
      ],
    });
    expect(result.completedAssignments).toBe(1);
    expect(result.assignments[0]).toMatchObject({
      status: 'completed', latestAttempt: 2, latestTaskId: 'successful-task',
      latestToolSuccesses: 1, stepRecords: 2, toolsFailed: 1,
    });
    expect(result.internalAcceptance.status).toBe('incomplete');
  });

  it('does not hide a later failed or ongoing attempt behind a previous success', () => {
    const inputs = {
      ...empty,
      runStatus: 'completed',
      assignments: [{ assignment_id: 'audit', title: 'Audit', agent_id: 'one', status: 'completed' }],
      workflowSteps: [{ id: 's1', config: { orchestrator_assignment_id: 'audit' } }],
      stepRuns: [
        { step_id: 's1', task_id: 'old', status: 'succeeded', attempt: 1, started_at: '2026-10-20T10:00:00Z' },
        { step_id: 's1', task_id: 'new', status: 'failed', attempt: 2, started_at: '2026-10-20T10:01:00Z' },
      ],
    };
    const failed = projectBusinessRunEvidence(inputs);
    expect(failed.completedAssignments).toBe(0);
    expect(failed.assignments[0]?.status).toBe('failed');
    const pending = projectBusinessRunEvidence({
      ...inputs,
      stepRuns: [...inputs.stepRuns.slice(0, 1), {
        step_id: 's1', task_id: 'new', status: 'running', attempt: 2,
        started_at: '2026-10-20T10:01:00Z',
      }],
    });
    expect(pending.completedAssignments).toBe(0);
    expect(pending.assignments[0]?.status).toBe('running');
  });

  it('requires a task receipt even when a step reports successful completion', () => {
    const result = projectBusinessRunEvidence({
      ...empty, runStatus: 'completed',
      assignments: [{ assignment_id: 'research', title: 'Research', agent_id: 'a', status: 'completed' }],
      workflowSteps: [{ id: 'step', config: { orchestrator_assignment_id: 'research' } }],
      stepRuns: [{ step_id: 'step', task_id: null, status: 'succeeded' }],
    });
    expect(result.completedAssignments).toBe(0);
    expect(result.assignments[0]?.status).toBe('unverified_completion');
  });

  it('checks six distinct internally evidenced tasks, tools and owner approval without certifying providers', () => {
    const roles = ['research', 'validation', 'production', 'marketing', 'operations', 'audit'];
    const fixture = {
      ...empty,
      runStatus: 'completed',
      assignments: roles.map((role, i) => ({
        assignment_id: role, title: role, agent_id: `agent-${i}`, status: 'completed',
      })),
      workflowSteps: roles.map((role, i) => ({
        id: `step-${i}`, config: { orchestrator_assignment_id: role },
      })),
      stepRuns: roles.map((_role, i) => ({
        step_id: `step-${i}`, task_id: `task-${i}`, status: 'succeeded', attempt: 1,
      })),
      tools: roles.map((_role, i) => ({
        agent_task_id: `task-${i}`, tool: 'web_search', status: 'succeeded',
      })),
      workflowGateApprovals: [{ status: 'approved' }],
    };
    const complete = projectBusinessRunEvidence(fixture);
    expect(complete.internalAcceptance).toMatchObject({
      status: 'receipts_complete', completedChecks: 6, totalChecks: 6,
      liveProviderCertified: false, externalOutcomesCertified: false,
    });
    expect(complete.financialOutcome).toBe('unverified');
    const noApproval = projectBusinessRunEvidence({
      ...fixture, workflowGateApprovals: [{ status: 'denied' }],
    });
    expect(noApproval.internalAcceptance.status).toBe('incomplete');
    const wrongTool = projectBusinessRunEvidence({
      ...fixture,
      tools: [...fixture.tools.slice(0, 5), { agent_task_id: 'unrelated', tool: 'web_search', status: 'succeeded' }],
    });
    expect(wrongTool.internalAcceptance.checks.find((check) => check.id === 'tools')?.passed).toBe(false);
    const truncated = projectBusinessRunEvidence({ ...fixture, truncated: true });
    expect(truncated.internalAcceptance.status).toBe('incomplete');
  });

  it('keeps all DB lookups within the authenticated owner and never selects tool payloads', () => {
    expect(source).toContain('.middleware([requireSupabaseAuth])');
    expect(source).toContain(".eq('id', data.goalId).eq('user_id', owner)");
    expect(source).toContain(".eq('id', run.workflow_run_id).eq('user_id', owner)");
    expect(source).toContain(".eq('run_id', workflowRun.id).eq('user_id', owner)");
    expect(source).toContain(".eq('user_id', owner).in('agent_task_id', taskIds)");
    expect(source).toContain(".eq('user_id', owner).in('task_id', taskIds)");
    expect(source).toContain(".select('agent_task_id,tool,status')");
    expect(source).not.toContain(".select('input,output')");
    expect(source).toContain(".eq('action_type', 'workflow_step')");
    expect(source).toContain(".contains('details', { workflow_run_id: workflowRun.id })");
    expect(source).toContain(".select('status')");
    expect(source).toContain(".select('step_id,task_id,status,attempt,started_at')");
    expect(panel).toContain('Live-mission internal receipt checklist');
    expect(panel).toContain('data.internalAcceptance.checks.map');
    expect(panel).toContain('Owner start gate: {data.workflowGateStatus}');
    expect(panel).toContain('Financial outcome: unverified.');
    expect(screen).toContain('<BusinessRunEvidencePanel goals={data.goals ?? []} session={session} />');
  });
});
