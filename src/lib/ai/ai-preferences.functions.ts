import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  defaultModelFor,
  getProviderOptions,
  isProviderConfigured,
  resolveAssistantModelPreference,
} from "@/lib/ai/ai-preferences.server";
import { normaliseProvider } from "@/lib/runtime/model-gateway.server";

type Sb = { from: (table: string) => any };

const updateInput = z.object({
  provider: z.enum(["lovable", "openai", "anthropic", "groq", "deepseek", "compatible"]),
  model: z.string().trim().min(1).max(160),
});

export const getAIPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("user_ai_preferences")
      .select("default_provider,default_model,updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const effective = resolveAssistantModelPreference(data);
    return {
      preference: data
        ? {
            provider: String(data.default_provider),
            model: String(data.default_model),
            updatedAt: data.updated_at ? String(data.updated_at) : null,
          }
        : null,
      effective,
      providers: getProviderOptions(),
    };
  });

export const updateAIPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    const provider = normaliseProvider(data.provider);
    if (!isProviderConfigured(provider)) {
      throw new Error("That AI provider is not configured on this deployment.");
    }

    const model = data.model.trim() || defaultModelFor(provider);
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from("user_ai_preferences")
      .upsert(
        {
          user_id: context.userId,
          default_provider: provider,
          default_model: model,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);

    return {
      provider,
      model,
      effective: resolveAssistantModelPreference({ default_provider: provider, default_model: model }),
    };
  });
