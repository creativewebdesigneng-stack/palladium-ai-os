import { createServerFn } from "@tanstack/react-start";
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

type Sb = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

type PromptWrite = {
  id?: string | null;
  name: string;
  description?: string | null;
  system_prompt?: string | null;
  prompt_text: string;
};

function normaliseWrite(input: PromptWrite) {
  const name = String(input?.name ?? "").trim();
  const prompt = String(input?.prompt_text ?? "").trim();
  if (!name) throw new Error("Prompt name is required.");
  if (!prompt) throw new Error("Prompt text is required.");
  return {
    id: input?.id ? String(input.id) : null,
    name: name.slice(0, 120),
    description: String(input?.description ?? "").trim().slice(0, 1000) || null,
    system_prompt: String(input?.system_prompt ?? "").trim().slice(0, 8000) || null,
    prompt_text: prompt.slice(0, 16000),
  };
}

export const getPromptWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [prompts, versions, runs] = await Promise.all([
      sb.from("saved_prompts").select("*").order("updated_at", { ascending: false }).limit(100),
      sb.from("saved_prompt_versions").select("id,prompt_id,version,name,created_at").order("created_at", { ascending: false }).limit(200),
      sb.from("saved_prompt_runs").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (prompts.error) throw new Error(prompts.error.message);
    if (versions.error) throw new Error(versions.error.message);
    if (runs.error) throw new Error(runs.error.message);
    return { prompts: prompts.data ?? [], versions: versions.data ?? [], runs: runs.data ?? [] };
  });

export const savePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PromptWrite) => normaliseWrite(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let row: any;
    if (data.id) {
      const current = await sb
        .from("saved_prompts")
        .select("*")
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (current.error) throw new Error(current.error.message);
      if (!current.data) throw new Error("Prompt not found.");
      const version = Number(current.data.version ?? 1) + 1;
      const updated = await sb
        .from("saved_prompts")
        .update({ ...data, id: undefined, version, updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select("*")
        .maybeSingle();
      if (updated.error) throw new Error(updated.error.message);
      row = updated.data;
    } else {
      const inserted = await sb
        .from("saved_prompts")
        .insert({
          user_id: context.userId,
          name: data.name,
          description: data.description,
          system_prompt: data.system_prompt,
          prompt_text: data.prompt_text,
          version: 1,
        })
        .select("*")
        .maybeSingle();
      if (inserted.error) throw new Error(inserted.error.message);
      row = inserted.data;
    }
    if (!row) throw new Error("Prompt could not be saved.");
    const snapshot = await sb.from("saved_prompt_versions").insert({
      prompt_id: row.id,
      user_id: context.userId,
      version: row.version,
      name: row.name,
      description: row.description,
      system_prompt: row.system_prompt,
      prompt_text: row.prompt_text,
    });
    if (snapshot.error) throw new Error(snapshot.error.message);
    await writeAudit({
      userId: context.userId,
      action: data.id ? "prompt.updated" : "prompt.created",
      targetType: "saved_prompt",
      targetId: row.id,
      status: "success",
      metadata: { version: row.version },
    });
    return row;
  });

export const deletePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    if (!data.id) throw new Error("Prompt id is required.");
    const sb = context.supabase as unknown as Sb;
    const deleted = await sb
      .from("saved_prompts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("id")
      .maybeSingle();
    if (deleted.error) throw new Error(deleted.error.message);
    if (!deleted.data) throw new Error("Prompt not found.");
    await writeAudit({
      userId: context.userId,
      action: "prompt.deleted",
      targetType: "saved_prompt",
      targetId: data.id,
      status: "success",
    });
    return { ok: true };
  });

export const runSavedPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; input?: string }) => ({
    id: String(input?.id ?? ""),
    input: String(input?.input ?? "").trim().slice(0, 8000),
  }))
  .handler(async ({ data, context }) => {
    if (!data.id) throw new Error("Prompt id is required.");
    const sb = context.supabase as unknown as Sb;
    try {
      const entitlements = await getEntitlements(sb, context.userId);
      assertWithinLimit(entitlements, "tasks_per_month");
    } catch (error) {
      if (error instanceof EntitlementError) throw new Error(error.message);
      throw error;
    }

    const promptRes = await sb
      .from("saved_prompts")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (promptRes.error) throw new Error(promptRes.error.message);
    const prompt = promptRes.data;
    if (!prompt) throw new Error("Prompt not found.");

    let preference: { default_provider?: unknown; default_model?: unknown } | null = null;
    try {
      const pref = await sb
        .from("user_ai_preferences")
        .select("default_provider,default_model")
        .eq("user_id", context.userId)
        .maybeSingle();
      preference = pref.data ?? null;
    } catch {
      preference = null;
    }
    const { provider, model, source } = resolveAssistantModelPreference(preference);
    const runInsert = await sb.from("saved_prompt_runs").insert({
      prompt_id: prompt.id,
      user_id: context.userId,
      prompt_version: prompt.version,
      input_text: data.input || null,
      status: "running",
      provider,
      model,
    }).select("*").maybeSingle();
    if (runInsert.error) throw new Error(runInsert.error.message);
    const runId = runInsert.data?.id;

    const messages: ChatMessage[] = [
      ...(prompt.system_prompt ? [{ role: "system" as const, content: prompt.system_prompt }] : []),
      { role: "user", content: data.input ? `${prompt.prompt_text}\n\nAdditional input:\n${data.input}` : prompt.prompt_text },
    ];

    try {
      const result = await runChat({ provider, model, messages, maxTokens: 1600 });
      const output = result.text.trim();
      if (!output) throw new ProviderError("The model returned an empty response.", 502, true);
      const completedAt = new Date().toISOString();
      await sb.from("saved_prompt_runs").update({
        status: "succeeded",
        output_text: output,
        provider: result.provider,
        model: result.model,
        input_tokens: result.usage.input,
        output_tokens: result.usage.output,
        completed_at: completedAt,
      }).eq("id", runId).eq("user_id", context.userId);
      await recordUsage({
        userId: context.userId,
        metric: "prompt_run",
        quantity: 1,
        metadata: {
          prompt_id: prompt.id,
          prompt_version: prompt.version,
          provider: result.provider,
          model: result.model,
          preference_source: source,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
        },
      });
      await writeAudit({
        userId: context.userId,
        action: "prompt.run",
        targetType: "saved_prompt",
        targetId: prompt.id,
        status: "success",
        metadata: { runId, version: prompt.version, provider: result.provider, model: result.model },
      });
      return { run: { ...runInsert.data, status: "succeeded", output_text: output, provider: result.provider, model: result.model, input_tokens: result.usage.input, output_tokens: result.usage.output, completed_at: completedAt }, output };
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI service temporarily unavailable.";
      if (runId) {
        await sb.from("saved_prompt_runs").update({ status: "failed", error: message.slice(0, 1000), completed_at: new Date().toISOString() }).eq("id", runId).eq("user_id", context.userId);
      }
      await writeAudit({
        userId: context.userId,
        action: "prompt.run",
        targetType: "saved_prompt",
        targetId: prompt.id,
        status: "failed",
        metadata: { runId, version: prompt.version, provider, model, error: message },
      });
      if (error instanceof ProviderError && error.status === 503) throw new Error("AI provider is not configured.");
      throw new Error("AI service temporarily unavailable.");
    }
  });
