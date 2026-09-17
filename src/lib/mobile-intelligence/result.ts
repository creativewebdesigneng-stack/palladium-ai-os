export interface MobileExecutionResult {
  requestId: string;
  status: 'completed' | 'approval_required' | 'rejected' | 'failed';
  executionTarget: 'device' | 'astra' | 'hybrid';
  output?: unknown;
  errorCode?: string;
}

export function failedMobileResult(requestId: string, executionTarget: MobileExecutionResult['executionTarget'], errorCode: string): MobileExecutionResult {
  return { requestId, status: 'failed', executionTarget, errorCode };
}
