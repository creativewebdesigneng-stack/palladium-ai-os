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
  attempt?: number | null;
  started_at?: string | null;
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
export type BusinessWorkflowGateApproval = {
  status: string;
};

export function projectBusinessRunEvidence(input: {
  runStatus: string;
  assignments: BusinessFleetAssignment[];
  workflowSteps: BusinessWorkflowStep[];
  stepRuns: BusinessStepRun[];
  tools: BusinessToolExecution[];
  approvals: BusinessApprovalRecord[];
  workflowGateApprovals?: BusinessWorkflowGateApproval[];
  truncated?: boolean;
}) {
  const stepForAssignment = new Map(input.workflowSteps.map((step) => [
    String(step.config?.orchestrator_assignment_id ?? ''), step.id,
  ]));
  const rows = input.assignments.map((assignment) => {
    const stepId = stepForAssignment.get(assignment.assignment_id);
    const matchingSteps = stepId ? input.stepRuns.filter((step) => step.step_id === stepId) : [];
    // The workflow executor writes one row per attempt. A failed first attempt
    // must not override a successful retry, and a later failure must not be
    // hidden by an earlier success. started_at is preferred because recovered
    // workers may restart attempt numbering. If absent, use attempt ordering.
    const sorted = [...matchingSteps].sort((a, b) => {
      const aTime = a.started_at ? Date.parse(a.started_at) : NaN;
      const bTime = b.started_at ? Date.parse(b.started_at) : NaN;
      if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return aTime - bTime;
      const attemptDiff = (a.attempt ?? 0) - (b.attempt ?? 0);
      if (attemptDiff) return attemptDiff;
      // Ambiguous order is not positive evidence of successful completion.
      const priority = (status: string) => status === 'succeeded' || status === 'completed' ? 0 : 1;
      return priority(a.status) - priority(b.status);
    });
    const latest = sorted.at(-1);
    const evidenceStatus =
      latest?.status === 'failed' ? 'failed'
      : latest?.status === 'cancelled' ? 'cancelled'
      : latest?.status === 'succeeded' || latest?.status === 'completed'
        ? (latest.task_id ? 'completed' : 'unverified_completion')
      : latest?.status === 'running' || latest?.status === 'waiting_for_tool' ? 'running'
      : latest?.status === 'skipped' ? 'skipped'
      : latest?.status === 'waiting_for_approval' ? 'waiting_for_approval'
      : latest?.status === 'pending' || latest?.status === 'queued' ? 'queued'
      : assignment.status === 'completed' ? 'unverified_completion' : assignment.status;
    const taskIds = new Set(matchingSteps.map((step) => step.task_id).filter((id): id is string => Boolean(id)));
    const recordedTools = input.tools.filter((tool) => tool.agent_task_id !== null && taskIds.has(tool.agent_task_id));
    const recordedApprovals = input.approvals.filter((approval) => approval.task_id !== null && taskIds.has(approval.task_id));
    const latestToolReceipts = latest?.task_id
      ? recordedTools.filter((tool) => tool.agent_task_id === latest.task_id) : [];
    return {
      assignmentId: assignment.assignment_id,
      title: assignment.title,
      agentId: assignment.agent_id,
      status: evidenceStatus,
      recordedFleetStatus: assignment.status,
      stepCompletionVerified: evidenceStatus === 'completed',
      requiresApproval: assignment.requires_approval === true,
      stepRecords: matchingSteps.length,
      taskRecords: taskIds.size,
      latestAttempt: latest?.attempt ?? null,
      latestTaskId: latest?.task_id ?? null,
      latestToolSuccesses: latestToolReceipts.filter((tool) => tool.status === 'succeeded').length,
      toolRecords: recordedTools.length,
      toolsSucceeded: recordedTools.filter((tool) => tool.status === 'succeeded').length,
      toolsFailed: recordedTools.filter((tool) => tool.status === 'failed').length,
      toolNames: [...new Set(recordedTools.map((tool) => tool.tool))].slice(0, 15),
      approvalRecords: recordedApprovals.length,
      approvalExecutionReceipts: recordedApprovals.filter((approval) => approval.execution_status === 'succeeded').length,
    };
  });
  // This is an INTERNAL receipt completeness checklist, not an external
  // provider test, income verification or permission to publish/charge money.
  // Deliberately fail closed on truncated or contradictory records.
  const gateStatus = input.workflowGateApprovals?.[0]?.status ?? 'not_recorded';
  const acceptanceChecks = [
    { id: 'run', label: 'Overall workflow completed', passed: input.runStatus === 'completed' },
    { id: 'gate', label: 'Owner start approval recorded', passed: gateStatus === 'approved' },
    { id: 'roster', label: 'Six distinct staffed roles recorded', passed: rows.length === 6 &&
        new Set(rows.map((row) => row.agentId).filter(Boolean)).size === 6 &&
        new Set(rows.map((row) => row.assignmentId)).size === 6 },
    { id: 'steps', label: 'Six agent tasks succeeded with individual step receipts',
      passed: rows.length === 6 && rows.every((row) => row.stepCompletionVerified && Boolean(row.latestTaskId)) },
    { id: 'tools', label: 'A successful tool receipt belongs to each final agent attempt',
      passed: rows.length === 6 && rows.every((row) => row.latestToolSuccesses > 0) },
    { id: 'audit', label: 'Receipt queries were not truncated and do not contradict completion',
      passed: input.truncated !== true &&
        rows.every((row) => row.recordedFleetStatus !== 'completed' || row.stepCompletionVerified) },
  ];
  const internalAcceptance = {
    status: acceptanceChecks.every((check) => check.passed) ? 'receipts_complete' as const : 'incomplete' as const,
    checks: acceptanceChecks,
    completedChecks: acceptanceChecks.filter((check) => check.passed).length,
    totalChecks: acceptanceChecks.length,
    liveProviderCertified: false as const,
    externalOutcomesCertified: false as const,
  };
  return {
    runStatus: input.runStatus,
    internalAcceptance,
    assignments: rows,
    plannedAssignments: rows.length,
    distinctAgentsAssigned: new Set(rows.map((row) => row.agentId).filter(Boolean)).size,
    completedAssignments: rows.filter((row) => row.stepCompletionVerified).length,
    unverifiedCompletionClaims: rows.filter((row) => row.recordedFleetStatus === 'completed' && !row.stepCompletionVerified).length,
    recordedToolCalls: rows.reduce((sum, row) => sum + row.toolRecords, 0),
    succeededToolRecords: rows.reduce((sum, row) => sum + row.toolsSucceeded, 0),
    failedToolRecords: rows.reduce((sum, row) => sum + row.toolsFailed, 0),
    approvalRecords: rows.reduce((sum, row) => sum + row.approvalRecords, 0),
    workflowGateRecords: input.workflowGateApprovals?.length ?? 0,
    workflowGateStatus: input.workflowGateApprovals?.[0]?.status ?? 'not_recorded',
    truncated: input.truncated === true,
    financialOutcome: 'unverified' as const,
    evidenceLevel: 'internal_execution_records_only' as const,
  };
}
