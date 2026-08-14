import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { prepareCheckoutDraft, runShoppingResearch } from "@/lib/mission/mission.server";
import { assertWithinLimits, checkAgainstLimits, resolveSpendLimits } from "./limits.server";

type Sb = { from: (t: string) => any };

const DEFAULT_DOMAINS = [
  "amazon.co.uk",
  "johnlewis.com",
  "argos.co.uk",
  "currys.co.uk",
  "ikea.com",
  "tesco.com",
  "sainsburys.co.uk",
];

async function audit(sb: Sb, userId: string, action: string, extra: Record<string, unknown> = {}) {
  await sb.from("mission_audit_logs").insert({
    user_id: userId,
    action,
    agent_id: (extra["agent_id"] as string | null) ?? null,
    target_type: (extra["target_type"] as string | null) ?? null,
    target_id: (extra["target_id"] as string | null) ?? null,
    status: (extra["status"] as string | null) ?? "success",
    metadata: (extra["metadata"] as Record<string, unknown>) ?? {},
  });
}

async function activity(
  sb: Sb,
  userId: string,
  message: string,
  kind: string,
  extra: Record<string, unknown> = {},
) {
  await sb.from("agent_activities").insert({
    user_id: userId,
    agent_id: (extra["agent_id"] as string | null) ?? null,
    task_id: (extra["task_id"] as string | null) ?? null,
    kind,
    message,
    metadata: (extra["metadata"] as Record<string, unknown>) ?? {},
  });
}

/** Domains an agent may browse; falls back to the platform default allowlist. */
async function allowlistFor(sb: Sb, userId: string, agentId?: string | null) {
  if (!agentId) return DEFAULT_DOMAINS;
  const res = await sb
    .from("tool_permissions")
    .select("allowed_domains")
    .eq("user_id", userId)
    .eq("agent_id", agentId);
  const domains = [
    ...new Set(((res.data ?? []) as any[]).flatMap((p) => p.allowed_domains ?? [])),
  ] as string[];
  return domains.length ? domains : DEFAULT_DOMAINS;
}

/* ------------------------------------------------------------------ workspace */

export const getShoppingWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const [tasks, results, purchases, watches, lists, items, sessions, limitRows] =
      await Promise.all([
        sb.from("shopping_tasks").select("*").order("created_at", { ascending: false }).limit(40),
        sb
          .from("shopping_results")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(120),
        sb
          .from("purchase_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(40),
        sb.from("product_watches").select("*").order("created_at", { ascending: false }),
        sb.from("shopping_lists").select("*").order("created_at", { ascending: false }),
        sb.from("shopping_list_items").select("*").order("position", { ascending: true }),
        sb
          .from("browser_sessions")
          .select("id, provider, allowed_domains, status, steps, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        sb.from("spend_limits").select("*").eq("user_id", userId),
      ]);

    const limits = await resolveSpendLimits(sb, userId, null);
    const browser = await browserProviderStatus();

    return {
      browser,
      tasks: tasks.data ?? [],
      results: results.data ?? [],
      purchases: purchases.data ?? [],
      watches: watches.data ?? [],
      lists: lists.data ?? [],
      items: items.data ?? [],
      sessions: sessions.data ?? [],
      limitRows: limitRows.data ?? [],
      limits,
    };
  });

/* --------------------------------------------------------------- research ops */

type SearchInput = {
  requirement: string;
  budget?: number | null;
  currency?: string;
  agentId?: string | null;
  listItemId?: string | null;
};

/**
 * Research → compare → present. This never prepares a payment: it records the
 * offers it found and stops. Preparing a purchase is a separate, explicit step.
 */
export const runShoppingSearch = createServerFn({ method: "POST" })
  .inputValidator((input: SearchInput) => {
    if (!input?.requirement?.trim()) throw new Error("Describe what you are looking for");
    return input;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const currency = data.currency ?? "GBP";
    const budget =
      data.budget != null && data.budget !== ("" as unknown) ? Number(data.budget) : null;
    const agentId = data.agentId ?? null;

    const allowedDomains = await allowlistFor(sb, userId, agentId);

    const taskRes = await sb
      .from("shopping_tasks")
      .insert({
        user_id: userId,
        agent_id: agentId,
        requirement: data.requirement.trim(),
        budget,
        currency,
        status: "running",
      })
      .select()
      .maybeSingle();
    const task = taskRes.data;
    if (!task) throw new Error("Could not start the search");

    await activity(sb, userId, `Agent searching for “${data.requirement.trim()}”`, "searching", {
      agent_id: agentId,
    });

    const { offers, steps, provider, simulated } = await runShoppingResearch({
      requirement: data.requirement,
      budget,
      currency,
      allowedDomains,
      allowedTools: ["web_search", "shopping_search", "browser"],
    });

    await sb.from("browser_sessions").insert({
      user_id: userId,
      agent_id: agentId,
      provider,
      allowed_domains: allowedDomains,
      status: "completed",
      steps,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    });

    const rows = offers.map((o, i) => ({
      shopping_task_id: task.id,
      product: o.product,
      price: o.price,
      currency: o.currency,
      seller: o.seller,
      delivery: o.delivery,
      delivery_cost: o.deliveryCost,
      rating: o.rating,
      url: o.url,
      specs: o.specs,
      reason: simulated
        ? `[SIMULATED DEVELOPMENT DATA — not a real listing] ${o.reason}`
        : o.reason,
      in_stock: o.inStock,
      selected: i === 0,
    }));
    const resultsRes = rows.length
      ? await sb.from("shopping_results").insert(rows).select()
      : { data: [] };
    const results: any[] = resultsRes.data ?? [];

    await sb
      .from("shopping_tasks")
      .update({ status: results.length ? "completed" : "failed" })
      .eq("id", task.id)
      .eq("user_id", userId);

    if (data.listItemId) {
      await sb
        .from("shopping_list_items")
        .update({ shopping_task_id: task.id, status: "researched" })
        .eq("id", data.listItemId)
        .eq("user_id", userId);
    }

    await activity(sb, userId, `Agent found ${results.length} options`, "results_found", {
      agent_id: agentId,
    });
    await audit(sb, userId, "search_performed", {
      agent_id: agentId,
      target_type: "shopping_task",
      target_id: task.id,
      metadata: { requirement: data.requirement.trim(), budget, currency, results: results.length },
    });

    return { taskId: task.id, provider, simulated, results, allowedDomains };
  });

/** Re-ranks stored offers and returns cheapest / best-rated / fastest views. */
export const compareResults = createServerFn({ method: "POST" })
  .inputValidator((input: { taskId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const task = await sb
      .from("shopping_tasks")
      .select("id, requirement, budget, currency, agent_id")
      .eq("id", data.taskId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task.data) throw new Error("Search not found");

    const res = await sb.from("shopping_results").select("*").eq("shopping_task_id", data.taskId);
    const offers: any[] = res.data ?? [];
    const landed = (o: any) => Number(o.price ?? 0) + Number(o.delivery_cost ?? 0);
    const inStock = offers.filter((o) => o.in_stock);

    await audit(sb, userId, "comparison_performed", {
      agent_id: task.data.agent_id,
      target_type: "shopping_task",
      target_id: data.taskId,
      metadata: { offers: offers.length },
    });

    return {
      cheapest: [...offers].sort((a, b) => landed(a) - landed(b)).slice(0, 5),
      bestRated: [...offers]
        .sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0))
        .slice(0, 5),
      available: inStock,
      sellers: [
        ...new Map(
          offers.map((o) => [
            o.seller,
            {
              seller: o.seller,
              from: Math.min(...offers.filter((x) => x.seller === o.seller).map(landed)),
              currency: o.currency,
              delivery: o.delivery,
            },
          ]),
        ).values(),
      ],
      unavailable: offers.filter((o) => !o.in_stock),
    };
  });

/* ---------------------------------------------------------------- purchase ops */

/**
 * Prepares (never pays for) a purchase and opens an approval request.
 * The total is recomputed server-side and checked against every spend limit.
 */
export const preparePurchase = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { resultId: string; quantity?: number; agentId?: string | null }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const quantity = Math.max(1, Math.min(20, Math.round(Number(data.quantity ?? 1))));

    const resultRes = await sb
      .from("shopping_results")
      .select("*")
      .eq("id", data.resultId)
      .maybeSingle();
    const result = resultRes.data;
    if (!result) throw new Error("Product not found");

    // Ownership is proven through the parent shopping task, which is RLS-scoped.
    const taskRes = await sb
      .from("shopping_tasks")
      .select("*")
      .eq("id", result.shopping_task_id)
      .eq("user_id", userId)
      .maybeSingle();
    const task = taskRes.data;
    if (!task) throw new Error("Product not found");

    const agentId = data.agentId ?? task.agent_id ?? null;
    const allowedDomains = await allowlistFor(sb, userId, agentId);

    await activity(
      sb,
      userId,
      `Agent preparing a purchase: ${result.product}`,
      "preparing_action",
      {
        agent_id: agentId,
      },
    );

    const draft = await prepareCheckoutDraft({
      offer: {
        product: result.product,
        price: Number(result.price ?? 0),
        currency: result.currency,
        seller: result.seller,
        delivery: result.delivery,
        deliveryCost: Number(result.delivery_cost ?? 0),
        rating: Number(result.rating ?? 0),
        url: result.url,
        inStock: result.in_stock,
        specs: result.specs ?? {},
        reason: result.reason ?? "",
      },
      allowedDomains,
      allowedTools: ["browser", "shopping_search", "checkout"],
    });

    const itemPrice = Math.round(draft.itemPrice * quantity * 100) / 100;
    const tax = Math.round(draft.tax * quantity * 100) / 100;
    const total = Math.round((itemPrice + draft.deliveryCost + draft.fees) * 100) / 100;

    let limits;
    try {
      limits = await assertWithinLimits(sb, userId, agentId, total);
    } catch (error) {
      await audit(sb, userId, "purchase_blocked_by_limit", {
        agent_id: agentId,
        target_type: "shopping_result",
        target_id: result.id,
        status: "blocked",
        metadata: { total, reason: (error as Error).message },
      });
      throw error;
    }

    const approvalRes = await sb
      .from("approval_requests")
      .insert({
        user_id: userId,
        agent_id: agentId,
        task_id: null,
        action_type: "purchase",
        title: `Purchase: ${draft.product}`,
        summary: result.reason,
        details: {
          product: draft.product,
          seller: draft.seller,
          quantity,
          delivery: result.delivery,
          rating: result.rating,
          url: result.url,
          item_price: itemPrice,
          delivery_cost: draft.deliveryCost,
          tax,
          fees: draft.fees,
          specs: result.specs ?? {},
        },
        estimated_cost: total,
        currency: draft.currency,
        risk_level: total > 500 ? "high" : total > 100 ? "medium" : "low",
        status: "pending",
      })
      .select()
      .maybeSingle();

    const purchaseRes = await sb
      .from("purchase_requests")
      .insert({
        user_id: userId,
        shopping_task_id: task.id,
        shopping_result_id: result.id,
        approval_request_id: approvalRes.data?.id ?? null,
        product: draft.product,
        seller: draft.seller,
        quantity,
        item_price: itemPrice,
        delivery_cost: draft.deliveryCost,
        tax,
        fees: draft.fees,
        total,
        currency: draft.currency,
        status: "awaiting_approval",
        checkout_url: draft.checkoutUrl,
      })
      .select()
      .maybeSingle();

    await sb.from("shopping_results").update({ selected: false }).eq("shopping_task_id", task.id);
    await sb.from("shopping_results").update({ selected: true }).eq("id", result.id);
    await sb
      .from("shopping_tasks")
      .update({ status: "awaiting_approval" })
      .eq("id", task.id)
      .eq("user_id", userId);

    await activity(sb, userId, `Approval required: ${draft.product}`, "approval_required", {
      agent_id: agentId,
    });
    await audit(sb, userId, "product_selected", {
      agent_id: agentId,
      target_type: "shopping_result",
      target_id: result.id,
      metadata: { quantity },
    });
    await audit(sb, userId, "purchase_prepared", {
      agent_id: agentId,
      target_type: "purchase_request",
      target_id: purchaseRes.data?.id ?? null,
      metadata: { total, currency: draft.currency, quantity, seller: draft.seller },
    });

    return {
      purchase: purchaseRes.data ?? null,
      approvalId: approvalRes.data?.id ?? null,
      limits,
      /** True when the underlying offer came from the development simulation. */
      simulated: draft.simulated === true,
      /** The platform prepares checkout only; the user authorises payment. */
      paymentAuthorised: false as const,
    };
  });

/** Read-only affordability preview shown before a purchase is prepared. */
export const previewPurchaseLimits = createServerFn({ method: "POST" })
  .inputValidator((input: { total: number; agentId?: string | null }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const limits = await resolveSpendLimits(sb, context.userId, data.agentId ?? null);
    return checkAgainstLimits(Number(data.total ?? 0), limits);
  });

/* ------------------------------------------------------------------- limits */

export const saveSpendLimits = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      agentId?: string | null;
      currency?: string;
      perTransactionLimit?: number | null;
      monthlyCap?: number | null;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const clean = (v: unknown) =>
      v == null || v === "" ? null : Math.max(0, Math.round(Number(v) * 100) / 100);

    const agentId = data.agentId ?? null;
    const existing = await sb
      .from("spend_limits")
      .select("id")
      .eq("user_id", userId)
      .is("agent_id", agentId ? undefined : null);

    const payload = {
      user_id: userId,
      agent_id: agentId,
      scope: agentId ? "agent" : "user",
      currency: data.currency ?? "GBP",
      per_transaction_limit: clean(data.perTransactionLimit),
      monthly_cap: clean(data.monthlyCap),
    };

    let row;
    if (agentId) {
      const found = await sb
        .from("spend_limits")
        .select("id")
        .eq("user_id", userId)
        .eq("agent_id", agentId)
        .maybeSingle();
      row = found.data;
    } else {
      row = (existing.data ?? [])[0] ?? null;
    }

    const res = row
      ? await sb
          .from("spend_limits")
          .update(payload)
          .eq("id", row.id)
          .eq("user_id", userId)
          .select()
          .maybeSingle()
      : await sb.from("spend_limits").insert(payload).select().maybeSingle();

    await audit(sb, userId, "spend_limits_updated", {
      agent_id: agentId,
      target_type: "spend_limits",
      target_id: res.data?.id ?? null,
      metadata: {
        per_transaction_limit: payload.per_transaction_limit,
        monthly_cap: payload.monthly_cap,
      },
    });

    return res.data ?? null;
  });

/* ------------------------------------------------------------ product watches */

export const trackProduct = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      resultId?: string | null;
      product?: string;
      seller?: string | null;
      url?: string | null;
      currency?: string;
      targetPrice?: number | null;
      notes?: string | null;
      agentId?: string | null;
      status?: string;
    }) => input,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    let seed: any = null;
    if (data.resultId) {
      const res = await sb
        .from("shopping_results")
        .select("*")
        .eq("id", data.resultId)
        .maybeSingle();
      if (res.data) {
        const owner = await sb
          .from("shopping_tasks")
          .select("id")
          .eq("id", res.data.shopping_task_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (owner.data) seed = res.data;
      }
    }

    const product = data.product?.trim() || seed?.product;
    if (!product) throw new Error("A product name is required");

    const payload: Record<string, unknown> = {
      user_id: userId,
      agent_id: data.agentId ?? null,
      shopping_result_id: seed?.id ?? null,
      product,
      seller: data.seller ?? seed?.seller ?? null,
      url: data.url ?? seed?.url ?? null,
      currency: data.currency ?? seed?.currency ?? "GBP",
      target_price:
        data.targetPrice == null || data.targetPrice === ("" as unknown)
          ? null
          : Number(data.targetPrice),
      last_price: seed ? Number(seed.price ?? 0) : null,
      best_price: seed ? Number(seed.price ?? 0) : null,
      in_stock: seed?.in_stock ?? null,
      notes: data.notes ?? null,
      last_checked_at: new Date().toISOString(),
      ...(data.status ? { status: data.status } : {}),
    };

    const res = data.id
      ? await sb
          .from("product_watches")
          .update(payload)
          .eq("id", data.id)
          .eq("user_id", userId)
          .select()
          .maybeSingle()
      : await sb.from("product_watches").insert(payload).select().maybeSingle();

    await audit(sb, userId, data.id ? "product_watch_updated" : "product_watch_created", {
      agent_id: data.agentId ?? null,
      target_type: "product_watch",
      target_id: res.data?.id ?? null,
      metadata: { product },
    });

    return res.data ?? null;
  });

/** Re-checks a tracked product through the browser agent and records the price. */
export const refreshWatch = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const watchRes = await sb
      .from("product_watches")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    const watch = watchRes.data;
    if (!watch) throw new Error("Tracked product not found");

    const allowedDomains = await allowlistFor(sb, userId, watch.agent_id);
    const { offers, provider } = await runShoppingResearch({
      requirement: watch.product,
      budget: watch.target_price ? Number(watch.target_price) : null,
      currency: watch.currency,
      allowedDomains,
      allowedTools: ["web_search", "shopping_search", "browser"],
    });

    const match =
      offers.find((o) => watch.seller && o.seller === watch.seller) ?? offers[0] ?? null;
    const lastPrice = match ? Number(match.price) : null;
    const best =
      lastPrice != null && watch.best_price != null
        ? Math.min(lastPrice, Number(watch.best_price))
        : (lastPrice ?? watch.best_price);

    const res = await sb
      .from("product_watches")
      .update({
        last_price: lastPrice,
        best_price: best,
        in_stock: match ? match.inStock : watch.in_stock,
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", watch.id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();

    const hitTarget =
      watch.target_price != null && lastPrice != null && lastPrice <= Number(watch.target_price);
    if (hitTarget) {
      await sb.from("notifications").insert({
        user_id: userId,
        kind: "shopping",
        title: `${watch.product} hit your target price`,
        body: `Now ${watch.currency} ${lastPrice?.toFixed(2)} at ${match?.seller ?? "a tracked seller"}.`,
      });
    }

    await audit(sb, userId, "product_watch_checked", {
      agent_id: watch.agent_id,
      target_type: "product_watch",
      target_id: watch.id,
      metadata: { last_price: lastPrice, provider, hit_target: hitTarget },
    });

    return { watch: res.data ?? null, provider, hitTarget };
  });

export const deleteWatch = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await sb.from("product_watches").delete().eq("id", data.id).eq("user_id", context.userId);
    await audit(sb, context.userId, "product_watch_deleted", {
      target_type: "product_watch",
      target_id: data.id,
    });
    return { ok: true };
  });

/* ------------------------------------------------------------- shopping lists */

export const saveShoppingList = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      name: string;
      description?: string | null;
      budget?: number | null;
      currency?: string;
      status?: string;
    }) => {
      if (!input?.name?.trim()) throw new Error("Give the list a name");
      return input;
    },
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;
    const payload = {
      user_id: userId,
      name: data.name.trim(),
      description: data.description ?? null,
      budget: data.budget == null || data.budget === ("" as unknown) ? null : Number(data.budget),
      currency: data.currency ?? "GBP",
      ...(data.status ? { status: data.status } : {}),
    };
    const res = data.id
      ? await sb
          .from("shopping_lists")
          .update(payload)
          .eq("id", data.id)
          .eq("user_id", userId)
          .select()
          .maybeSingle()
      : await sb.from("shopping_lists").insert(payload).select().maybeSingle();
    return res.data ?? null;
  });

export const deleteShoppingList = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await sb.from("shopping_lists").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

export const saveListItem = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id?: string;
      listId: string;
      name: string;
      notes?: string | null;
      quantity?: number;
      budget?: number | null;
      status?: string;
    }) => {
      if (!input?.listId) throw new Error("Pick a list");
      if (!input?.name?.trim()) throw new Error("Describe the item");
      return input;
    },
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const userId = context.userId;

    const list = await sb
      .from("shopping_lists")
      .select("id")
      .eq("id", data.listId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!list.data) throw new Error("List not found");

    const payload = {
      user_id: userId,
      list_id: data.listId,
      name: data.name.trim(),
      notes: data.notes ?? null,
      quantity: Math.max(1, Math.round(Number(data.quantity ?? 1))),
      budget: data.budget == null || data.budget === ("" as unknown) ? null : Number(data.budget),
      ...(data.status ? { status: data.status } : {}),
    };

    const res = data.id
      ? await sb
          .from("shopping_list_items")
          .update(payload)
          .eq("id", data.id)
          .eq("user_id", userId)
          .select()
          .maybeSingle()
      : await sb.from("shopping_list_items").insert(payload).select().maybeSingle();
    return res.data ?? null;
  });

export const deleteListItem = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await sb.from("shopping_list_items").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });
