import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };

const policyInput = z.object({
  orgId: z.string().uuid(),
  maxConcurrentRuns: z.number().int().min(1).max(1000),
  maxDailySpendMicros: z.number().int().nonnegative().safe(),
  requireApprovalForExternalWrites: z.boolean().default(true),
  requireApprovalForFinancialActions: z.boolean().default(true),
  allowedProviders: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  allowedCapabilities: z.array(z.string().trim().min(1).max(200)).max(500).default([]),
});

async function requireAccessibleOrg(sb: Sb, orgId: string) {
  const { data, error } = await sb.from("organisations").select("id").eq("id", orgId).maybeSingle();
  if (error || !data) throw new Error("ENTERPRISE_ORG_NOT_ACCESSIBLE");
}

export const getEnterpriseAutonomyPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orgId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireAccessibleOrg(sb, data.orgId);
    const { data: policy, error } = await sb
      .from("enterprise_autonomy_policies")
      .select("org_id,max_concurrent_runs,max_daily_spend_micros,require_approval_for_external_writes,require_approval_for_financial_actions,allowed_providers,allowed_capabilities,updated_at")
      .eq("org_id", data.orgId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { policy: policy ?? null };
  });

export const saveEnterpriseAutonomyPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => policyInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireAccessibleOrg(sb, data.orgId);
    const row = {
      user_id: context.userId,
      org_id: data.orgId,
      max_concurrent_runs: data.maxConcurrentRuns,
      max_daily_spend_micros: data.maxDailySpendMicros,
      require_approval_for_external_writes: data.requireApprovalForExternalWrites,
      require_approval_for_financial_actions: data.requireApprovalForFinancialActions,
      allowed_providers: [...new Set(data.allowedProviders)].sort(),
      allowed_capabilities: [...new Set(data.allowedCapabilities)].sort(),
      updated_at: new Date().toISOString(),
    };
    const { data: policy, error } = await sb
      .from("enterprise_autonomy_policies")
      .upsert(row, { onConflict: "org_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { policy };
  });
