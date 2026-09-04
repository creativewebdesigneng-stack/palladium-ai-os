import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calculateAgentEconomyBalance, canAffordAgentAction, type EconomyEntry } from "./agent-economy";

type Sb = { from: (table: string) => any };

const scopeSchema = z.object({ agentId: z.string().uuid(), currency: z.string().trim().length(3).default("GBP") });

async function assertOwnedAgent(sb: Sb, userId: string, agentId: string) {
  const { data, error } = await sb.from("agents").select("id").eq("id", agentId).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("AGENT_NOT_OWNED");
}

export const getAgentEconomyBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scopeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwnedAgent(sb, context.userId, data.agentId);
    const currency = data.currency.toUpperCase();
    const { data: rows, error } = await sb
      .from("agent_economy_entries")
      .select("id,agent_id,kind,amount_micros,currency,reference,created_at")
      .eq("user_id", context.userId)
      .eq("agent_id", data.agentId)
      .eq("currency", currency)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const entries: EconomyEntry[] = (rows ?? []).map((row: any) => ({
      id: row.id,
      agentId: row.agent_id,
      kind: row.kind,
      amountMicros: Number(row.amount_micros),
      currency: row.currency,
      reference: row.reference,
      createdAt: row.created_at,
    }));
    return { balance: calculateAgentEconomyBalance(data.agentId, currency, entries) };
  });

export const checkAgentEconomyBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => scopeSchema.extend({ estimatedCostMicros: z.number().int().positive().safe() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertOwnedAgent(sb, context.userId, data.agentId);
    const currency = data.currency.toUpperCase();
    const { data: rows, error } = await sb
      .from("agent_economy_entries")
      .select("id,agent_id,kind,amount_micros,currency,reference,created_at")
      .eq("user_id", context.userId)
      .eq("agent_id", data.agentId)
      .eq("currency", currency)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const entries: EconomyEntry[] = (rows ?? []).map((row: any) => ({ id: row.id, agentId: row.agent_id, kind: row.kind, amountMicros: Number(row.amount_micros), currency: row.currency, reference: row.reference, createdAt: row.created_at }));
    const balance = calculateAgentEconomyBalance(data.agentId, currency, entries);
    return { allowed: canAffordAgentAction(balance, data.estimatedCostMicros), balance };
  });
