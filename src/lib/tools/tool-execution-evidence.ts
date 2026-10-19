/**
 * Conservative runtime-evidence summary for the existing Tool Framework.
 * Only an approved, non-simulated Playwright receipt + matching successful
 * tool execution can be called browser-verified. A catalogue row, approval
 * queue, or model message alone is never proof of execution.
 */
type ToolRow = { slug: string; is_active?: boolean; executable?: boolean };
type ExecutionRow = {
  tool: string; status: string; agent_task_id?: string | null;
  created_at?: string; error?: string | null; output?: unknown;
};
type ApprovalRow = {
  action_type?: string; status?: string; execution_status?: string;
  execution_result?: unknown;
};
export type ToolEvidenceState =
  'browser_verified' | 'execution_recorded' | 'approval_activity' |
  'failed_only' | 'simulated_only' | 'not_tested' | 'not_executable';

const approvalOnly = new Set([
  'request_approval', 'prepare_purchase', 'email_draft', 'email_send',
  'slack_post', 'calendar', 'connected_service_write', 'github_write',
  'integration_action', 'nango_action',
]);

// A persisted 'succeeded' status is not proof that a tool performed a real
// operation if the original output explicitly identifies a simulation.
function simulatedExecution(row: ExecutionRow) {
  const output = row.output;
  if (!output || typeof output !== 'object' || Array.isArray(output)) return false;
  const record = output as Record<string, unknown>;
  if (record['simulated'] === true) return true;
  const result = record['result'];
  return Boolean(result && typeof result === 'object' && !Array.isArray(result) &&
    (result as Record<string, unknown>)['simulated'] === true);
}

function verifiedBrowserTaskIds(approvals: ApprovalRow[]) {
  const ids = new Set<string>();
  for (const approval of approvals) {
    if (approval.action_type !== 'agent_browser_task' ||
        approval.status !== 'approved' || approval.execution_status !== 'succeeded') continue;
    const result = approval.execution_result;
    if (!result || typeof result !== 'object' || Array.isArray(result)) continue;
    const receipt = result as Record<string, unknown>;
    if (receipt['provider'] !== 'playwright' || receipt['simulated'] !== false ||
        receipt['task_status'] !== 'succeeded' || typeof receipt['agent_task_id'] !== 'string') continue;
    ids.add(receipt['agent_task_id']);
  }
  return ids;
}

export function toolExecutionEvidence(
  tools: ToolRow[],
  executions: ExecutionRow[],
  approvals: ApprovalRow[],
) {
  const browserTaskIds = verifiedBrowserTaskIds(approvals);
  return tools.map(tool => {
    const attempts = executions.filter(row => row.tool === tool.slug);
    const successes = attempts.filter(row => row.status === 'succeeded' && !simulatedExecution(row));
    const simulated = attempts.filter(row => row.status === 'succeeded' && simulatedExecution(row));
    const failures = attempts.filter(row => row.status === 'failed');
    let state: ToolEvidenceState = 'not_tested';
    if (tool.is_active === false || tool.executable === false) {
      state = 'not_executable';
    } else if (
      tool.slug === 'browser_task' &&
      successes.some(row => row.agent_task_id && browserTaskIds.has(row.agent_task_id))
    ) {
      state = 'browser_verified';
    } else if (successes.length) {
      state = approvalOnly.has(tool.slug) || tool.slug === 'browser_task'
        ? 'approval_activity' : 'execution_recorded';
    } else if (simulated.length) {
      state = 'simulated_only';
    } else if (failures.length) {
      state = 'failed_only';
    }
    return {
      slug: tool.slug, state, observedAttempts: attempts.length,
      recordedSuccesses: successes.length, recordedFailures: failures.length,
      simulatedExecutions: simulated.length,
      lastAttemptAt: attempts[0]?.created_at ?? null,
    };
  });
}
