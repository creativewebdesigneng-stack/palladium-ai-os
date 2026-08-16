import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveAssistantModelPreference } from "@/lib/ai/ai-preferences.server";
import { ProviderError } from "@/lib/runtime/model-gateway.server";
import { generateBuilderRepairManifest } from "./builder-repair.server";

type Sb = { from: (table: string) => any };

const jobInput = z.object({ id: z.string().uuid() });
const columns = "id,title,prompt,plan,source_manifest,source_status,repository_status,file_approval_ids,sandbox_status,sandbox_results,sandbox_provider,sandbox_id,sandbox_last_error,sandbox_started_at,sandbox_finished_at,repair_status,repair_manifest,repair_last_error,repair_attempt,updated_at";

function mapRepair(row: any) {
  return {
    id: String(row.id),
    repairStatus: row.repair_status ? String(row.repair_status) : "not_started",
    repairManifest: row.repair_manifest ?? null,
    repairLastError: row.repair_last_error ? String(row.repair_last_error) : null,
    repairAttempt: Number(row.repair_attempt ?? 0),
    updatedAt: String(row.updated_at),
  };
}

async function preference(sb: Sb, userId: string) {
  let stored: { default_provider?: unknown; default_model?: unknown } | null = null;
  try {
    const result = await sb.from("user_ai_preferences").select("default_provider,default_model").eq("user_id", userId).maybeSingle();
    if (!result.error) stored = result.data;
  } catch (error) {
    console.warn("[builder:repair] AI preference lookup unavailable; using deployment default", error);
  }
  return resolveAssistantModelPreference(stored);
}

export const listBuilderRepairStates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from("builder_jobs").select("id,repair_status,repair_manifest,repair_last_error,repair_attempt,updated_at").eq("user_id", context.userId).order("updated_at", { ascending: false }).limit(25);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRepair);
  });

export const generateBuilderRepair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: current, error: currentError } = await sb.from("builder_jobs").select(columns).eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current?.source_manifest || !current?.sandbox_results || current.sandbox_status !== "failed" || current.repository_status !== "files_applied") {
      throw new Error("A failed isolated validation is required before generating a repair proposal.");
    }
    const attempt = Number(current.repair_attempt ?? 0);
    if (!Number.isSafeInteger(attempt) || attempt >= 10) throw new Error("This build request has reached the repair-attempt limit.");
    if (!["not_started", "accepted", "failed"].includes(String(current.repair_status))) {
      throw new Error("This build request already has an active repair proposal.");
    }

    const { data: claimed, error: claimError } = await sb.from("builder_jobs").update({ repair_status: "generating", repair_manifest: null, repair_last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("sandbox_status", "failed").in("repair_status", ["not_started", "accepted", "failed"]).select(columns).maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) throw new Error("Repair generation was already started elsewhere.");

    const { provider, model } = await preference(sb, context.userId);
    try {
      const manifest = await generateBuilderRepairManifest({
        title: String(claimed.title),
        prompt: String(claimed.prompt),
        plan: claimed.plan,
        sourceManifest: claimed.source_manifest,
        sandboxResults: claimed.sandbox_results,
        provider,
        model,
      });
      const { data: proposed, error: persistError } = await sb.from("builder_jobs").update({ repair_status: "proposed", repair_manifest: manifest, repair_last_error: null, repair_attempt: attempt + 1, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("repair_status", "generating").select(columns).maybeSingle();
      if (persistError) throw new Error(persistError.message);
      if (!proposed) throw new Error("Repair generation was interrupted before the proposal could be saved.");
      return mapRepair(proposed);
    } catch (error) {
      const safeMessage = error instanceof ProviderError && error.status === 503
        ? "AI provider is not configured."
        : error instanceof Error && (error.message.startsWith("The AI repair engine returned") || error.message.startsWith("The AI source generator returned"))
          ? error.message
          : "AI repair generation failed. Try again.";
      const { error: failureError } = await sb.from("builder_jobs").update({ repair_status: "failed", repair_last_error: safeMessage, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("repair_status", "generating");
      if (failureError) console.error("[builder:repair] could not persist repair failure", failureError.message);
      throw new Error(safeMessage);
    }
  });

export const acceptBuilderRepair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: current, error } = await sb.from("builder_jobs").select(columns).eq("id", data.id).eq("user_id", context.userId).eq("repair_status", "proposed").eq("sandbox_status", "failed").eq("repository_status", "files_applied").maybeSingle();
    if (error) throw new Error(error.message);
    if (!current?.repair_manifest) throw new Error("There is no repair proposal ready to accept.");

    const now = new Date().toISOString();
    const { data: accepted, error: updateError } = await sb.from("builder_jobs").update({
      source_manifest: current.repair_manifest,
      source_status: "generated",
      source_last_error: null,
      repair_status: "accepted",
      repair_last_error: null,
      repository_status: "branch_ready",
      repository_last_error: null,
      file_approval_ids: [],
      sandbox_status: "not_started",
      sandbox_provider: null,
      sandbox_id: null,
      sandbox_results: null,
      sandbox_last_error: null,
      sandbox_started_at: null,
      sandbox_finished_at: null,
      updated_at: now,
    }).eq("id", data.id).eq("user_id", context.userId).eq("repair_status", "proposed").eq("sandbox_status", "failed").select(columns).maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!accepted) throw new Error("Repair proposal changed before it could be accepted.");
    return mapRepair(accepted);
  });
