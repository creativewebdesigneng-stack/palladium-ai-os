import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listIntegrationCapabilities, normalizeIntegrationProvider } from "@/lib/integrations/agent-integration-runtime.server";

type Sb = { from: (table: string) => any };
const SECRET_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|cookie|credential|private[_-]?key)/i;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max) : "";
}
function assertSecretFree(value: unknown, depth = 0): void {
  if (depth > 7) throw new Error("WhatsApp CRM metadata is too deeply nested.");
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error("WhatsApp CRM metadata is too large.");
    for (const item of value) assertSecretFree(item, depth + 1);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key)) throw new Error(`Credential-like field \"${key}\" is not allowed.`);
    assertSecretFree(child, depth + 1);
  }
}
function safeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  assertSecretFree(value);
  return value as Record<string, unknown>;
}
function isWhatsAppProvider(value: unknown) {
  const provider = normalizeIntegrationProvider(value);
  return provider === "whatsapp" || provider.includes("whatsapp") || provider === "meta" || provider === "facebook";
}

export const listWhatsAppWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } = {}) => ({ limit: Math.min(Math.max(Number(input.limit ?? 100) || 100, 1), 200) }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [contacts, conversations, broadcasts] = await Promise.all([
      sb.from("crm_contacts").select("id,name,phone,email,company,stage,value_gbp,last_contacted_at").order("created_at", { ascending: false }).limit(500),
      sb.from("whatsapp_conversations").select("id,contact_id,provider,status,unread_count,last_message_at,created_at,updated_at,crm_contacts(id,name,phone,email,company,stage),whatsapp_messages(id,direction,content_type,text_content,status,created_at)").order("last_message_at", { ascending: false, nullsFirst: false }).limit(data.limit),
      sb.from("whatsapp_broadcasts").select("id,name,template_name,template_language,body_preview,status,scheduled_for,created_at,whatsapp_broadcast_recipients(id,contact_id,status)").order("created_at", { ascending: false }).limit(100),
    ]);
    for (const result of [contacts, conversations, broadcasts]) if (result.error) throw new Error(result.error.message);
    return { contacts: contacts.data ?? [], conversations: conversations.data ?? [], broadcasts: broadcasts.data ?? [] };
  });

export const listWhatsAppCapabilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows = await listIntegrationCapabilities(context.userId);
    return rows.filter((row) => isWhatsAppProvider(row.provider)).map((row) => ({
      provider: row.provider,
      action: row.action,
      description: row.description,
      risk: row.risk,
      requiresApproval: row.requiresApproval,
      deployed: row.deployed,
      transport: row.transport,
      lane: row.lane,
    }));
  });

export const openWhatsAppConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ contactId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const contact = await sb.from("crm_contacts").select("id,phone").eq("id", data.contactId).single();
    if (contact.error || !contact.data) throw contact.error ?? new Error("CRM contact not found.");
    if (!clean(contact.data.phone, 60)) throw new Error("This CRM contact needs a phone number before WhatsApp can be used.");
    const result = await sb.from("whatsapp_conversations").upsert({ user_id: context.userId, contact_id: data.contactId, provider: "whatsapp", status: "open", updated_at: new Date().toISOString() }, { onConflict: "user_id,contact_id,provider" }).select("id,contact_id,status,last_message_at").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const saveWhatsAppDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    conversationId: z.string().uuid(),
    text: z.string().trim().min(1).max(10000),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const metadata = safeRecord(data.metadata);
    const conversation = await sb.from("whatsapp_conversations").select("id,contact_id").eq("id", data.conversationId).single();
    if (conversation.error || !conversation.data) throw conversation.error ?? new Error("Conversation not found.");
    const result = await sb.from("whatsapp_messages").insert({ user_id: context.userId, conversation_id: data.conversationId, direction: "outbound", content_type: "text", text_content: clean(data.text, 10000), status: "queued", metadata }).select("id,direction,content_type,text_content,status,created_at").single();
    if (result.error) throw new Error(result.error.message);
    await sb.from("whatsapp_conversations").update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", data.conversationId);
    return result.data;
  });

export const updateWhatsAppConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["open", "pending", "closed"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from("whatsapp_conversations").update({ status: data.status, unread_count: data.status === "closed" ? 0 : undefined, updated_at: new Date().toISOString() }).eq("id", data.id).select("id,status").single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const createWhatsAppBroadcastDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name: z.string().trim().min(1).max(160),
    templateName: z.string().trim().max(160).optional(),
    templateLanguage: z.string().trim().max(40).optional(),
    bodyPreview: z.string().trim().max(2000).optional(),
    contactIds: z.array(z.string().uuid()).min(1).max(1000),
    scheduledFor: z.string().datetime().nullable().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const uniqueContactIds = [...new Set(data.contactIds)].slice(0, 1000);
    const contacts = await sb.from("crm_contacts").select("id,phone").in("id", uniqueContactIds);
    if (contacts.error) throw new Error(contacts.error.message);
    const eligible = (contacts.data ?? []).filter((row: any) => clean(row.phone, 60));
    if (!eligible.length) throw new Error("No selected CRM contacts have WhatsApp-capable phone numbers.");
    const created = await sb.from("whatsapp_broadcasts").insert({
      user_id: context.userId,
      name: clean(data.name, 160),
      template_name: clean(data.templateName, 160) || null,
      template_language: clean(data.templateLanguage, 40) || null,
      body_preview: clean(data.bodyPreview, 2000) || null,
      status: data.scheduledFor ? "scheduled" : "draft",
      scheduled_for: data.scheduledFor ?? null,
    }).select("id,name,status,scheduled_for").single();
    if (created.error) throw new Error(created.error.message);
    const recipients = eligible.map((row: any) => ({ user_id: context.userId, broadcast_id: created.data.id, contact_id: row.id, status: "pending" }));
    const inserted = await sb.from("whatsapp_broadcast_recipients").insert(recipients);
    if (inserted.error) {
      await sb.from("whatsapp_broadcasts").delete().eq("id", created.data.id);
      throw new Error(inserted.error.message);
    }
    return { ...created.data, recipientCount: recipients.length };
  });
