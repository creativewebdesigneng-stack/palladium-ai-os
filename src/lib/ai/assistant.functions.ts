/**
 * Workspace assistant — real AI execution only.
 *
 * There is no simulated, demo or canned reply path here. Every answer comes
 * from a live model provider through the server-side gateway. When no provider
 * is configured, or a provider fails, the caller receives an explicit error —
 * never a fabricated assistant message.
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
  normaliseProvider,
  ProviderError,
  resolveModel,
  runChat,
  type ChatMessage,
} from "@/lib/runtime/model-gateway.server";

const SYSTEM_PROMPT = [
  "You are the PalladiumAI workspace assistant.",
  "Answer operator questions about their AI workforce, agents, tasks, workflows,",
  "memory, billing and integrations inside PalladiumAI.",
  "Be concise and factual. If you do not know something about this specific",
  "workspace's data, say so and point the operator to the screen that holds it.",
  "Never invent metrics, results or record counts.",
].join(" ");

type Turn = { role: "user" | "assistant"; content: string };

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

    const provider = normaliseProvider(process.env["ASSISTANT_PROVIDER"] ?? null);
    const model = resolveModel(provider, process.env["ASSISTANT_MODEL"] ?? null);

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...data.history.map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
      { role: "user", content: data.message },
    ];

    try {
      const result = await runChat({ provider, model, messages, maxTokens: 900 });
      const text = result.text.trim();
      if (!text) throw new ProviderError("The model returned an empty response.", 502, true);

      await recordUsage({
        userId: context.userId,
        metric: "assistant_message",
        quantity: 1,
        metadata: {
          provider: result.provider,
          model: result.model,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
        },
      });
      await writeAudit({
        userId: context.userId,
        action: "assistant.message",
        targetType: "assistant",
        status: "success",
        metadata: { provider: result.provider, model: result.model },
      });

      return { text, provider: result.provider, model: result.model };
    } catch (error) {
      const status = error instanceof ProviderError ? error.status : 500;
      // The real error is recorded server-side; the caller gets a safe message.
      console.error("[assistant] provider failure", status, error);
      await writeAudit({
        userId: context.userId,
        action: "assistant.message",
        targetType: "assistant",
        status: "failed",
        metadata: {
          provider,
          model,
          status,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      if (status === 503) throw new Error("AI provider is not configured.");
      throw new Error("AI service temporarily unavailable.");
    }
  });
