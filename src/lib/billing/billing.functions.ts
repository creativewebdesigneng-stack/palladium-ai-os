/**
 * Billing server functions.
 *
 * Reads are authoritative: the current subscription row and a merged
 * timeline of billing-relevant events (subscription changes, marketplace
 * purchases, purchase requests). There is no invoices table in this schema,
 * so we never fabricate invoice data — screens must show an honest empty
 * state when no rows exist.
 *
 * `updateMyProfile` lets a user edit their own `profiles` row only; role and
 * org_id are never accepted from the client (the DB trigger
 * `profiles_block_privilege_change` also enforces this server-side).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

export const getBillingOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid().nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const orgId = data.orgId ?? null;

    const base = sb
      .from("subscriptions")
      .select(
        "plan_code,status,seats,current_period_start,current_period_end,cancel_at_period_end,trial_ends_at,environment,created_at,updated_at",
      );
    const { data: sub, error } = orgId
      ? await base.eq("org_id", orgId).maybeSingle()
      : await base.eq("user_id", context.userId).is("org_id", null).maybeSingle();
    if (error) throw new Error(error.message);

    return { subscription: sub ?? null };
  });

export const listBillingEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orgId: z.string().uuid().nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const orgId = data.orgId ?? null;
    const userId = context.userId;

    const subQuery = sb
      .from("subscriptions")
      .select("plan_code,status,created_at,updated_at,cancel_at_period_end,environment");
    const purchasesQuery = sb
      .from("marketplace_purchases")
      .select("id,amount_pence,currency,status,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const requestsQuery = sb
      .from("purchase_requests")
      .select("id,product,total,currency,status,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const [{ data: subs }, { data: purchases }, { data: requests }] = await Promise.all([
      orgId ? subQuery.eq("org_id", orgId) : subQuery.eq("user_id", userId).is("org_id", null),
      orgId ? purchasesQuery.eq("org_id", orgId) : purchasesQuery.eq("user_id", userId),
      // purchase_requests has no org_id column — only ever the caller's own.
      requestsQuery.eq("user_id", userId),
    ]);

    const events: Array<{
      id: string;
      kind: "subscription" | "purchase" | "purchase_request";
      title: string;
      status: string;
      amount: number | null;
      currency: string;
      date: string;
    }> = [];

    for (const s of subs ?? []) {
      events.push({
        id: `sub-${s.updated_at}`,
        kind: "subscription",
        title: `${s.plan_code} plan · ${s.status}${s.cancel_at_period_end ? " (cancels at period end)" : ""}`,
        status: s.status,
        amount: null,
        currency: "GBP",
        date: s.updated_at ?? s.created_at,
      });
    }
    for (const p of purchases ?? []) {
      events.push({
        id: `mp-${p.id}`,
        kind: "purchase",
        title: "Marketplace purchase",
        status: p.status,
        amount: (p.amount_pence ?? 0) / 100,
        currency: p.currency ?? "GBP",
        date: p.created_at,
      });
    }
    for (const r of requests ?? []) {
      events.push({
        id: `pr-${r.id}`,
        kind: "purchase_request",
        title: r.product,
        status: r.status,
        amount: Number(r.total ?? 0),
        currency: r.currency ?? "GBP",
        date: r.created_at,
      });
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { events };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().min(1).max(120).optional(),
        avatarUrl: z.string().trim().url().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const patch: Record<string, unknown> = {};
    if (data.fullName !== undefined) patch["full_name"] = data.fullName;
    if (data.avatarUrl !== undefined) patch["avatar_url"] = data.avatarUrl;
    if (Object.keys(patch).length === 0) return { ok: true };

    const { data: row, error } = await sb
      .from("profiles")
      .update(patch)
      .eq("id", context.userId)
      .select("id,email,full_name,avatar_url")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, profile: row };
  });
