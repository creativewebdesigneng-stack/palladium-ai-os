/**
 * General-purpose workspace assistant with real provider execution and optional
 * live-web grounding for time-sensitive questions.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertWithinLimit,
  EntitlementError,
  getEntitlements,
  recordUsage,
} from "@/lib/platform/entitlements.server";
import { writeAudit } from "@/lib/platform/audit.server";
import {
  defaultModelFor,
  isProviderConfigured,
  resolveAssistantModelPreference,
} from "@/lib/ai/ai-preferences.server";
import { searchPublicWeb, type WebSource } from "@/lib/ai/web-access.server";
import { ProviderError, runChat, type ChatMessage, type Provider } from "@/lib/runtime/model-gateway.server";

const SYSTEM_PROMPT = [
  "You are PalladiumAI, a capable general-purpose AI assistant built into the PalladiumAI platform.",
  "Answer the user's question directly and helpfully across general knowledge, science, technology, coding, writing, maths, business, planning, brainstorming, education and everyday questions.",
  "You can also help with the user's PalladiumAI workspace, including agents, tasks, workflows, memory, billing and integrations.",
  "Do not refuse or redirect a question merely because it is unrelated to PalladiumAI.",
  "When LIVE WEB CONTEXT is supplied, use it for claims that could have changed and cite supporting sources with Markdown links using only URLs present in that context.",
  "Do not invent citations or claim you searched the web when no live web context is supplied.",
  "For private workspace data that has not been provided to you, clearly say what you do not know rather than inventing facts.",
  "Be accurate, useful and concise by default, while giving more detail when the user asks for it.",
  "Never invent workspace metrics, results or record counts.",
].join(" ");

type Turn = { role: "user" | "assistant"; content: string };

type AssistantRun = {
  text: string;
  provider: Provider;
  model: string;
  usage: { input: number; output: number };
  fallbackFrom?: Provider;
};

const LIVE_WEB_PATTERN = /\b(latest|current|currently|today|tonight|yesterday|tomorrow|recent|recently|right now|at the moment|breaking|news|update|updated|price|prices|cost today|weather|forecast|score|scores|result|results|fixture|fixtures|schedule|standings|stock|share price|crypto|bitcoin|exchange rate|election|poll|president|prime minister|ceo|law|laws|regulation|regulations|release date|latest version|newest version|search the web|search online|look up|lookup|browse|verify online|check online|find online|on the internet)\b/i;

export function shouldUseLiveWeb(message: string): boolean {
  return LIVE_WEB_PATTERN.test(message);
}

function webContextBlock(query: string, sources: WebSource[]): string {
  if (!sources.length) return "";
  const lines = sources.map((source, index) =>
    `[${index + 1}] ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet ?? ""}`,
  );
  return [
    "LIVE WEB CONTEXT",
    `Search query: ${query}`,
    "Use these results as current external evidence. Treat snippets as partial and do not infer unsupported details.",
    ...lines,
  ].join("\n\n");
}

async function runAssistantWithFallback(args: {
  provider: Provider;
  model: string;
  messages: ChatMessage[];
}): Promise<AssistantRun> {
  try {
    const primary = await runChat({
      provider: args.provider,
      model: args.model,
      messages: args.messages,
      maxTokens: 1100,
    });
    const text = primary.text.trim();
    if (!text) throw new ProviderError("The model returned an empty response.", 502, true);
    return { text, provider: primary.provider, model: primary.model, usage: primary.usage };
  } catch (primaryError) {
    const canUseGroq = args.provider !== "groq" && isProviderConfigured("groq");
    if (!canUseGroq) throw primaryError;
    console.warn(
      "[assistant] primary provider failed; retrying with Groq",
      args.provider,
      primaryError instanceof Error ? primaryError.message : String(primaryError),
    );
    const fallbackModel = defaultModelFor("groq");
    const fallback = await runChat({
      provider: "groq",
      model: fallbackModel,
      messages: args.messages,
      maxTokens: 1100,
    });
    const text = fallback.text.trim();
    if (!text) throw new ProviderError("The fallback model returned an empty response.", 502, true);
    return {
      text,
      provider: fallback.provider,
      model: fallback.model,
      usage: fallback.usage,
      fallbackFrom: args.provider,
    };
  }
}

/** Runs one real assistant turn. Throws with a safe message on provider failure. */
export const assistantChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string; history?: Turn[] }) => {
    const message = String(input?.message ?? "").trim();
    if (!message) throw new Error("A message is required.");
    const history = Array.isArray(input?.history) ? input.history.slice(-8) : [];
    return {
      message: message.slice(0, 4000),
      history: history
        .filter((t) => t && (t.role === "user" || t.role === "assistant") && t.content)
        .map((t) => ({ role: t.role, content: String(t.content).slice(0, 4000) })),
    };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as {
      from: (t: string) => any;
      rpc: (fn: string, args?: Record<string, unknown>) => any;
    };

    let entitlements;
    try {
      entitlements = await getEntitlements(sb, context.userId);
      assertWithinLimit(entitlements, "tasks_per_month");
    } catch (error) {
      if (error instanceof EntitlementError) throw new Error(error.message);
      throw error;
    }

    let storedPreference: { default_provider?: unknown; default_model?: unknown } | null = null;
    try {
      const preferenceResult = await sb
        .from("user_ai_preferences")
        .select("default_provider,default_model")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (preferenceResult.error) {
        console.warn("[assistant] AI preference lookup failed; using deployment default", preferenceResult.error.message);
      } else {
        storedPreference = preferenceResult.data;
      }
    } catch (error) {
      console.warn("[assistant] AI preference lookup unavailable; using deployment default", error);
    }

    const { provider, model, source: preferenceSource } = resolveAssistantModelPreference(storedPreference);

    let webSources: WebSource[] = [];
    let webSearchAttempted = false;
    if (shouldUseLiveWeb(data.message)) {
      webSearchAttempted = true;
      try {
        const web = await searchPublicWeb(data.message, 6);
        webSources = web.results;
      } catch (error) {
        console.warn("[assistant] live web search unavailable", error);
      }
    }

    const webContext = webContextBlock(data.message, webSources);
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(webContext ? [{ role: "system" as const, content: webContext }] : []),
      ...data.history.map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
      { role: "user", content: data.message },
    ];

    try {
      const result = await runAssistantWithFallback({ provider, model, messages });
      await recordUsage({
        userId: context.userId,
        metric: "assistant_message",
        quantity: 1,
        metadata: {
          provider: result.provider,
          model: result.model,
          preference_source: preferenceSource,
          fallback_from: result.fallbackFrom ?? null,
          live_web_attempted: webSearchAttempted,
          live_web_sources: webSources.length,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
        },
      });
      await writeAudit({
        userId: context.userId,
        action: "assistant.message",
        targetType: "assistant",
        status: "success",
        metadata: {
          provider: result.provider,
          model: result.model,
          preferenceSource,
          fallbackFrom: result.fallbackFrom ?? null,
          liveWebAttempted: webSearchAttempted,
          liveWebSources: webSources.length,
        },
      });
      return {
        text: result.text,
        provider: result.provider,
        model: result.model,
        sources: webSources.map(({ title, url }) => ({ title, url })),
        webSearchAttempted,
      };
    } catch (error) {
      const status = error instanceof ProviderError ? error.status : 500;
      console.error("[assistant] provider failure", status, error);
      await writeAudit({
        userId: context.userId,
        action: "assistant.message",
        targetType: "assistant",
        status: "failed",
        metadata: {
          provider,
          model,
          preferenceSource,
          status,
          liveWebAttempted: webSearchAttempted,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      if (status === 503) throw new Error("AI provider is not configured.");
      throw new Error("AI service temporarily unavailable.");
    }
  });
