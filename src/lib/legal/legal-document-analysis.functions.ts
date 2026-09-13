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
import { runChat, type ChatMessage } from "@/lib/runtime/model-gateway.server";

type Sb = { from: (table: string) => any };

export const LEGAL_DOCUMENT_MODES = [
  "contract-review",
  "clause-map",
  "rights-obligations",
  "risk-ambiguity",
  "plain-language",
] as const;

export type LegalDocumentMode = (typeof LEGAL_DOCUMENT_MODES)[number];

export const LEGAL_DOCUMENT_MAX_CHARS = 40_000;
const HALF_WINDOW = LEGAL_DOCUMENT_MAX_CHARS / 2;

const input = z.object({
  document_id: z.string().uuid(),
  mode: z.enum(LEGAL_DOCUMENT_MODES),
  jurisdiction: z.string().trim().max(140).optional().default(""),
  focus: z.string().trim().max(500).optional().default(""),
});

export const LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS = `You are Blackstar Legal Document Intelligence. Analyse only the supplied document evidence. Provide legal information and document-review assistance, not legal advice. Never invent, complete, reconstruct or silently assume missing wording, clauses, schedules, parties, dates, amounts, defined terms, signatures, governing law, obligations, rights or remedies. Distinguish clearly between (1) text actually present, (2) ambiguity or conflicting drafting, and (3) material not located in the supplied evidence. If the supplied evidence is an excerpt, "not located" never means the full document lacks the provision. Do not declare a clause valid, invalid, enforceable, unenforceable, lawful, unlawful, standard, market, binding or non-binding merely from document text. Jurisdiction is context only unless authoritative current law is separately supplied. Do not invent statutes, cases, regulations or legal citations. Quote sparingly and only wording present in the evidence. Identify which party an obligation or right belongs to only where the text supports it. Flag drafting, commercial and legal-review issues as review points, not final conclusions. Preserve uncertainty. End with sections titled "Legal research required" and "Professional review".`;

export function buildDocumentEvidenceWindow(body: string) {
  const text = body.trim();
  if (text.length <= LEGAL_DOCUMENT_MAX_CHARS) {
    return { evidence: text, complete: true, omitted_chars: 0 };
  }
  const omitted = text.length - LEGAL_DOCUMENT_MAX_CHARS;
  return {
    evidence: `${text.slice(0, HALF_WINDOW)}\n\n[BLACKSTAR NOTICE: ${omitted.toLocaleString()} characters from the middle of this document were omitted from this analysis window.]\n\n${text.slice(-HALF_WINDOW)}`,
    complete: false,
    omitted_chars: omitted,
  };
}

export function modeInstructions(mode: LegalDocumentMode): string {
  const instructions: Record<LegalDocumentMode, string> = {
    "contract-review":
      "Map the document structure and identify supported terms on parties, dates, scope, payment, term/renewal, termination, warranties, liability, indemnities, confidentiality, IP, data/privacy/security, assignment, change control, force majeure, notices, governing law and dispute resolution. Highlight ambiguity, internal inconsistency, one-sided drafting and missing-information review points without claiming a missing clause unless the full document is present.",
    "clause-map":
      "Produce a clause map with clause/section heading or best available location reference, purpose, affected party, key wording/meaning, dependencies and review notes. Do not fabricate section numbers or headings.",
    "rights-obligations":
      "Create a party-by-party rights and obligations register. For each supported item identify the actor, required/permitted action, trigger, timing/deadline, conditions, consequence/remedy if expressly stated, and source location. Separate explicit duties from inferred implications.",
    "risk-ambiguity":
      "Identify drafting ambiguities, conflicting provisions, undefined or circular terms, discretionary language, uncapped or unclear exposures, operational dependencies and review questions. Describe why each item warrants review without giving a final legal conclusion.",
    "plain-language":
      "Explain the document in plain English, preserving material qualifications, exceptions, conditions and uncertainty. Separate what the document says from what would require external legal research.",
  };
  return instructions[mode];
}

export function buildLegalDocumentPrompt(args: {
  title: string;
  docType: string;
  mode: LegalDocumentMode;
  jurisdiction?: string;
  focus?: string;
  evidence: string;
  complete: boolean;
  omittedChars: number;
}) {
  return `Document title: ${args.title}\nDocument type: ${args.docType}\nReview mode: ${args.mode}\nJurisdiction supplied by user: ${args.jurisdiction || "not specified"}\nUser focus: ${args.focus || "none"}\nEvidence completeness: ${args.complete ? "full persisted text supplied within the analysis window" : `excerpt only; ${args.omittedChars} characters omitted from the middle`}\n\nMODE INSTRUCTIONS:\n${modeInstructions(args.mode)}\n\nDOCUMENT EVIDENCE:\n${args.evidence}`;
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
  let preference = null;
  try {
    const pref = await sb
      .from("user_ai_preferences")
      .select("default_provider,default_model")
      .eq("user_id", userId)
      .maybeSingle();
    if (!pref.error) preference = pref.data ?? null;
  } catch {
    preference = null;
  }
  return resolveAssistantModelPreference(preference);
}

export const analyseLegalDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => input.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await assertTaskAllowance(sb, context.userId);

    const source = await sb
      .from("user_documents")
      .select("id,title,doc_type,format,body,source,updated_at")
      .eq("id", data.document_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (source.error) throw new Error(source.error.message);
    const original = source.data;
    if (!original) throw new Error("Document not found.");
    const sourceBody = String(original.body ?? "").trim();
    if (!sourceBody) throw new Error("This document has no persisted text to analyse.");

    const window = buildDocumentEvidenceWindow(sourceBody);
    const { provider, model, source: preferenceSource } = await resolveModel(sb, context.userId);
    const messages: ChatMessage[] = [
      { role: "system", content: LEGAL_DOCUMENT_SYSTEM_INSTRUCTIONS },
      {
        role: "user",
        content: buildLegalDocumentPrompt({
          title: String(original.title ?? "Untitled document"),
          docType: String(original.doc_type ?? "document"),
          mode: data.mode,
          jurisdiction: data.jurisdiction,
          focus: data.focus,
          evidence: window.evidence,
          complete: window.complete,
          omittedChars: window.omitted_chars,
        }),
      },
    ];

    try {
      const result = await runChat({ provider, model, maxTokens: 3200, messages });
      const body = result.text.trim();
      if (!body) throw new Error("The configured model returned an empty legal document analysis.");

      const inserted = await sb
        .from("user_documents")
        .insert({
          user_id: context.userId,
          title: `${String(original.title ?? "Document")} — Legal ${data.mode.replaceAll("-", " ")}`.slice(0, 200),
          doc_type: "report",
          format: "md",
          body,
          source: "ai_legal_analysis",
          origin_document_id: original.id,
          provider: result.provider,
          model: result.model,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
        })
        .select("id,title,doc_type,format,body,source,origin_document_id,provider,model,input_tokens,output_tokens,created_at,updated_at")
        .maybeSingle();
      if (inserted.error) throw new Error(inserted.error.message);
      if (!inserted.data) throw new Error("Legal analysis could not be persisted.");

      await recordUsage({
        userId: context.userId,
        metric: "document_transform",
        quantity: 1,
        metadata: {
          action: `legal_${data.mode}`,
          origin_document_id: original.id,
          derived_document_id: inserted.data.id,
          jurisdiction: data.jurisdiction || null,
          source_complete: window.complete,
          omitted_chars: window.omitted_chars,
          provider: result.provider,
          model: result.model,
          preference_source: preferenceSource,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
        },
      });
      await writeAudit({
        userId: context.userId,
        action: `legal.document.${data.mode}`,
        targetType: "user_document",
        targetId: inserted.data.id,
        status: "success",
        metadata: {
          origin_document_id: original.id,
          jurisdiction: data.jurisdiction || null,
          source_complete: window.complete,
          omitted_chars: window.omitted_chars,
          provider: result.provider,
          model: result.model,
        },
      });

      return {
        analysis: body,
        derived_document: inserted.data,
        source_document: {
          id: original.id,
          title: original.title,
          doc_type: original.doc_type,
          updated_at: original.updated_at,
        },
        evidence: {
          complete: window.complete,
          analysed_chars: Math.min(sourceBody.length, LEGAL_DOCUMENT_MAX_CHARS),
          omitted_chars: window.omitted_chars,
        },
        provider: result.provider,
        model: result.model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Legal document analysis failed.";
      await writeAudit({
        userId: context.userId,
        action: `legal.document.${data.mode}`,
        targetType: "user_document",
        targetId: original.id,
        status: "failed",
        metadata: {
          jurisdiction: data.jurisdiction || null,
          provider,
          model,
          error: message.slice(0, 500),
        },
      });
      throw error;
    }
  });
