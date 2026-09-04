import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };

const profileInput = z.object({
  primaryAgentId: z.string().uuid().nullish(),
  maxDailySpendMicros: z.number().int().nonnegative().safe(),
  requireApprovalForMessages: z.boolean().default(true),
  requireApprovalForPurchases: z.boolean().default(true),
  requireApprovalForExternalWrites: z.boolean().default(true),
  allowedCapabilities: z.array(z.string().trim().min(1).max(200)).max(500).default([]),
  quietHoursStart: z.number().int().min(0).max(23).nullish(),
  quietHoursEnd: z.number().int().min(0).max(23).nullish(),
  timezone: z.string().trim().min(1).max(100).default("UTC"),
});

async function assertOwnedAgent(sb: Sb, userId: string, agentId: string | null | undefined) {
  if (!agentId) return;
  const { data, error } = await sb.from("personal_agents").select("id").eq("id", agentId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("PERSONAL_OS_AGENT_NOT_OWNED");
}

export const getPersonalOsProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: profile, error } = await sb.from("personal_os_profiles").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return { profile: profile ?? null };
  });

export const savePersonalOsProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwnedAgent(sb, context.userId, data.primaryAgentId);
    const row = {
      user_id: context.userId,
      primary_agent_id: data.primaryAgentId ?? null,
      max_daily_spend_micros: data.maxDailySpendMicros,
      require_approval_for_messages: data.requireApprovalForMessages,
      require_approval_for_purchases: data.requireApprovalForPurchases,
      require_approval_for_external_writes: data.requireApprovalForExternalWrites,
      allowed_capabilities: [...new Set(data.allowedCapabilities)].sort(),
      quiet_hours_start: data.quietHoursStart ?? null,
      quiet_hours_end: data.quietHoursEnd ?? null,
      timezone: data.timezone,
      updated_at: new Date().toISOString(),
    };
    const { data: profile, error } = await sb.from("personal_os_profiles").upsert(row, { onConflict: "user_id" }).select("*").single();
    if (error) throw new Error(error.message);
    return { profile };
  });
