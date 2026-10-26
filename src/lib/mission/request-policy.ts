/** A no-tool preference only removes capabilities; commitment approvals still apply. */
export function requestsNoTools(request: string): boolean {
  return /\b(?:without\s+(?:using\s+)?tools|no[ -]tools|do\s+not\s+use\s+(?:any\s+)?tools)\b/i.test(request);
}
