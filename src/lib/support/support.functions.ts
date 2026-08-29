import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listIntegrationCapabilities, normalizeIntegrationProvider } from "@/lib/integrations/agent-integration-runtime.server";
import { writeAudit } from "@/lib/platform/audit.server";

type Sb = { from: (table: string) => any };
const SECRET_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|cookie|credential|private[_-]?key)/i;
const SUPPORT_PROVIDERS = new Set(["email", "gmail", "outlook", "whatsapp", "facebook", "instagram", "telegram", "line", "sms", "twilio", "slack", "shopify"]);

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max) : "";
}
function assertSecretFree(value: unknown, depth = 0): void {
  if (depth > 6) throw new Error("Support metadata is too deeply nested.");
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error("Support metadata is too large.");
    for (const item of value) assertSecretFree(item, depth + 1);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key)) throw new Error(`Credential-like field \"${key}\" is not allowed.`);
    assertSecretFree(child, depth + 1);
  }
}

export const getCustomerSupportOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [inboxes, conversations, articles, canned, capabilities] = await Promise.all([
      sb.from("support_inboxes").select("id,name,channel,integration_provider,integration_connection_id,business_hours,auto_assignment,status,created_at,updated_at").order("created_at", { ascending: false }).limit(100),
      sb.from("support_conversations").select("id,inbox_id,contact_id,external_thread_id,subject,status,priority,assigned_agent_id,assigned_team,labels,unread_count,last_message_at,created_at,crm_contacts(id,name,email,phone,company),support_messages(id,direction,author_type,content,private_note,status,created_at)").order("last_message_at", { ascending: false, nullsFirst: false }).limit(100),
      sb.from("support_help_articles").select("id,title,slug,summary,locale,status,tags,created_at,updated_at").order("updated_at", { ascending: false }).limit(100),
      sb.from("support_canned_responses").select("id,name,shortcut,content,created_at,updated_at").order("name").limit(100),
      listIntegrationCapabilities(context.userId),
    ]);
    for (const result of [inboxes, conversations, articles, canned]) if (result.error) throw new Error(result.error.message);
    const supportCapabilities = capabilities.filter((row) => {
      const provider = normalizeIntegrationProvider(row.provider);
      return SUPPORT_PROVIDERS.has(provider) || [...SUPPORT_PROVIDERS].some((name) => provider.includes(name));
    }).map((row) => ({ provider: row.provider, action: row.action, description: row.description, risk: row.risk, requiresApproval: row.requiresApproval, deployed: row.deployed, transport: row.transport, lane: row.lane }));
    return { inboxes: inboxes.data ?? [], conversations: conversations.data ?? [], articles: articles.data ?? [], cannedResponses: canned.data ?? [], capabilities: supportCapabilities };
  });

export const createSupportInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name: z.string().trim().min(1).max(120),
    channel: z.enum(["web","email","whatsapp","facebook","instagram","telegram","line","sms","api","other"]),
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

export const openSupportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ inboxId: z.string().uuid().nullable().optional(), contactId: z.string().uuid().nullable().optional(), subject: z.string().trim().max(240).optional(), priority: z.enum(["low","normal","high","urgent"]).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (data.contactId) {
      const contact = await sb.from("crm_contacts").select("id").eq("id", data.contactId).maybeSingle();
      if (contact.error) throw new Error(contact.error.message);
      if (!contact.data) throw new Error("CRM contact not found or access denied.");
    }
    if (data.inboxId) {
      const inbox = await sb.from("support_inboxes").select("id").eq("id", data.inboxId).maybeSingle();
      if (inbox.error) throw new Error(inbox.error.message);
      if (!inbox.data) throw new Error("Support inbox not found or access denied.");
    }
    const result = await sb.from("support_conversations").insert({ user_id: context.userId, inbox_id: data.inboxId ?? null, contact_id: data.contactId ?? null, subject: clean(data.subject, 240) || null, priority: data.priority ?? "normal", status: "open", last_message_at: new Date().toISOString() }).select("id,subject,status,priority,created_at").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const addSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: z.string().uuid(), content: z.string().trim().min(1).max(20000), privateNote: z.boolean().optional(), authorType: z.enum(["human","agent"]).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const conversation = await sb.from("support_conversations").select("id").eq("id", data.conversationId).maybeSingle();
    if (conversation.error) throw new Error(conversation.error.message);
    if (!conversation.data) throw new Error("Support conversation not found or access denied.");
    const result = await sb.from("support_messages").insert({ user_id: context.userId, conversation_id: data.conversationId, direction: data.privateNote ? "internal" : "outbound", author_type: data.authorType ?? "human", content: clean(data.content, 20000), private_note: Boolean(data.privateNote), status: data.privateNote ? "created" : "queued" }).select("id,direction,author_type,content,private_note,status,created_at").single();
    if (result.error) throw new Error(result.error.message);
    await sb.from("support_conversations").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", data.conversationId);
    return result.data;
  });

export const updateSupportConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["open","pending","resolved","snoozed"]).optional(), priority: z.enum(["low","normal","high","urgent"]).optional(), assignedTeam: z.string().trim().max(120).nullable().optional(), labels: z.array(z.string().trim().min(1).max(60)).max(30).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.status) patch.status = data.status;
    if (data.priority) patch.priority = data.priority;
    if (data.assignedTeam !== undefined) patch.assigned_team = clean(data.assignedTeam, 120) || null;
    if (data.labels) patch.labels = [...new Set(data.labels.map((label) => clean(label, 60)).filter(Boolean))];
    const result = await sb.from("support_conversations").update(patch).eq("id", data.id).select("id,status,priority,assigned_team,labels").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const saveSupportArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid().optional(), title: z.string().trim().min(1).max(240), slug: z.string().trim().min(1).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), summary: z.string().trim().max(1000).optional(), bodyMarkdown: z.string().max(100000), locale: z.string().trim().min(2).max(20).optional(), status: z.enum(["draft","published","archived"]), tags: z.array(z.string().trim().min(1).max(60)).max(30).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const record = { user_id: context.userId, title: clean(data.title, 240), slug: data.slug, summary: clean(data.summary, 1000) || null, body_markdown: data.bodyMarkdown, locale: data.locale ?? "en", status: data.status, tags: [...new Set(data.tags ?? [])], updated_at: new Date().toISOString() };
    const query = data.id ? sb.from("support_help_articles").update(record).eq("id", data.id) : sb.from("support_help_articles").insert(record);
    const result = await query.select("id,title,slug,status,locale,updated_at").single();
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
