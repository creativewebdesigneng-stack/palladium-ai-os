/**
 * Server-only notification emitter.
 *
 * Rules enforced here (never in the browser):
 *  - notifications are written with elevated privileges so a user cannot forge,
 *    edit or delete another person's alerts;
 *  - the recipient's stored preferences decide whether a row is written at all;
 *  - severity and category come from the catalogue, not from the caller.
 *
 * Every function is best effort: a notification must never break the flow that
 * produced it.
 */
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_TYPE_MAP,
  passesPreferences,
  type NotificationPreferences,
  type NotificationSeverity,
} from "./types";

type NotifyArgs = {
  userId: string;
  orgId?: string | null;
  type: string;
  title: string;
  /** Short factual message. Keep secrets, tokens and payloads out of it. */
  body?: string | null;
  link?: string | null;
  /** Overrides the catalogue severity in the rare case a type spans levels. */
  severity?: NotificationSeverity;
  metadata?: Record<string, unknown>;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as { from: (t: string) => any };
}

export async function loadPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const db = await admin();
    const { data } = await db
      .from("notification_preferences")
      .select("in_app,browser_push,browser_push_details,min_severity,muted_types")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return DEFAULT_NOTIFICATION_PREFERENCES;
    return {
      in_app: data.in_app ?? true,
      browser_push: data.browser_push ?? false,
      browser_push_details: data.browser_push_details ?? false,
      min_severity: (data.min_severity ?? "info") as NotificationSeverity,
      muted_types: Array.isArray(data.muted_types) ? data.muted_types : [],
    };
  } catch (error) {
    console.error("[notify] preference load failed", error);
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/** Writes one notification, honouring the recipient's preferences. */
export async function notify(args: NotifyArgs): Promise<boolean> {
  try {
    const def = NOTIFICATION_TYPE_MAP[args.type];
    const severity: NotificationSeverity = args.severity ?? def?.severity ?? "info";
    const prefs = await loadPreferences(args.userId);
    if (!passesPreferences(prefs, args.type, severity)) return false;

    const db = await admin();
    const { error } = await db.from("notifications").insert({
      user_id: args.userId,
      org_id: args.orgId ?? null,
      kind: args.type,
      severity,
      title: args.title.slice(0, 200),
      body: args.body ? args.body.slice(0, 500) : null,
      link: args.link ?? null,
      metadata: args.metadata ?? {},
    });
    if (error) {
      console.error("[notify] insert failed", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[notify] failed", error);
    return false;
  }
}

/**
 * Warns once when a plan allowance is nearly spent. Deduplicated per metric per
 * day so a busy account is not buried in the same alert.
 */
export async function notifyUsageThreshold(args: {
  userId: string;
  orgId?: string | null;
  metric: string;
  used: number;
  limit: number;
  planName?: string;
}) {
  if (!Number.isFinite(args.limit) || args.limit <= 0) return;
  const ratio = args.used / args.limit;
  if (ratio < 0.8 || ratio >= 1) return;

  try {
    const db = await admin();
    const since = new Date(Date.now() - 86400000).toISOString();
    const { data: recent } = await db
      .from("notifications")
      .select("id")
      .eq("user_id", args.userId)
      .eq("kind", "usage.limit_approaching")
      .contains("metadata", { metric: args.metric })
      .gte("created_at", since)
      .limit(1);
    if (recent?.length) return;
  } catch (error) {
    console.error("[notify] usage dedupe check failed", error);
  }

  const pretty = args.metric.replace(/_/g, " ");
  await notify({
    userId: args.userId,
    orgId: args.orgId ?? null,
    type: "usage.limit_approaching",
    title: `You have used ${Math.round(ratio * 100)}% of your ${pretty} allowance`,
    body: `${args.used} of ${args.limit} used${args.planName ? ` on the ${args.planName} plan` : ""}.`,
    link: "/billing",
    metadata: { metric: args.metric, used: args.used, limit: args.limit },
  });
}
