import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ingestDocument } from "@/lib/memory/memory.server";

type Sb = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

const idInput = z.object({ id: z.string().uuid() });
const noteInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(100_000).default(""),
  noteKind: z.enum(["note", "daily", "weekly"]).default("note"),
  lifecycle: z.enum(["active", "archived", "trash"]).default("active"),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  pinned: z.boolean().default(false),
});

function safeRows(rows: any[]) {
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? "Untitled note"),
    body: String(row.body ?? ""),
    note_kind: String(row.note_kind ?? "note"),
    lifecycle: String(row.lifecycle ?? "active"),
    tags: Array.isArray(row.tags) ? row.tags.map(String).slice(0, 30) : [],
    pinned: Boolean(row.pinned),
    knowledge_document_id: row.knowledge_document_id ? String(row.knowledge_document_id) : null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  }));
}

export const listZenNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lifecycle?: string; query?: string; limit?: number } = {}) => ({
    lifecycle: ["active", "archived", "trash"].includes(String(input.lifecycle)) ? String(input.lifecycle) : "active",
    query: String(input.query ?? "").trim().slice(0, 160),
    limit: Math.min(Math.max(Number(input.limit ?? 200) || 200, 1), 500),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let query = sb.from("zen_notes")
      .select("id,title,body,note_kind,lifecycle,tags,pinned,knowledge_document_id,created_at,updated_at")
      .eq("user_id", context.userId)
      .eq("lifecycle", data.lifecycle)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (data.query) query = query.or(`title.ilike.%${data.query.replace(/[%,()]/g, " ")}%,body.ilike.%${data.query.replace(/[%,()]/g, " ")}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { notes: safeRows(rows ?? []) };
  });

export const saveZenNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => noteInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      title: data.title,
      body: data.body,
      note_kind: data.noteKind,
      lifecycle: data.lifecycle,
      tags: [...new Set(data.tags.map((tag) => tag.toLowerCase()))],
      pinned: data.pinned,
      updated_at: new Date().toISOString(),
    };
    const result = data.id
      ? await sb.from("zen_notes").update(row).eq("id", data.id).eq("user_id", context.userId).select("*").single()
      : await sb.from("zen_notes").insert({ ...row, user_id: context.userId, org_id: null }).select("*").single();
    if (result.error) throw new Error(result.error.message);
    return { note: safeRows([result.data])[0] };
  });

export const moveZenNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), lifecycle: z.enum(["active", "archived", "trash"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("zen_notes").update({ lifecycle: data.lifecycle, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteZenNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("zen_notes").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const promoteZenNoteToKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: note, error } = await sb.from("zen_notes").select("id,title,body,knowledge_document_id").eq("id", data.id).eq("user_id", context.userId).single();
    if (error || !note) throw new Error(error?.message ?? "Note not found.");
    if (!String(note.body ?? "").trim()) throw new Error("Add note content before promoting it to Knowledge.");
    const indexed = await ingestDocument({
      sb,
      userId: context.userId,
      input: {
        title: String(note.title ?? "Untitled note"),
        text: String(note.body),
        org_id: null,
        agent_id: null,
        storage_path: null,
        mime_type: "text/markdown",
        size_bytes: String(note.body).length,
        source: `zen-note:${note.id}`,
        scope: "private",
      },
    });
    await sb.from("zen_notes").update({ knowledge_document_id: indexed.document.id, updated_at: new Date().toISOString() }).eq("id", note.id).eq("user_id", context.userId);
    return { ok: true, documentId: String(indexed.document.id), chunks: Number(indexed.chunks ?? 0) };
  });
