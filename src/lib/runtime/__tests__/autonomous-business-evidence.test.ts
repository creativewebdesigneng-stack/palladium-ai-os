import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { projectBusinessRunEvidence } from '../autonomous-business-evidence';

const source = readFileSync(new URL('../autonomous-business-evidence.functions.ts', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../../../components/workforce/BusinessRunEvidencePanel.jsx', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../../../screens/AutonomousOS.jsx', import.meta.url), 'utf8');

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
    expect(decided.liveExecutionCertified).toBeUndefined();
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
    expect(panel).toContain('Owner start gate: {data.workflowGateStatus}');
    expect(panel).toContain('Financial outcome: unverified.');
    expect(screen).toContain('<BusinessRunEvidencePanel goals={data.goals ?? []} session={session} />');
  });
});
