/**
 * Owner-scoped certification evidence for the existing Tools Framework.
 * A success status alone is NOT provider verification. Only a matched,
 * approved, completed non-simulated execution plus an original receipt
 * qualifies browser and the three bounded local tools for verified status.
 */
type ToolRow = { slug: string; is_active?: boolean; executable?: boolean };
type ExecutionRow = {
  tool: string; status: string; agent_task_id?: string | null; agent_id?: string | null;
  created_at?: string; error?: string | null; output?: unknown;
};
type ApprovalRow = {
  action_type?: string; status?: string; execution_status?: string;
  agent_id?: string | null; details?: unknown; execution_result?: unknown;
};
export type ToolEvidenceState =
  'browser_verified' | 'local_verified' | 'execution_recorded' | 'approval_activity' |
  'failed_only' | 'simulated_only' | 'not_tested' | 'not_executable';

const localTools = new Set(['calculator', 'current_time', 'data_analysis']);
const approvalOnly = new Set([
  'request_approval', 'prepare_purchase', 'email_draft', 'email_send',
  'slack_post', 'calendar', 'connected_service_write', 'github_write',
  'integration_action', 'nango_action',
]);
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

// A persisted success is not evidence of real operation when its original
// output explicitly identifies a simulation, including nested tool results.
function simulatedExecution(row: ExecutionRow) {
  const output = record(row.output);
  return output?.['simulated'] === true || record(output?.['result'])?.['simulated'] === true;
}

function receiptKeys(approvals: ApprovalRow[], kind: 'browser' | 'local') {
  const keys = new Set<string>();
  for (const approval of approvals) {
    const browser = kind === 'browser';
    if (approval.action_type !== (browser ? 'agent_browser_task' : 'agent_tool_task') ||
        approval.status !== 'approved' || approval.execution_status !== 'succeeded' ||
        typeof approval.agent_id !== 'string' || !approval.agent_id) continue;
    const details = record(approval.details);
    const result = record(approval.execution_result);
    if (!details || !result || typeof details['agent_task_id'] !== 'string' ||
        !details['agent_task_id'] || result['agent_task_id'] !== details['agent_task_id'] ||
        result['simulated'] !== false || result['task_status'] !== 'succeeded' ||
        result['provider'] !== (browser ? 'playwright' : 'local')) continue;
    const tool = browser ? 'browser_task' : details['tool'];
    if (typeof tool !== 'string' || (!browser && !localTools.has(tool))) continue;
    if (!browser) {
      const evidence = record(result['tool_evidence']);
      // The local-task path retains bounded original output on the receipt.
      // Empty, partial, fabricated-length or missing evidence is not verified.
      if (!evidence || evidence['format'] !== 'json' || evidence['truncated'] !== false ||
          !Number.isInteger(evidence['characters']) ||
          typeof evidence['characters'] !== 'number' || evidence['characters'] <= 0 ||
          evidence['characters'] > 16_000 || typeof evidence['content'] !== 'string' ||
          evidence['content'].length !== evidence['characters']) continue;
    }
    keys.add(`${approval.agent_id}:${details['agent_task_id']}:${tool}`);
  }
  return keys;
}

export function toolExecutionEvidence(
  tools: ToolRow[],
  executions: ExecutionRow[],
  approvals: ApprovalRow[],
) {
  const browserReceipts = receiptKeys(approvals, 'browser');
  const localReceipts = receiptKeys(approvals, 'local');
  return tools.map(tool => {
    const attempts = executions.filter(row => row.tool === tool.slug);
    const successes = attempts.filter(row => row.status === 'succeeded' && !simulatedExecution(row));
    const simulated = attempts.filter(row => row.status === 'succeeded' && simulatedExecution(row));
    const failures = attempts.filter(row => row.status === 'failed');
    const match = (row: ExecutionRow, keys: Set<string>) =>
      Boolean(row.agent_id && row.agent_task_id &&
        keys.has(`${row.agent_id}:${row.agent_task_id}:${tool.slug}`));
    let state: ToolEvidenceState = 'not_tested';
    if (tool.is_active === false || tool.executable === false) {
      state = 'not_executable';
    } else if (tool.slug === 'browser_task' && successes.some(row => match(row, browserReceipts))) {
      state = 'browser_verified';
    } else if (localTools.has(tool.slug) && successes.some(row => match(row, localReceipts))) {
      state = 'local_verified';
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
