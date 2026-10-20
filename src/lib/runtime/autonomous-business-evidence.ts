/**
 * Read-only evidence projection for an existing autonomous workflow run.
 * These are persisted execution records, NOT independent provider certification
 * and NEVER evidence of settled revenue or withdrawable profit.
 */
export type BusinessFleetAssignment = {
  assignment_id: string;
  title: string;
  agent_id: string | null;
  status: string;
  requires_approval?: boolean | null;
};
export type BusinessWorkflowStep = {
  id: string;
  config?: { orchestrator_assignment_id?: string } | null;
};
export type BusinessStepRun = {
  step_id: string;
  task_id: string | null;
  status: string;
};
export type BusinessToolExecution = {
  agent_task_id: string | null;
  tool: string;
  status: string;
};
export type BusinessApprovalRecord = {
  task_id: string | null;
  status: string;
  execution_status?: string | null;
};

export function projectBusinessRunEvidence(input: {
  runStatus: string;
  assignments: BusinessFleetAssignment[];
  workflowSteps: BusinessWorkflowStep[];
  stepRuns: BusinessStepRun[];
  tools: BusinessToolExecution[];
  approvals: BusinessApprovalRecord[];
  truncated?: boolean;
}) {
  const stepForAssignment = new Map(input.workflowSteps.map((step) => [
    String(step.config?.orchestrator_assignment_id ?? ''), step.id,
  ]));
  const rows = input.assignments.map((assignment) => {
    const stepId = stepForAssignment.get(assignment.assignment_id);
    const matchingSteps = stepId ? input.stepRuns.filter((step) => step.step_id === stepId) : [];
    const taskIds = new Set(matchingSteps.map((step) => step.task_id).filter((id): id is string => Boolean(id)));
    const recordedTools = input.tools.filter((tool) => tool.agent_task_id !== null && taskIds.has(tool.agent_task_id));
    const recordedApprovals = input.approvals.filter((approval) => approval.task_id !== null && taskIds.has(approval.task_id));
    return {
      assignmentId: assignment.assignment_id,
      title: assignment.title,
      agentId: assignment.agent_id,
      status: assignment.status,
      requiresApproval: assignment.requires_approval === true,
      stepRecords: matchingSteps.length,
      taskRecords: taskIds.size,
      toolRecords: recordedTools.length,
      toolsSucceeded: recordedTools.filter((tool) => tool.status === 'succeeded').length,
      toolsFailed: recordedTools.filter((tool) => tool.status === 'failed').length,
      toolNames: [...new Set(recordedTools.map((tool) => tool.tool))].slice(0, 15),
      approvalRecords: recordedApprovals.length,
      approvalExecutionReceipts: recordedApprovals.filter((approval) => approval.execution_status === 'succeeded').length,
    };
  });
  return {
    runStatus: input.runStatus,
    assignments: rows,
    plannedAssignments: rows.length,
    distinctAgentsAssigned: new Set(rows.map((row) => row.agentId).filter(Boolean)).size,
    completedAssignments: rows.filter((row) => row.status === 'completed').length,
    recordedToolCalls: rows.reduce((sum, row) => sum + row.toolRecords, 0),
    succeededToolRecords: rows.reduce((sum, row) => sum + row.toolsSucceeded, 0),
    failedToolRecords: rows.reduce((sum, row) => sum + row.toolsFailed, 0),
    approvalRecords: rows.reduce((sum, row) => sum + row.approvalRecords, 0),
    truncated: input.truncated === true,
    financialOutcome: 'unverified' as const,
    evidenceLevel: 'internal_execution_records_only' as const,
  };
}
