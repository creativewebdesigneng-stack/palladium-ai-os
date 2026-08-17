import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  defaultModelFor,
  isProviderConfigured,
  resolveAssistantModelPreference,
} from "@/lib/ai/ai-preferences.server";
import { searchPublicWeb, type WebSource } from "@/lib/ai/web-access.server";
import { ProviderError, runChat, type ChatMessage, type Provider } from "@/lib/runtime/model-gateway.server";
import { writeAudit } from "@/lib/platform/audit.server";
import { recordUsage } from "@/lib/platform/entitlements.server";

type Sb = { from: (t: string) => any };

type ResearchRun = {
  report: string;
  provider: Provider;
  model: string;
  sources: WebSource[];
  fallbackFrom?: Provider;
};

const RESEARCH_SYSTEM_PROMPT = [
  "You are PalladiumAI Research, a rigorous web research assistant.",
  "Use the supplied LIVE WEB SOURCES as the evidence base for the report.",
  "Answer the exact research question, synthesise agreements and disagreements, and distinguish facts from inference.",
  "Cite important factual claims with Markdown links using only source URLs supplied in the evidence.",
  "Never invent sources, quotes, publication dates, statistics or URLs.",
  "If the evidence is incomplete or conflicting, say so explicitly.",
  "Prefer a useful structure with a concise answer first, then key findings, caveats and a short conclusion.",
].join(" ");

function evidenceBlock(query: string, sources: WebSource[]) {
  return [
    `Research question: ${query}`,
    "LIVE WEB SOURCES:",
    ...sources.map((source, index) =>
      `[${index + 1}] ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet ?? ""}`,
    ),
  ].join("\n\n");
}

async function runResearchModel(args: {
  provider: Provider;
  model: string;
  messages: ChatMessage[];
}): Promise<Omit<ResearchRun, "sources">> {
  try {
    const result = await runChat({
      provider: args.provider,
      model: args.model,
      messages: args.messages,
      maxTokens: 1800,
    });
    const report = result.text.trim();
    if (!report) throw new ProviderError("The model returned an empty research report.", 502, true);
    return { report, provider: result.provider, model: result.model };
  } catch (primaryError) {
    const canUseGroq = args.provider !== "groq" && isProviderConfigured("groq");
    if (!canUseGroq) throw primaryError;
    const fallbackModel = defaultModelFor("groq");
    const fallback = await runChat({
      provider: "groq",
      model: fallbackModel,
      messages: args.messages,
      maxTokens: 1800,
    });
    const report = fallback.text.trim();
    if (!report) throw new ProviderError("The fallback model returned an empty research report.", 502, true);
    return {
      report,
      provider: fallback.provider,
      model: fallback.model,
      fallbackFrom: args.provider,
    };
  }
}

export const runResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) => {
    const query = String(input?.query ?? "").trim();
    if (query.length < 3) throw new Error("Enter a research question.");
    return { query: query.slice(0, 600) };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let preference: { default_provider?: unknown; default_model?: unknown } | null = null;
    try {
      const pref = await sb
        .from("user_ai_preferences")
        .select("default_provider,default_model")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!pref.error) preference = pref.data;
    } catch {
      // Deployment defaults are valid when no user preference row exists.
    }

    const { provider, model, source: preferenceSource } = resolveAssistantModelPreference(preference);
    const search = await searchPublicWeb(data.query, 8);
    const sources = search.results;
    if (!sources.length) throw new Error("No live web sources were found for that research question.");

    const messages: ChatMessage[] = [
      { role: "system", content: RESEARCH_SYSTEM_PROMPT },
      { role: "user", content: evidenceBlock(search.query || data.query, sources) },
    ];

    try {
      const result = await runResearchModel({ provider, model, messages });
      await recordUsage({
        userId: context.userId,
        metric: "assistant_message",
        quantity: 1,
        metadata: {
          surface: "research",
          provider: result.provider,
          model: result.model,
          preference_source: preferenceSource,
          fallback_from: result.fallbackFrom ?? null,
          source_count: sources.length,
        },
      });
      await writeAudit({
        userId: context.userId,
        action: "research.run",
        targetType: "research",
        status: "success",
        metadata: {
          query: data.query.slice(0, 200),
          provider: result.provider,
          model: result.model,
          sourceCount: sources.length,
          fallbackFrom: result.fallbackFrom ?? null,
        },
      });
      return { ...result, sources };
    } catch (error) {
      await writeAudit({
        userId: context.userId,
        action: "research.run",
        targetType: "research",
        status: "failed",
        metadata: {
          query: data.query.slice(0, 200),
          provider,
          model,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      if (error instanceof ProviderError && error.status === 503) {
        throw new Error("AI provider is not configured.");
      }
      throw new Error(error instanceof Error ? error.message : "Research is temporarily unavailable.");
    }
  });
