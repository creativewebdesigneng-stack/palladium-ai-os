/**
 * General-purpose workspace assistant with real provider execution, persistent
 * personal identity and optional live-web grounding for time-sensitive questions.
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
import { ProviderError, normaliseProvider, resolveModel, runChat, type ChatMessage, type Provider, type ProviderAccess } from "@/lib/runtime/model-gateway.server";

const SYSTEM_PROMPT = [
  "You are a capable general-purpose AI personal assistant built into the Blackstar intelligence platform.",
  "Your personal name may be customised by the user; always use the PERSONAL ASSISTANT CONTEXT when supplied and identify yourself by that chosen name.",
  "Answer the user's question directly and helpfully across general knowledge, science, technology, coding, writing, maths, business, planning, brainstorming, education and everyday questions.",
  "Help with any reasonable task or question. You can also help with the user's Blackstar workspace, including agents, tasks, workflows, memory, billing, notifications and integrations.",
  "When WORKSPACE CONTEXT is supplied, use it to give accurate run-downs of active work, failures, approvals, notifications and recent progress. Never invent workspace state beyond that context.",
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
  providerAccess?: ProviderAccess | null;
}): Promise<AssistantRun> {
  try {
    const primary = await runChat({ provider: args.provider, model: args.model, messages: args.messages, maxTokens: 1100, ...(args.providerAccess ? { providerAccess: args.providerAccess } : {}) });
    const text = primary.text.trim();
    if (!text) throw new ProviderError("The model returned an empty response.", 502, true);
    return { text, provider: primary.provider, model: primary.model, usage: primary.usage };
  } catch (primaryError) {
    const canUseGroq = args.provider !== "groq" && isProviderConfigured("groq");
    if (!canUseGroq) throw primaryError;
    console.warn("[assistant] primary provider failed; retrying with Groq", args.provider, primaryError instanceof Error ? primaryError.message : String(primaryError));
    const fallbackModel = defaultModelFor("groq");
    const fallback = await runChat({ provider: "groq", model: fallbackModel, messages: args.messages, maxTokens: 1100, ...(args.providerAccess ? { providerAccess: args.providerAccess } : {}) });
    const text = fallback.text.trim();
    if (!text) throw new ProviderError("The fallback model returned an empty response.", 502, true);
    return { text, provider: fallback.provider, model: fallback.model, usage: fallback.usage, fallbackFrom: args.provider };
  }
}

export const assistantChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string; history?: Turn[]; location?: unknown; conversationId?: string | null }) => {
    const message = String(input?.message ?? "").trim();
    if (!message) throw new Error("A message is required.");
    const history = Array.isArray(input?.history) ? input.history.slice(-12) : [];
    const location = parseLocation(input?.location);
    const rawConversationId = typeof input?.conversationId === "string" ? input.conversationId.trim() : "";
    const conversationId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawConversationId)
      ? rawConversationId
      : null;
    return {
      message: message.slice(0, 4000),
      conversationId,
      history: history
        .filter((t) => t && (t.role === "user" || t.role === "assistant") && t.content)
        .map((t) => ({ role: t.role, content: String(t.content).slice(0, 4000) })),
      location,
    };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

    try {
      const entitlements = await getEntitlements(sb, context.userId);
      assertWithinLimit(entitlements, "tasks_per_month");
    } catch (error) {
      if (error instanceof EntitlementError) throw new Error(error.message);
      throw error;
    }

    const [preferenceResult, profileResult, personalResult] = await Promise.all([
      sb.from("user_ai_preferences").select("default_provider,default_model").eq("user_id", context.userId).maybeSingle(),
      sb.from("profiles").select("full_name,email").eq("id", context.userId).maybeSingle(),
      sb.from("personal_assistant_preferences")
        .select("assistant_name,location_name,timezone,conversation_history_enabled,memory_context_enabled,workspace_context_enabled,live_web_enabled,response_style")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);

    let storedPreference: { default_provider?: unknown; default_model?: unknown } | null = null;
    if (preferenceResult.error) console.warn("[assistant] AI preference lookup failed; using deployment default", preferenceResult.error.message);
    else storedPreference = preferenceResult.data;
    const deploymentPreference = resolveAssistantModelPreference(storedPreference);
    let provider = deploymentPreference.provider;
    let model = deploymentPreference.model;
    let preferenceSource: "user" | "deployment" = deploymentPreference.source;
    let providerAccess: ProviderAccess | null = null;
    if (storedPreference && typeof storedPreference.default_provider === "string") {
      const requestedProvider = normaliseProvider(storedPreference.default_provider);
      const { resolveUserModelProviderAccess } = await import("@/lib/runtime/model-provider-credentials.server");
      providerAccess = await resolveUserModelProviderAccess({ userId: context.userId, provider: requestedProvider });
      if (providerAccess) {
        provider = requestedProvider;
        const requestedModel = typeof storedPreference.default_model === "string" ? storedPreference.default_model.trim() : "";
        model = resolveModel(provider, requestedModel || defaultModelFor(provider));
        preferenceSource = "user";
      }
    }

    const profile = profileResult.error ? null : profileResult.data;
    const personal = personalResult.error ? null : personalResult.data;
    const assistantName = personal?.assistant_name?.trim() || "Blackstar";
    const userName = profile?.full_name?.trim() || profile?.email?.split("@")[0] || "the user";
    const personalContext = [
      "PERSONAL ASSISTANT CONTEXT",
      `Your name: ${assistantName}`,
      `User's name: ${userName}`,
      personal?.location_name ? `User's saved location: ${personal.location_name}` : "User has not saved a location.",
      personal?.timezone ? `User's timezone: ${personal.timezone}` : "User has not saved a timezone.",
      "Address the user naturally by their name when appropriate, but do not overuse it.",
    ].join("\n");

    const {
      loadAssistantConnectionContext,
      loadAssistantMemoryContext,
      loadAssistantWorkspaceContext,
      persistAssistantMessage,
      resolveAssistantConversation,
      responseStyleInstruction,
    } = await import("@/lib/ai/assistant-context.server");

    const conversationHistoryEnabled = personal?.conversation_history_enabled !== false;
    const memoryContextEnabled = personal?.memory_context_enabled !== false;
    const workspaceContextEnabled = personal?.workspace_context_enabled !== false;
    const liveWebEnabled = personal?.live_web_enabled !== false;
    const responseStyle = typeof personal?.response_style === "string" ? personal.response_style : "balanced";

    const conversation = await resolveAssistantConversation({
      sb,
      userId: context.userId,
      conversationId: data.conversationId,
      seedMessage: data.message,
      historyEnabled: conversationHistoryEnabled,
      fallbackHistory: data.history,
    });

    await persistAssistantMessage({
      sb,
      userId: context.userId,
      conversationId: conversation.conversationId,
      role: "user",
      content: data.message,
    }).catch((error) => console.warn("[assistant] could not persist user turn", error));

    const [memoryContext, workspaceContext, connectionContext] = await Promise.all([
      loadAssistantMemoryContext({
        sb,
        userId: context.userId,
        query: data.message,
        enabled: memoryContextEnabled,
      }),
      loadAssistantWorkspaceContext({
        sb,
        userId: context.userId,
        query: data.message,
        enabled: workspaceContextEnabled,
      }),
      loadAssistantConnectionContext({
        sb,
        userId: context.userId,
        enabled: workspaceContextEnabled,
      }),
    ]);

    let webSources: WebSource[] = [];
    let webSearchAttempted = false;
    if (liveWebEnabled && shouldUseLiveWeb(data.message)) {
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
      { role: "system", content: personalContext },
      { role: "system", content: responseStyleInstruction(responseStyle) },
      ...(workspaceContext.prompt ? [{ role: "system" as const, content: workspaceContext.prompt }] : []),
      ...(memoryContext.prompt ? [{ role: "system" as const, content: memoryContext.prompt }] : []),
      ...(connectionContext.prompt ? [{ role: "system" as const, content: connectionContext.prompt }] : []),
      ...(webContext ? [{ role: "system" as const, content: webContext }] : []),
      ...conversation.history.map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
      { role: "user", content: data.message },
    ];

    try {
      const result = await runAssistantWithFallback({ provider, model, messages, providerAccess });
      await persistAssistantMessage({
        sb,
        userId: context.userId,
        conversationId: conversation.conversationId,
        role: "assistant",
        content: result.text,
        provider: result.provider,
        model: result.model,
        metadata: {
          fallbackFrom: result.fallbackFrom ?? null,
          liveWebSources: webSources.length,
          memoryHits: memoryContext.hits,
          agentMatches: workspaceContext.agentMatches,
          connectedIntegrations: connectionContext.connected,
          integrationAttention: connectionContext.attention,
        },
      }).catch((error) => console.warn("[assistant] could not persist assistant turn", error));
      await recordUsage({
        userId: context.userId,
        metric: "assistant_message",
        quantity: 1,
        metadata: {
          provider: result.provider,
          model: result.model,
          preference_source: preferenceSource,
          fallback_from: result.fallbackFrom ?? null,
          assistant_name: assistantName,
          live_web_attempted: webSearchAttempted,
          live_web_sources: webSources.length,
          live_location_used: Boolean(data.location),
          conversation_id: conversation.conversationId,
          conversation_history_enabled: conversationHistoryEnabled,
          memory_context_enabled: memoryContextEnabled,
          memory_context_hits: memoryContext.hits,
          workspace_context_enabled: workspaceContextEnabled,
          agent_matches: workspaceContext.agentMatches,
          connected_integrations: connectionContext.connected,
          integration_attention: connectionContext.attention,
          response_style: responseStyle,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
        },
      });
      await writeAudit({
        userId: context.userId,
        action: "assistant.message",
        targetType: "assistant",
        status: "success",
        metadata: { provider: result.provider, model: result.model, assistantName, preferenceSource, fallbackFrom: result.fallbackFrom ?? null, liveWebAttempted: webSearchAttempted, liveWebSources: webSources.length, liveLocationUsed: Boolean(data.location), conversationId: conversation.conversationId, memoryHits: memoryContext.hits, agentMatches: workspaceContext.agentMatches, connectedIntegrations: connectionContext.connected, integrationAttention: connectionContext.attention, responseStyle },
      });
      return { text: result.text, provider: result.provider, model: result.model, assistantName, conversationId: conversation.conversationId, sources: webSources.map(({ title, url }) => ({ title, url })), webSearchAttempted, liveLocationUsed: Boolean(data.location), memoryHits: memoryContext.hits, agentMatches: workspaceContext.agentMatches, connectedIntegrations: connectionContext.connected, integrationAttention: connectionContext.attention };
    } catch (error) {
      const status = error instanceof ProviderError ? error.status : 500;
      console.error("[assistant] provider failure", status, error);
      await writeAudit({
        userId: context.userId,
        action: "assistant.message",
        targetType: "assistant",
        status: "failed",
        metadata: { provider, model, assistantName, preferenceSource, status, liveWebAttempted: webSearchAttempted, liveLocationUsed: Boolean(data.location), error: error instanceof Error ? error.message : String(error) },
      });
      if (status === 503) throw new Error("AI provider is not configured.");
      throw new Error("AI service temporarily unavailable.");
    }
  });
