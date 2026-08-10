/**
 * Server-only audit logging. Users can read their own audit trail but can never
 * write, edit or delete it, so entries are inserted with elevated privileges.
 */

export type AuditEntry = {
  userId: string;
  orgId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  status?: "success" | "denied" | "failed";
  agentId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAudit(entry: AuditEntry) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("mission_audit_logs").insert({
      user_id: entry.userId,
      org_id: entry.orgId ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      status: entry.status ?? "success",
      agent_id: entry.agentId ?? null,
      ip_address: entry.ipAddress ?? null,
      metadata: entry.metadata ?? {},
    } as never);
  } catch (error) {
    // Audit logging must never take down the request it is describing.
    console.error("[audit] failed to record entry", entry.action, error);
  }
}

export async function notify(entry: {
  userId: string;
  orgId?: string | null;
  kind?: string;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notifications").insert({
      user_id: entry.userId,
      org_id: entry.orgId ?? null,
      kind: entry.kind ?? "info",
      title: entry.title,
      body: entry.body ?? null,
      link: entry.link ?? null,
      metadata: entry.metadata ?? {},
    } as never);
  } catch (error) {
    console.error("[notify] failed", entry.title, error);
  }
}
