/**
 * Integration connections.
 *
 * A connection row records that the caller enabled a provider; credentials are
 * never stored here (they live in platform secrets, referenced by `secret_ref`).
 * Every row is owned by the caller and scoped by RLS.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

const providerInput = z.object({
  provider: z.string().trim().min(2).max(60),
  name: z.string().trim().max(80).optional(),
});

export const listIntegrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb
      .from("integrations")
      .select("id,provider,name,status,scopes,connected_at,last_sync_at,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { integrations: rows ?? [] };
  });

export const connectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("integrations")
      .upsert(
        {
          user_id: context.userId,
          provider: data.provider,
          name: data.name ?? data.provider,
          status: "connected",
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      )
      .select("id,provider,name,status,connected_at")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const disconnectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from("integrations")
      .update({ status: "disconnected", connected_at: null })
      .eq("user_id", context.userId)
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
