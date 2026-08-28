import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };

const sourceKinds = ["text","markdown","csv","json","sql","note","file"] as const;
const surfaces = ["document","report","poster","deck","social","prototype","resume","frame"] as const;
const docInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  sourceKind: z.enum(sourceKinds).default("text"),
  sourceText: z.string().max(500_000).default(""),
  html: z.string().max(1_000_000).default(""),
  surface: z.enum(surfaces).default("document"),
  status: z.enum(["draft","ready","archived"]).default("draft"),
  sourceNoteId: z.string().uuid().nullable().optional(),
});

function dto(row: any) {
  return {
    id: String(row.id),
    title: String(row.title ?? "Untitled HTML"),
    source_kind: String(row.source_kind ?? "text"),
    source_text: String(row.source_text ?? ""),
    html: String(row.html ?? ""),
    surface: String(row.surface ?? "document"),
    status: String(row.status ?? "draft"),
    source_note_id: row.source_note_id ? String(row.source_note_id) : null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export const listHtmlStudioDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } = {}) => ({ limit: Math.min(Math.max(Number(input.limit ?? 100) || 100, 1), 200) }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb.from("html_studio_documents")
      .select("id,title,source_kind,source_text,html,surface,status,source_note_id,created_at,updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { documents: (rows ?? []).map(dto) };
  });

export const saveHtmlStudioDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => docInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      title: data.title,
      source_kind: data.sourceKind,
      source_text: data.sourceText,
      html: data.html,
      surface: data.surface,
      status: data.status,
      source_note_id: data.sourceNoteId ?? null,
      updated_at: new Date().toISOString(),
    };
    const result = data.id
      ? await sb.from("html_studio_documents").update(row).eq("id", data.id).eq("user_id", context.userId).select("*").single()
      : await sb.from("html_studio_documents").insert({ ...row, user_id: context.userId, org_id: null }).select("*").single();
    if (result.error) throw new Error(result.error.message);
    return { document: dto(result.data) };
  });

export const createHtmlFromZenNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ noteId: z.string().uuid(), surface: z.enum(surfaces).default("document") }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: note, error } = await sb.from("zen_notes").select("id,title,body").eq("id", data.noteId).eq("user_id", context.userId).single();
    if (error || !note) throw new Error(error?.message ?? "Note not found.");
    const { data: created, error: createError } = await sb.from("html_studio_documents").insert({
      user_id: context.userId,
      org_id: null,
      title: String(note.title ?? "Untitled note"),
      source_kind: "note",
      source_text: String(note.body ?? ""),
      html: "",
      surface: data.surface,
      status: "draft",
      source_note_id: note.id,
    }).select("*").single();
    if (createError) throw new Error(createError.message);
    return { document: dto(created) };
  });
