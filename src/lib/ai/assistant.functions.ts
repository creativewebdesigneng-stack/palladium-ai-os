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
import { searchPublicWeb, type LiveLocation, type WebSource } from "@/lib/ai/web-access.server";
import { ProviderError, runChat, type ChatMessage, type Provider } from "@/lib/runtime/model-gateway.server";

const SYSTEM_PROMPT = [
  "You are Blackstar, a capable general-purpose AI personal assistant built into the Blackstar intelligence platform.",
  "Answer the user's question directly and helpfully across general knowledge, science, technology, coding, writing, maths, business, planning, brainstorming, education and everyday questions.",
  "You can also help with the user's Blackstar workspace, including agents, tasks, workflows, memory, billing and integrations.",
  "Do not refuse or redirect a question merely because it is unrelated to Blackstar.",
  "Blackstar has live external-information capability. For questions about weather, news, prices, sports, politics, laws, releases, current office-holders or anything else that can change, use supplied LIVE WEB CONTEXT as the source of truth.",
  "When LIVE WEB CONTEXT is supplied, never say that you lack live information, internet access, browsing access, real-time data or current information. Answer from the supplied live evidence and cite supporting sources with Markdown links using only URLs present in that context.",
  "If a live lookup was requested but no live evidence is supplied, say that the live lookup is temporarily unavailable; do not imply that Blackstar is fundamentally unable to access live information.",
  "Do not invent citations or claim a live lookup succeeded when no live evidence is supplied.",
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

const LIVE_WEB_PATTERN = /\b(latest|current|currently|today|tonight|yesterday|tomorrow|recent|recently|right now|at the moment|breaking|news|update|updated|price|prices|cost today|weather|forecast|temperature|rain|snow|wind|score|scores|result|results|fixture|fixtures|schedule|standings|stock|share price|crypto|bitcoin|exchange rate|election|poll|president|prime minister|ceo|law|laws|regulation|regulations|release date|latest version|newest version|search the web|search online|look up|lookup|browse|verify online|check online|find online|on the internet)\b/i;

export function shouldUseLiveWeb(message: string): boolean {
  return LIVE_WEB_PATTERN.test(message);
}

function webContextBlock(query: string, sources: WebSource[], attempted: boolean): string {
  if (!sources.length) {
    return attempted
      ? [
          "LIVE WEB STATUS",
          `Search query: ${query}`,
          "A live lookup was attempted for this request but no current external evidence was returned. Explain that the live lookup is temporarily unavailable if current facts are required. Do not say Blackstar permanently lacks internet or live-data capability.",
        ].join("\n\n")
      : "";
  }
  const lines = sources.map((source, index) =>
    `[${index + 1}] ${source.title}\nURL: ${source.url}\nSnippet: ${source.snippet ?? ""}`,
  );
  return [
    "LIVE WEB CONTEXT",
    `Search query: ${query}`,
    "This is current external evidence obtained for this turn. Use it for time-sensitive claims. Treat snippets as partial and do not infer unsupported details.",
    ...lines,
  ].join("\n\n");
}

function parseLocation(input: unknown): LiveLocation | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const latitude = Number(raw["latitude"]);
  const longitude = Number(raw["longitude"]);
  const accuracy = Number(raw["accuracy"]);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return {
    latitude,
    longitude,
    ...(Number.isFinite(accuracy) && accuracy >= 0 ? { accuracy } : {}),
  };
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
  .inputValidator((input: { message: string; history?: Turn[]; location?: unknown }) => {
    const message = String(input?.message ?? "").trim();
    if (!message) throw new Error("A message is required.");
    const history = Array.isArray(input?.history) ? input.history.slice(-8) : [];
    const location = parseLocation(input?.location);
    return {
      message: message.slice(0, 4000),
      history: history
        .filter((t) => t && (t.role === "user" || t.role === "assistant") && t.content)
        .map((t) => ({ role: t.role, content: String(t.content).slice(0, 4000) })),
      location,
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
        const web = await searchPublicWeb(data.message, 6, undefined, data.location ?? undefined);
        webSources = web.results;
      } catch (error) {
        console.warn("[assistant] live web search unavailable", error);
      }
    }

    const webContext = webContextBlock(data.message, webSources, webSearchAttempted);
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
          live_location_used: Boolean(data.location),
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
          liveLocationUsed: Boolean(data.location),
        },
      });
      return {
        text: result.text,
        provider: result.provider,
        model: result.model,
        sources: webSources.map(({ title, url }) => ({ title, url })),
        webSearchAttempted,
        liveLocationUsed: Boolean(data.location),
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
          liveLocationUsed: Boolean(data.location),
          error: error instanceof Error ? error.message : String(error),
        },
      });
      if (status === 503) throw new Error("AI provider is not configured.");
      throw new Error("AI service temporarily unavailable.");
    }
  });
