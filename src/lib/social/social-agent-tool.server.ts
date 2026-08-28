import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import type { ToolContext } from "@/lib/runtime/tools.server";
import {
  listIntegrationCapabilities,
  normalizeIntegrationProvider,
} from "@/lib/integrations/agent-integration-runtime.server";

const SOCIAL_PROVIDERS = new Set([
  "instagram", "facebook", "tiktok", "linkedin", "youtube", "x", "twitter",
  "threads", "pinterest", "bluesky", "mastodon", "discord", "telegram",
]);
const SECRET_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|cookie|credential|private[_-]?key)/i;

export const SOCIAL_OPS_TOOL_DEF: ToolDef = {
  name: "social_ops",
  description:
    "Manage PalladiumAI social content plans and schedules, and discover live social integration actions. This tool never accepts provider credentials and does not bypass integration_action approvals for external publishing.",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["list_posts", "create_post", "schedule_post", "list_capabilities"] },
      post_id: { type: "string" },
      title: { type: "string", maxLength: 200 },
      content: { type: "string", maxLength: 20000 },
      campaign: { type: "string", maxLength: 120 },
      scheduled_for: { type: "string", description: "ISO date/time. Use an empty value to return a post to draft." },
      limit: { type: "integer", minimum: 1, maximum: 100 },
    },
    required: ["action"],
    additionalProperties: false,
  },
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function assertNoSecretKeys(input: Record<string, unknown>): void {
  for (const key of Object.keys(input)) {
    if (SECRET_KEY.test(key)) throw new Error(`Credential-like field "${key}" is not allowed.`);
  }
}

function iso(value: unknown): string | null {
  const raw = text(value, 80);
  if (!raw) return null;
  const time = Date.parse(raw);
  if (Number.isNaN(time)) throw new Error("scheduled_for must be a valid ISO date/time.");
  return new Date(time).toISOString();
}

export async function runSocialOpsTool(input: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
  assertNoSecretKeys(input);
  const sb = ctx.sb as any;
  const action = text(input["action"], 40);

  if (action === "list_capabilities") {
    const capabilities = await listIntegrationCapabilities(ctx.userId);
    const social = capabilities.filter((item) => SOCIAL_PROVIDERS.has(normalizeIntegrationProvider(item.provider)));
    return {
      count: social.length,
      capabilities: social,
      note: "Use the existing integration_action tool for external publication. Its live schema, transport pinning and operator approvals remain authoritative.",
    };
  }

  if (action === "list_posts") {
    const limit = Math.min(Math.max(Number(input["limit"] ?? 50) || 50, 1), 100);
    const { data, error } = await sb
      .from("social_posts")
      .select("id,title,content,campaign,status,scheduled_for,published_at,created_at,social_post_targets(provider,action,status)")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { posts: data ?? [], count: data?.length ?? 0 };
  }

  if (action === "create_post") {
    const content = text(input["content"], 20_000);
    if (!content) throw new Error("content is required.");
    const scheduledFor = iso(input["scheduled_for"]);
    const { data, error } = await sb
      .from("social_posts")
      .insert({
        user_id: ctx.userId,
        org_id: ctx.orgId,
        title: text(input["title"], 200),
        content,
        campaign: text(input["campaign"], 120) || null,
        status: scheduledFor ? "scheduled" : "draft",
        scheduled_for: scheduledFor,
        created_by_agent_id: ctx.agentId,
      })
      .select("id,title,status,scheduled_for")
      .single();
    if (error) throw error;
    return { created: true, post: data };
  }

  if (action === "schedule_post") {
    const postId = text(input["post_id"], 60);
    if (!/^[0-9a-f-]{36}$/i.test(postId)) throw new Error("A valid post_id is required.");
    const scheduledFor = iso(input["scheduled_for"]);
    const { data, error } = await sb
      .from("social_posts")
      .update({
        status: scheduledFor ? "scheduled" : "draft",
        scheduled_for: scheduledFor,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("user_id", ctx.userId)
      .in("status", ["draft", "scheduled", "failed", "cancelled"])
      .select("id,status,scheduled_for")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("The post was not found or cannot be rescheduled in its current state.");
    return { updated: true, post: data };
  }

  throw new Error("Unsupported social_ops action.");
}
