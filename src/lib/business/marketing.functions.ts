/**
 * Marketing server functions — campaigns persist in `marketing_campaigns` and
 * every rate shown in the UI is derived from the stored counters.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (t: string) => any };

const campaignInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  channel: z.enum(["email", "social", "search", "content", "events", "other"]).default("email"),
  status: z.enum(["draft", "scheduled", "active", "paused", "completed"]).default("draft"),
  budget: z.coerce.number().min(0).max(1_000_000_000).default(0),
  spend: z.coerce.number().min(0).max(1_000_000_000).default(0),
  impressions: z.coerce.number().int().min(0).default(0),
  clicks: z.coerce.number().int().min(0).default(0),
  conversions: z.coerce.number().int().min(0).default(0),
});

export const listCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("marketing_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const campaigns = (data ?? []) as any[];
    const total = (key: string) => campaigns.reduce((s, c) => s + Number(c[key] ?? 0), 0);
    const impressions = total("impressions");
    const clicks = total("clicks");
    const conversions = total("conversions");
    const spend = total("spend");

    return {
      campaigns,
      summary: {
        count: campaigns.length,
        active: campaigns.filter((c) => c.status === "active").length,
        budget: total("budget"),
        spend,
        impressions,
        clicks,
        conversions,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : null,
        costPerConversion: conversions > 0 ? spend / conversions : null,
      },
    };
  });

export const saveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => campaignInput.parse(data))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { id, ...row } = data;
    if (id) {
      const { data: updated, error } = await sb
        .from("marketing_campaigns")
        .update(row)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: created, error } = await sb
      .from("marketing_campaigns")
      .insert({
        ...row,
        user_id: context.userId,
        started_at: row.status === "active" ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return created;
  });

export const setCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["draft", "scheduled", "active", "paused", "completed"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "active") patch['started_at'] = new Date().toISOString();
    if (data.status === "completed") patch['ended_at'] = new Date().toISOString();
    const { data: updated, error } = await sb
      .from("marketing_campaigns")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("marketing_campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
