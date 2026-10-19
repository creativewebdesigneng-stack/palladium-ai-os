/**
 * The generic purchase/personal-task approval handler cannot execute bounded
 * browser actions. They require the external-action claim and immutable
 * approval continuation receipt. Fail closed rather than recording success.
 */
export function assertGenericApprovalCanDecide(actionType: string): void {
  if (['agent_browser_task', 'agent_tool_task'].includes(actionType)) {
    throw new Error(
      'Browser approvals require the dedicated executable approval handler. Open the current Blackstar Preview and submit a new browser task if an earlier approval has no execution evidence.',
    );
  }
}
