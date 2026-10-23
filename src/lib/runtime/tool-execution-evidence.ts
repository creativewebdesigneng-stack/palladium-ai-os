/** An uncertain post-dispatch outcome must not enter automatic recovery. */
export function isToolExecutionUnconfirmed(output: unknown): boolean {
  return Boolean(output && typeof output === 'object' && !Array.isArray(output)
    && (output as Record<string, unknown>)['code'] === 'TOOL_EXECUTION_EVIDENCE_UNCONFIRMED');
}
