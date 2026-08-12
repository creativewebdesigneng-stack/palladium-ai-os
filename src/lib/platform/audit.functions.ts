/**
 * Audit log reads.
 *
 * Members see their own recorded events; organisation owners and admins see
 * every event for that organisation. The role is re-read from the database on
 * every call, never taken from the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orgId: z.string().uuid().nullish(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const limit = data.limit ?? 200;

    let scopeOrg: string | null = null;
    if (data.orgId) {
      const { data: member } = await sb
        .from("organisation_members")
        .select("role")
        .eq("org_id", data.orgId)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (member && ["owner", "admin"].includes(member.role)) scopeOrg = data.orgId;
    }

    const base = sb
      .from("mission_audit_logs")
      .select(
        "id,user_id,agent_id,action,target_type,target_id,status,metadata,ip_address,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data: rows, error } = scopeOrg
      ? await base.eq("org_id", scopeOrg)
      : await base.eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    return {
      logs: (rows ?? []).map((r: any) => ({
        id: r.id,
        created_date: r.created_at,
        actor_id: r.user_id,
        organisation_id: scopeOrg ?? "",
        action: r.action,
        resource_type: r.target_type ?? "",
        resource_id: r.target_id ?? "",
        result: r.status ?? "success",
        ip_address: r.ip_address ?? "",
        severity: r.status === "denied" || r.status === "failed" ? "warning" : "info",
        metadata: r.metadata ?? {},
      })),
    };
  });
