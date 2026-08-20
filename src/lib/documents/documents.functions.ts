/**
 * Documents & Reports server functions.
 *
 * Every document lives in `public.user_documents` and is read back under RLS as
 * the signed-in caller — ownership is taken from the validated bearer token
 * (`context.userId`), never from request data. AI generation and the derived
 * transforms (summarise / rewrite / translate / analyse) run through the shared
 * PalladiumAI model gateway server-side; content is persisted only after a
 * successful model result. No mock catalogue and no simulated progress exists
 * anywhere in this module.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertWithinLimit,
  EntitlementError,
  getEntitlements,
  recordUsage,
} from "@/lib/platform/entitlements.server";
import { writeAudit } from "@/lib/platform/audit.server";
import { resolveAssistantModelPreference } from "@/lib/ai/ai-preferences.server";
import { ProviderError, runChat, type ChatMessage } from "@/lib/runtime/model-gateway.server";

type Sb = { from: (t: string) => any };

const DOC_TYPES = [
  "report",
  "proposal",
  "contract",
  "presentation",
  "document",
  "research",
  "notes",
] as const;

const FORMATS = ["md", "pdf", "docx", "pptx", "csv"] as const;

const TRANSFORMS = ["summarise", "rewrite", "translate", "analyse"] as const;

const SELECT_COLUMNS =
  "id,title,doc_type,format,body,source,origin_document_id,provider,model,input_tokens,output_tokens,created_at,updated_at";

const writeInput = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  doc_type: z.enum(DOC_TYPES).default("document"),
  format: z.enum(FORMATS).default("md"),
  body: z.string().max(200_000).default(""),
});

const generateInput = z.object({
  prompt: z.string().trim().min(3).max(8000),
  title: z.string().trim().max(200).optional().or(z.literal("")),
  doc_type: z.enum(DOC_TYPES).default("document"),
  format: z.enum(FORMATS).default("md"),
});

const transformInput = z.object({
  id: z.string().uuid(),
  action: z.enum(TRANSFORMS),
  language: z.string().trim().max(60).optional().or(z.literal("")),
});

const SYSTEM_PROMPT = [
  "You are PalladiumAI's document writer working inside the operator's private workspace.",
  "Produce clean, well-structured Markdown suitable for a professional business document.",
  "Never invent metrics, citations, legal clauses, prices or named sources that were not supplied to you.",
  "When information is missing, add a clearly marked placeholder instead of fabricating a fact.",
].join(" ");

const TRANSFORM_PROMPT: Record<(typeof TRANSFORMS)[number], string> = {
  summarise:
    "Summarise the document below. Return a short executive summary followed by the key points as a bullet list. Do not add facts that are not in the source.",
  rewrite:
    "Rewrite the document below for clarity, tone and concision while preserving every fact, figure and commitment exactly as written.",
  translate:
    "Translate the document below faithfully, preserving Markdown structure, names, numbers and units.",
  analyse:
    "Analyse the document below. Return key insights, risks, open questions and recommended next steps, each as a short bullet list, grounded only in the source text.",
};

const TRANSFORM_TITLE: Record<(typeof TRANSFORMS)[number], string> = {
  summarise: "Summary",
  rewrite: "Rewrite",
  translate: "Translation",
  analyse: "Analysis",
};

/** Sanitised, honest provider failure surface — never leaks keys or raw provider payloads. */
function providerFailure(error: unknown): Error {
  if (error instanceof ProviderError) {
    if (error.status === 429) {
      return new Error("The AI provider is rate limiting this workspace. Please retry shortly.");
    }
    if (error.status === 503) return new Error("No AI provider is configured for this deployment.");
    if (error.status === 502) return new Error("The AI provider returned an empty document.");
  }
  return new Error("AI service temporarily unavailable.");
}

async function assertTaskAllowance(sb: Sb, userId: string) {
  try {
    const entitlements = await getEntitlements(sb as any, userId);
    assertWithinLimit(entitlements, "tasks_per_month");
  } catch (error) {
    if (error instanceof EntitlementError) throw new Error(error.message);
    throw error;
  }
}

async function resolveModel(sb: Sb, userId: string) {
  let preference: { default_provider?: unknown; default_model?: unknown } | null = null;
  try {
    const pref = await sb
      .from("user_ai_preferences")
      .select("default_provider,default_model")
      .eq("user_id", userId)
      .maybeSingle();
    preference = pref.data ?? null;
  } catch {
    preference = null;
  }
  return resolveAssistantModelPreference(preference);
}

/** Metrics are derived only from rows that really exist for this owner. */
export function documentMetrics(rows: Array<Record<string, any>>) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const aiSources = new Set([
    "ai_generated",
    "ai_summarise",
    "ai_rewrite",
    "ai_translate",
    "ai_analyse",
  ]);
  return {
    total: rows.length,
    aiGenerated: rows.filter((row) => aiSources.has(String(row["source"]))).length,
    derived: rows.filter((row) => Boolean(row["origin_document_id"])).length,
    updatedThisWeek: rows.filter((row) => new Date(row["updated_at"] ?? 0).getTime() >= weekAgo).length,
    words: rows.reduce(
      (sum, row) => sum + String(row["body"] ?? "").split(/\s+/).filter(Boolean).length,
      0,
    ),
  };
}

export const listDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const res = await sb
      .from("user_documents")
      .select(SELECT_COLUMNS)
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (res.error) throw new Error(res.error.message);
    const documents = (res.data ?? []) as Array<Record<string, any>>;
    return { documents, metrics: documentMetrics(documents) };
  });

export const getDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const res = await sb
      .from("user_documents")
      .select(SELECT_COLUMNS)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    if (!res.data) throw new Error("Document not found.");
    return res.data;
  });

export const saveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => writeInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const fields = {
      title: data.title,
      doc_type: data.doc_type,
      format: data.format,
      body: data.body,
    };

    let row: Record<string, any> | null = null;
    if (data.id) {
      const updated = await sb
        .from("user_documents")
        .update(fields)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select(SELECT_COLUMNS)
        .maybeSingle();
      if (updated.error) throw new Error(updated.error.message);
      row = updated.data ?? null;
      if (!row) throw new Error("Document not found.");
    } else {
      const inserted = await sb
        .from("user_documents")
        .insert({ ...fields, user_id: context.userId, source: "manual" })
        .select(SELECT_COLUMNS)
        .maybeSingle();
      if (inserted.error) throw new Error(inserted.error.message);
      row = inserted.data ?? null;
      if (!row) throw new Error("Document could not be saved.");
    }

    await writeAudit({
      userId: context.userId,
      action: data.id ? "document.updated" : "document.created",
      targetType: "user_document",
      targetId: row["id"],
      status: "success",
      metadata: { doc_type: row["doc_type"], format: row["format"] },
    });
    return row;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const deleted = await sb
      .from("user_documents")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("id")
      .maybeSingle();
    if (deleted.error) throw new Error(deleted.error.message);
    if (!deleted.data) throw new Error("Document not found.");
    await writeAudit({
      userId: context.userId,
      action: "document.deleted",
      targetType: "user_document",
      targetId: data.id,
      status: "success",
    });
    return { ok: true };
  });

/** Real AI generation. The row is written only after the model returns content. */
export const generateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => generateInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertTaskAllowance(sb, context.userId);
    const { provider, model, source: preferenceSource } = await resolveModel(sb, context.userId);

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Write a ${data.doc_type} in Markdown.\n\nBrief:\n${data.prompt}\n\nStart with a single H1 title line.`,
      },
    ];

    try {
      const result = await runChat({ provider, model, messages, maxTokens: 2200 });
      const body = result.text.trim();
      if (!body) throw new ProviderError("The model returned an empty document.", 502, true);

      const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
      const title = (data.title || heading || data.prompt).slice(0, 200);

      const inserted = await sb
        .from("user_documents")
        .insert({
          user_id: context.userId,
          title,
          doc_type: data.doc_type,
          format: data.format,
          body,
          source: "ai_generated",
          provider: result.provider,
          model: result.model,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
        })
        .select(SELECT_COLUMNS)
        .maybeSingle();
      if (inserted.error) throw new Error(inserted.error.message);

      await recordUsage({
        userId: context.userId,
        metric: "document_generation",
        quantity: 1,
        metadata: {
          doc_type: data.doc_type,
          provider: result.provider,
          model: result.model,
          preference_source: preferenceSource,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
        },
      });
      await writeAudit({
        userId: context.userId,
        action: "document.generated",
        targetType: "user_document",
        targetId: inserted.data?.id,
        status: "success",
        metadata: { provider: result.provider, model: result.model, doc_type: data.doc_type },
      });
      return inserted.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI service temporarily unavailable.";
      console.error("[documents] generation failed", message);
      await writeAudit({
        userId: context.userId,
        action: "document.generated",
        targetType: "user_document",
        status: "failed",
        metadata: { provider, model, error: message.slice(0, 500) },
      });
      if (error instanceof ProviderError) throw providerFailure(error);
      throw error;
    }
  });

/** Real summarise / rewrite / translate / analyse against a persisted document. */
export const transformDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => transformInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertTaskAllowance(sb, context.userId);

    const sourceRes = await sb
      .from("user_documents")
      .select(SELECT_COLUMNS)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (sourceRes.error) throw new Error(sourceRes.error.message);
    const original = sourceRes.data;
    if (!original) throw new Error("Document not found.");
    if (!String(original.body ?? "").trim()) {
      throw new Error("This document has no content to work with yet.");
    }

    const { provider, model, source: preferenceSource } = await resolveModel(sb, context.userId);
    const language = data.language ? ` Target language: ${data.language}.` : "";
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${TRANSFORM_PROMPT[data.action]}${language}\n\n--- DOCUMENT: ${original.title} ---\n${String(original.body).slice(0, 40_000)}`,
      },
    ];

    try {
      const result = await runChat({ provider, model, messages, maxTokens: 1800 });
      const body = result.text.trim();
      if (!body) throw new ProviderError("The model returned an empty result.", 502, true);

      const inserted = await sb
        .from("user_documents")
        .insert({
          user_id: context.userId,
          title: `${original.title} — ${TRANSFORM_TITLE[data.action]}`.slice(0, 200),
          doc_type: original.doc_type,
          format: "md",
          body,
          source: `ai_${data.action}`,
          origin_document_id: original.id,
          provider: result.provider,
          model: result.model,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
        })
        .select(SELECT_COLUMNS)
        .maybeSingle();
      if (inserted.error) throw new Error(inserted.error.message);

      await recordUsage({
        userId: context.userId,
        metric: "document_transform",
        quantity: 1,
        metadata: {
          action: data.action,
          origin_document_id: original.id,
          provider: result.provider,
          model: result.model,
          preference_source: preferenceSource,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
        },
      });
      await writeAudit({
        userId: context.userId,
        action: `document.${data.action}`,
        targetType: "user_document",
        targetId: inserted.data?.id,
        status: "success",
        metadata: { origin: original.id, provider: result.provider, model: result.model },
      });
      return inserted.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI service temporarily unavailable.";
      console.error("[documents] transform failed", data.action, message);
      await writeAudit({
        userId: context.userId,
        action: `document.${data.action}`,
        targetType: "user_document",
        targetId: original.id,
        status: "failed",
        metadata: { provider, model, error: message.slice(0, 500) },
      });
      if (error instanceof ProviderError) throw providerFailure(error);
      throw error;
    }
  });