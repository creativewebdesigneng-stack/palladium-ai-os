/**
 * Marketplace server functions (typed RPC).
 *
 * Replaces the legacy `base44.functions.invoke("*MarketplaceAgent")` surface.
 * Security invariants:
 *  - listings are read through the caller's session (RLS decides visibility)
 *  - publishers may only mutate rows where `publisher_id = auth.uid()`
 *  - approve/reject requires the platform `admin` role, re-read server-side
 *  - status transitions are decided here, never accepted from the browser
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  slugify,
  toListingDTO,
  withCreators,
  isPlatformAdmin,
  UI_TO_DB_STATUS,
} from "./marketplace.server";

type Sb = {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

const listingInput = z.object({
  item_id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(4000).optional().default(""),
  category: z.string().trim().min(2).max(40),
  version: z.string().trim().max(20).optional().default("1.0.0"),
  features: z.array(z.string().trim().max(60)).max(30).optional().default([]),
  price: z.number().min(0).max(100000).optional().default(0),
  required_plan: z.enum(["free", "pro", "business", "enterprise"]).optional().default("free"),
  usage_requirements: z.string().trim().max(1000).optional().default(""),
  revenue_share: z.number().min(0).max(100).optional().default(30),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

/** Public marketplace catalogue: published listings only. */
export const listMarketplaceAgents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ category: z.string().optional(), limit: z.number().optional() })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let q = sb
      .from("marketplace_agents")
      .select("*")
      .eq("status", "published")
      .order("install_count", { ascending: false })
      .limit(Math.min(data.limit ?? 60, 200));
    if (data.category && data.category !== "all") q = q.eq("category", data.category);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return withCreators(sb, rows ?? []);
  });

/** Every listing owned by the caller, in any state. */
export const listMyListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb
      .from("marketplace_agents")
      .select("*")
      .eq("publisher_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return withCreators(sb, rows ?? []);
  });

/** Published listings for one creator's public profile. */
export const listCreatorListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ creator_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb
      .from("marketplace_agents")
      .select("*")
      .eq("publisher_id", data.creator_id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return withCreators(sb, rows ?? []);
  });

/** Creates or updates a draft listing owned by the caller. */
export const saveMarketplaceAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listingInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const payload = {
      title: data.title,
      slug: `${slugify(data.title)}-${context.userId.slice(0, 8)}`,
      summary: data.description.slice(0, 200),
      description: data.description,
      category: data.category,
      tags: data.features,
      price_pence: Math.round(data.price * 100),
      version: data.version,
      required_plan: data.required_plan,
      usage_requirements: data.usage_requirements,
      revenue_share: Math.round(data.revenue_share),
      metadata: data.metadata,
      publisher_id: context.userId,
    };

    const q = data.item_id
      ? sb
          .from("marketplace_agents")
          .update(payload)
          .eq("id", data.item_id)
          .eq("publisher_id", context.userId)
      : sb.from("marketplace_agents").insert({ ...payload, status: "draft" });

    const { data: row, error } = await q.select("*").maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Listing not found");
    return toListingDTO(row);
  });

/** Moves a draft or rejected listing into the review queue. */
export const submitMarketplaceAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ item_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("marketplace_agents")
      .update({ status: "pending_review", review_notes: null })
      .eq("id", data.item_id)
      .eq("publisher_id", context.userId)
      .in("status", ["draft", "rejected"])
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Only a draft or rejected listing can be submitted");
    return toListingDTO(row);
  });

/** Publisher-side takedown: moves the listing out of the public catalogue. */
export const removeMarketplaceAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ item_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("marketplace_agents")
      .update({ status: "unlisted" })
      .eq("id", data.item_id)
      .eq("publisher_id", context.userId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Listing not found");
    return toListingDTO(row);
  });

/** Admin review queue. Requires the platform `admin` role. */
export const listReviewQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ status: z.string().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (!(await isPlatformAdmin(sb, context.userId)))
      throw new Error("You do not have permission to review listings.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;
    let q = admin
      .from("marketplace_agents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const status = data.status ? UI_TO_DB_STATUS[data.status] : undefined;
    if (status) q = q.eq("status", status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return withCreators(admin, rows ?? []);
  });

/** Admin decision on a listing: approve, reject or take down. */
export const reviewMarketplaceAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        item_id: z.string().uuid(),
        action: z.enum(["approve", "reject", "remove"]),
        notes: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (!(await isPlatformAdmin(sb, context.userId)))
      throw new Error("You do not have permission to review listings.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;

    const status =
      data.action === "approve" ? "published" : data.action === "reject" ? "rejected" : "unlisted";
    const { data: row, error } = await admin
      .from("marketplace_agents")
      .update({
        status,
        review_notes: data.notes || null,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .eq("id", data.item_id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Listing not found");

    const titles: Record<string, string> = {
      published: `${row.title} is live`,
      rejected: `${row.title} needs changes`,
      unlisted: `${row.title} was removed from the marketplace`,
    };
    await admin.from("notifications").insert({
      user_id: row.publisher_id,
      kind: `listing_${status}`,
      title: titles[status],
      body: data.notes || null,
      link: "/creator-hub",
    });
    return toListingDTO(row);
  });

/** Installs a published listing into the caller's own agent library. */
export const installMarketplaceAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ item_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: listing, error } = await sb
      .from("marketplace_agents")
      .select("*")
      .eq("id", data.item_id)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listing) throw new Error("Listing is not available");

    const config = (listing.metadata?.agent_config ?? {}) as Record<string, any>;
    const { data: agent, error: insertError } = await sb
      .from("personal_agents")
      .insert({
        user_id: context.userId,
        name: listing.title,
        category: listing.category,
        description: listing.description,
        purpose: listing.summary,
        instructions: listing.usage_requirements || null,
        model_provider: config['provider'] ?? "openai",
        model: config['model'] || "gpt-4o-mini",
        allowed_tools: Array.isArray(config['tools']) ? config['tools'] : [],
        status: "active",
      })
      .select("id,name")
      .maybeSingle();
    if (insertError) throw new Error(insertError.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as unknown as Sb)
      .from("marketplace_agents")
      .update({ install_count: Number(listing.install_count ?? 0) + 1 })
      .eq("id", listing.id);

    return { ok: true, agent };
  });

/** Rates a published listing (one review per user) and recomputes the average. */
export const rateMarketplaceAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        item_id: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("marketplace_reviews").upsert(
      {
        listing_id: data.item_id,
        user_id: context.userId,
        rating: data.rating,
        comment: data.comment ?? null,
      },
      { onConflict: "listing_id,user_id" },
    );
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as Sb;
    const { data: reviews } = await admin
      .from("marketplace_reviews")
      .select("rating")
      .eq("listing_id", data.item_id);
    const list = reviews ?? [];
    const avg = list.length
      ? list.reduce((s: number, r: any) => s + Number(r.rating), 0) / list.length
      : 0;
    await admin
      .from("marketplace_agents")
      .update({ rating_avg: Number(avg.toFixed(2)), rating_count: list.length })
      .eq("id", data.item_id);

    return { ok: true, rating: Number(avg.toFixed(2)), reviews_count: list.length };
  });

/** Aggregate publisher performance for the Creator Hub analytics tab. */
export const getCreatorStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ creator_id: z.string().uuid().nullish() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const creatorId = data.creator_id ?? context.userId;
    const { data: rows, error } = await sb
      .from("marketplace_agents")
      .select("id,title,install_count,rating_avg,price_pence,revenue_share,status")
      .eq("publisher_id", creatorId)
      .eq("status", "published");
    if (error) throw new Error(error.message);

    type CreatorAgentStat = {
      id: string;
      title: string;
      downloads: number;
      rating: number;
      earnings: number;
    };
    const agents: CreatorAgentStat[] = (rows ?? []).map((r: any) => {
      const share = (100 - Number(r.revenue_share ?? 30)) / 100;
      return {
        id: r.id as string,
        title: r.title as string,
        downloads: Number(r.install_count ?? 0),
        rating: Number(r.rating_avg ?? 0),
        earnings: Math.round((Number(r.price_pence ?? 0) / 100) * Number(r.install_count ?? 0) * share),
      };
    });

    return {
      agent_count: agents.length,
      total_downloads: agents.reduce((s, a) => s + a.downloads, 0),
      total_earnings: agents.reduce((s, a) => s + a.earnings, 0),
      agents,
    };
  });
