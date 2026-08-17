/**
 * Workspace assistant — real AI execution only.
 *
 * There is no simulated, demo or canned reply path here. Every answer comes
 * from a live model provider through the server-side gateway. When a selected
 * provider is unavailable and Groq is configured, Chat safely fails over to
 * Groq rather than fabricating a response or leaving the operator stuck.
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
import { ProviderError, runChat, type ChatMessage, type Provider } from "@/lib/runtime/model-gateway.server";

const SYSTEM_PROMPT = [
  "You are the PalladiumAI workspace assistant.",
  "Answer operator questions about their AI workforce, agents, tasks, workflows,",
  "memory, billing and integrations inside PalladiumAI.",
  "Be concise and factual. If you do not know something about this specific",
  "workspace's data, say so and point the operator to the screen that holds it.",
  "Never invent metrics, results or record counts.",
].join(" ");

type Turn = { role: "user" | "assistant"; content: string };

type AssistantRun = {
  text: string;
  provider: Provider;
  model: string;
  usage: { input: number; output: number };
  fallbackFrom?: Provider;
};

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
      maxTokens: 900,
    });
    const text = primary.text.trim();
    if (!text) throw new ProviderError("The model returned an empty response.", 502, true);
    return {
      text,
      provider: primary.provider,
      model: primary.model,
      usage: primary.usage,
    };
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
      maxTokens: 900,
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

/** Runs one real assistant turn. Throws with a safe message on any failure. */
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

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
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
        },
      });

      return { text: result.text, provider: result.provider, model: result.model };
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
          error: error instanceof Error ? error.message : String(error),
        },
      });
      if (status === 503) throw new Error("AI provider is not configured.");
      throw new Error("AI service temporarily unavailable.");
    }
  });
