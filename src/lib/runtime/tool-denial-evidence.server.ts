/**
 * Durable, schema-compatible tool policy-denial evidence.
 *
 * public.tool_executions has no policy_code column: the policy discriminator
 * belongs in the existing JSON input payload. Always redact caller input
 * when adding a policy discriminator. Never add credentials or model text.
 */
import { writeAuditRequired } from "@/lib/platform/audit.server";

export function normaliseToolEvidenceExtra(extra: Record<string, unknown>): Record<string, unknown> {
  const { policy_code: rawCode, ...rest } = extra;
  if (rawCode === undefined || rawCode === null) return rest;
  if (typeof rawCode !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(rawCode)) {
    throw new Error("Invalid tool policy discriminator.");
  }
  return {
    ...rest,
    input: { redacted: true, policy_code: rawCode },
  };
}

export async function writeRequiredToolPolicyDenial(
  ctx: { userId: string; agentId: string; orgId?: string | null; taskId?: string | null },
  tool: string,
  policyCode: string,
): Promise<void> {
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(policyCode)) {
    throw new Error("Invalid tool policy discriminator.");
  }
  await writeAuditRequired({
    userId: ctx.userId,
    orgId: ctx.orgId ?? null,
    agentId: ctx.agentId,
    targetType: ctx.taskId ? "agent_task" : "personal_agent",
    targetId: ctx.taskId || ctx.agentId,
    action: "agent.tool_policy_denied",
    status: "denied",
    metadata: { tool: tool.slice(0, 40), policy_code: policyCode },
  });
}
