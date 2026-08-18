/**
 * The notification catalogue.
 *
 * This module is client-safe: both the browser (preferences UI, badges) and the
 * server (emitters) read the same definitions so a type can never mean two
 * different things in two places.
 */

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export type NotificationTypeDef = {
  /** Stable identifier stored in `notifications.kind`. */
  type: string;
  label: string;
  /** UI grouping used by the Notifications Centre category nav. */
  category: "agents" | "workflows" | "billing" | "security" | "system";
  severity: NotificationSeverity;
  /** Short human explanation, shown in the preferences panel. */
  desc: string;
};

export const NOTIFICATION_TYPES: NotificationTypeDef[] = [
  {
    type: "agent.started",
    label: "Agent started",
    category: "agents",
    severity: "info",
    desc: "An agent began a run.",
  },
  {
    type: "agent.completed",
    label: "Agent completed",
    category: "agents",
    severity: "success",
    desc: "An agent finished a run successfully.",
  },
  {
    type: "agent.failed",
    label: "Agent failed",
    category: "agents",
    severity: "critical",
    desc: "A run failed, timed out or was terminated.",
  },
  {
    type: "agent.input_required",
    label: "Agent requires input",
    category: "agents",
    severity: "warning",
    desc: "An agent is paused and waiting on you.",
  },
  {
    type: "approval.required",
    label: "Task requires approval",
    category: "security",
    severity: "warning",
    desc: "A task is held until you approve it.",
  },
  {
    type: "purchase.approval_required",
    label: "Purchase requires approval",
    category: "security",
    severity: "warning",
    desc: "An agent prepared a purchase and needs your sign-off.",
  },
  {
    type: "workflow.completed",
    label: "Workflow completed",
    category: "workflows",
    severity: "success",
    desc: "A multi-agent workflow finished.",
  },
  {
    type: "workflow.failed",
    label: "Workflow failed",
    category: "workflows",
    severity: "critical",
    desc: "A workflow stopped on a failing step.",
  },
  {
    type: "reminder.due",
    label: "Reminder due",
    category: "system",
    severity: "info",
    desc: "A reminder you scheduled in Mission Control is due.",
  },
  {
    type: "subscription.changed",
    label: "Subscription changed",
    category: "billing",
    severity: "info",
    desc: "Your plan, seats or renewal state changed.",
  },
  {
    type: "payment.failed",
    label: "Payment failed",
    category: "billing",
    severity: "critical",
    desc: "A payment could not be collected.",
  },
  {
    type: "usage.limit_approaching",
    label: "Usage approaching limit",
    category: "billing",
    severity: "warning",
    desc: "You are close to a plan allowance.",
  },
];

export const NOTIFICATION_TYPE_MAP: Record<string, NotificationTypeDef> = Object.fromEntries(
  NOTIFICATION_TYPES.map((t) => [t.type, t]),
);

export const SEVERITY_ORDER: Record<NotificationSeverity, number> = {
  info: 0,
  success: 0,
  warning: 1,
  critical: 2,
};

export const SEVERITY_LABELS: Array<{ value: NotificationSeverity; label: string }> = [
  { value: "info", label: "Everything" },
  { value: "warning", label: "Warnings and failures" },
  { value: "critical", label: "Failures only" },
];

export type NotificationPreferences = {
  in_app: boolean;
  browser_push: boolean;
  browser_push_details: boolean;
  min_severity: NotificationSeverity;
  muted_types: string[];
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  in_app: true,
  browser_push: false,
  browser_push_details: false,
  min_severity: "info",
  muted_types: [],
};

/** True when a notification of this type/severity should reach the user. */
export function passesPreferences(
  prefs: NotificationPreferences,
  type: string,
  severity: NotificationSeverity,
): boolean {
  if (!prefs.in_app) return false;
  if (prefs.muted_types.includes(type)) return false;
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[prefs.min_severity];
}
