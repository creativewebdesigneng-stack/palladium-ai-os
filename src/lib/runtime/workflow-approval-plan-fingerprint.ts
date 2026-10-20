/**
 * Fingerprint the execution plan at the instant the operator approval is queued.
 * No workflow prompt, tool input, connector token, or step configuration value
 * is copied into the approval request: only a SHA-256 checksum leaves this helper.
 *
 * Canonicalise nested config records so database JSONB key ordering does not
 * cause spurious plan changes. Step order is defined by persisted position/id.
 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, field]) => [key, canonical(field)]),
    );
  }
  return value ?? null;
}

export type ApprovalPlanStep = {
  id: string;
  kind?: string | null;
  agent_id?: string | null;
  position?: number | null;
  mode?: string | null;
  depends_on?: string[] | null;
  condition?: unknown;
  input_template?: string | null;
  max_retries?: number | null;
  retry_delay_ms?: number | null;
  timeout_ms?: number | null;
  continue_on_error?: boolean | null;
  requires_approval?: boolean | null;
  config?: unknown;
};

export async function fingerprintWorkflowApprovalPlan(steps: ApprovalPlanStep[]): Promise<string> {
  const snapshot = [...steps]
    .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0) || a.id.localeCompare(b.id))
    .map((step) => canonical({
      id: step.id,
      kind: step.kind,
      agent_id: step.agent_id,
      position: step.position,
      mode: step.mode,
      depends_on: step.depends_on,
      condition: step.condition,
      input_template: step.input_template,
      max_retries: step.max_retries,
      retry_delay_ms: step.retry_delay_ms,
      timeout_ms: step.timeout_ms,
      continue_on_error: step.continue_on_error,
      requires_approval: step.requires_approval,
      config: step.config,
    }));
  const data = new TextEncoder().encode(JSON.stringify(snapshot));
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}
