import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listIntegrationCapabilities, normalizeIntegrationProvider } from "@/lib/integrations/agent-integration-runtime.server";
import { writeAudit } from "@/lib/platform/audit.server";

type Sb = { from: (table: string) => any };
const SECRET_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|cookie|credential|private[_-]?key)/i;
const SUPPORT_PROVIDERS = ["email","gmail","outlook","whatsapp","facebook","instagram","telegram","line","sms","twilio","slack","shopify"];

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max) : "";
}
function assertSecretFree(value: unknown, depth = 0): void {
  if (depth > 6) throw new Error("Support configuration is too deeply nested.");
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error("Support configuration is too large.");
    for (const item of value) assertSecretFree(item, depth + 1);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key)) throw new Error(`Credential-like field \"${key}\" is not allowed.`);
    assertSecretFree(child, depth + 1);
  }
}

export const getSupportExtensions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [inboxes, articles, responses, capabilities] = await Promise.all([
      sb.from("support_inboxes").select("id,name,channel,integration_provider,integration_connection_id,business_hours,auto_assignment,status,created_at,updated_at").order("created_at", { ascending: false }).limit(100),
      sb.from("support_help_articles").select("id,title,slug,summary,locale,status,tags,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      sb.from("support_canned_responses").select("id,name,shortcut,content,created_at,updated_at").order("name").limit(100),
      listIntegrationCapabilities(context.userId),
    ]);
    for (const result of [inboxes, articles, responses]) if (result.error) throw new Error(result.error.message);
    return {
      inboxes: inboxes.data ?? [],
      articles: articles.data ?? [],
      cannedResponses: responses.data ?? [],
      capabilities: capabilities.filter((row) => {
        const provider = normalizeIntegrationProvider(row.provider);
        return SUPPORT_PROVIDERS.some((name) => provider === name || provider.includes(name));
      }).map((row) => ({ provider: row.provider, action: row.action, description: row.description, risk: row.risk, requiresApproval: row.requiresApproval, deployed: row.deployed, transport: row.transport, lane: row.lane })),
    };
  });

export const createSupportInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name: z.string().trim().min(1).max(120),
    channel: z.enum(["web","email","chat","phone","whatsapp","facebook","instagram","telegram","line","sms","api","other"]),
    integrationProvider: z.string().trim().max(100).optional(),
    integrationConnectionId: z.string().trim().max(240).optional(),
    autoAssignment: z.boolean().optional(),
    businessHours: z.record(z.string(), z.unknown()).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    assertSecretFree(data.businessHours);
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from("support_inboxes").insert({
      user_id: context.userId,
      name: clean(data.name, 120),
      channel: data.channel,
      integration_provider: clean(data.integrationProvider, 100) || null,
      integration_connection_id: clean(data.integrationConnectionId, 240) || null,
      auto_assignment: Boolean(data.autoAssignment),
      business_hours: data.businessHours ?? {},
    }).select("id,name,channel,status").single();
    if (result.error) throw new Error(result.error.message);
    await writeAudit({ userId: context.userId, orgId: null, action: "support.inbox.created", targetType: "support_inbox", targetId: result.data.id, status: "success", metadata: { channel: data.channel } });
    return result.data;
  });

export const saveSupportArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    title: z.string().trim().min(1).max(240),
    slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    summary: z.string().trim().max(1000).optional(),
    bodyMarkdown: z.string().max(100000),
    locale: z.string().trim().min(2).max(20).default("en"),
    status: z.enum(["draft","published","archived"]).default("draft"),
    tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from("support_help_articles").upsert({ user_id: context.userId, title: clean(data.title, 240), slug: data.slug, summary: clean(data.summary, 1000) || null, body_markdown: data.bodyMarkdown, locale: data.locale, status: data.status, tags: [...new Set(data.tags)], updated_at: new Date().toISOString() }, { onConflict: "user_id,slug,locale" }).select("id,title,slug,status,locale,updated_at").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const saveCannedResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ name: z.string().trim().min(1).max(120), shortcut: z.string().trim().min(1).max(60).regex(/^[/a-zA-Z0-9_-]+$/), content: z.string().trim().min(1).max(10000) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from("support_canned_responses").upsert({ user_id: context.userId, name: clean(data.name, 120), shortcut: data.shortcut, content: clean(data.content, 10000), updated_at: new Date().toISOString() }, { onConflict: "user_id,shortcut" }).select("id,name,shortcut,content").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const addPrivateTicketNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ ticketId: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const ticket = await sb.from("support_tickets").select("id").eq("id", data.ticketId).maybeSingle();
    if (ticket.error) throw new Error(ticket.error.message);
    if (!ticket.data) throw new Error("Support ticket not found or access denied.");
    const result = await sb.from("support_messages").insert({ user_id: context.userId, ticket_id: data.ticketId, body: data.body, author_role: "agent", private_note: true }).select("id,body,author_role,private_note,created_at").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });
