import type { CommunicationPurpose } from "./contracts";

export type PhoneAutomationPolicy = {
  purpose: CommunicationPurpose;
  push: boolean;
  sms: boolean;
  voice: boolean;
};

function purposeForKind(kind: string): CommunicationPurpose {
  if (kind.startsWith("project.")) return "project_update";
  if (kind.startsWith("agent.")) return "agent_update";
  if (kind.startsWith("workflow.")) return "agent_update";
  if (kind === "approval.required" || kind.endsWith(".approval_required")) return "approval";
  if (kind.startsWith("reminder.") || kind.endsWith("_reminder")) return "reminder";
  if (
    kind.startsWith("retail.") ||
    kind.startsWith("finance.") ||
    kind.startsWith("legal.") ||
    kind.startsWith("compliance.") ||
    kind.startsWith("payment.") ||
    kind.startsWith("subscription.")
  ) return "business_update";
  return "custom";
}

/**
 * Conservative automatic delivery policy. Phone push is the low-friction default.
 * SMS is reserved for material/actionable events or explicit completions/reminders.
 * AI calls are reserved for critical/action-required events and still require the
 * user's separate voice opt-in, a verified number, quiet-hour clearance and quota.
 */
export function phoneAutomationPolicy(
  kind: string,
  severity: string,
): PhoneAutomationPolicy {
  const normalizedKind = kind.trim().toLowerCase();
  const normalizedSeverity = severity.trim().toLowerCase();
  const actionable =
    normalizedKind === "approval.required" ||
    normalizedKind.endsWith(".approval_required") ||
    normalizedKind === "agent.input_required";
  const completion =
    normalizedKind.endsWith(".completed") ||
    normalizedKind.endsWith(".due") ||
    normalizedKind.endsWith("_reminder");
  const material = normalizedSeverity === "warning" || normalizedSeverity === "critical";

  return {
    purpose: purposeForKind(normalizedKind),
    push: true,
    sms: material || actionable || completion,
    voice: normalizedSeverity === "critical" || actionable,
  };
}
