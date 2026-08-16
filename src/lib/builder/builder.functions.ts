import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveAssistantModelPreference } from "@/lib/ai/ai-preferences.server";
import { ProviderError } from "@/lib/runtime/model-gateway.server";
import { generateBuilderPlan } from "@/lib/builder/builder-plan.server";
import { generateBuilderSourceManifest } from "@/lib/builder/builder-source.server";

type Sb = { from: (table: string) => any };

const createInput = z.object({
  title: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(20).max(12000),
});

const jobInput = z.object({
  id: z.string().uuid(),
});

const jobColumns = "id,title,prompt,status,plan,source_status,source_manifest,source_last_error,repository_full_name,branch_name,last_error,created_at,updated_at";

function mapJob(row: any) {
  return {
    id: String(row.id),
    title: String(row.title),
    prompt: String(row.prompt),
    status: String(row.status),
    plan: row.plan ?? null,
    sourceStatus: row.source_status ? String(row.source_status) : "not_started",
    sourceManifest: row.source_manifest ?? null,
    sourceLastError: row.source_last_error ? String(row.source_last_error) : null,
    repositoryFullName: row.repository_full_name ? String(row.repository_full_name) : null,
    branchName: row.branch_name ? String(row.branch_name) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function resolveBuilderPreference(sb: Sb, userId: string) {
  let storedPreference: { default_provider?: unknown; default_model?: unknown } | null = null;
  try {
    const preferenceResult = await sb
      .from("user_ai_preferences")
      .select("default_provider,default_model")
      .eq("user_id", userId)
      .maybeSingle();
    if (!preferenceResult.error) storedPreference = preferenceResult.data;
  } catch (error) {
    console.warn("[builder] AI preference lookup unavailable; using deployment default", error);
  }
  return resolveAssistantModelPreference(storedPreference);
}

export const listBuilderJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("builder_jobs")
      .select(jobColumns)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapJob);
  });

export const createBuilderJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("builder_jobs")
      .insert({
        user_id: context.userId,
        title: data.title.trim(),
        prompt: data.prompt.trim(),
        status: "requested",
      })
      .select(jobColumns)
      .single();
    if (error) throw new Error(error.message);
    return mapJob(row);
  });

export const generateBuilderJobPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const now = new Date().toISOString();

    const { data: claimed, error: claimError } = await sb
      .from("builder_jobs")
      .update({ status: "planning", last_error: null, updated_at: now })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .in("status", ["requested", "failed"])
      .select(jobColumns)
      .maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) throw new Error("This build request is no longer ready for planning.");

    const { provider, model } = await resolveBuilderPreference(sb, context.userId);

    try {
      const plan = await generateBuilderPlan({
        title: String(claimed.title),
        prompt: String(claimed.prompt),
        provider,
        model,
      });

      const { data: planned, error: persistError } = await sb
        .from("builder_jobs")
        .update({ plan, status: "planned", last_error: null, updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .eq("status", "planning")
        .select(jobColumns)
        .maybeSingle();
      if (persistError) throw new Error(persistError.message);
      if (!planned) throw new Error("Planning was cancelled before the generated plan could be saved.");
      return mapJob(planned);
    } catch (error) {
      const safeMessage =
        error instanceof ProviderError && error.status === 503
          ? "AI provider is not configured."
          : error instanceof Error && error.message.startsWith("The AI planner returned")
            ? error.message
            : "AI planning failed. Try again.";

      const { error: failureError } = await sb
        .from("builder_jobs")
        .update({ status: "failed", last_error: safeMessage, updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .eq("status", "planning");
      if (failureError) console.error("[builder] could not persist planning failure", failureError.message);
      console.error("[builder] planning failed", error);
      throw new Error(safeMessage);
    }
  });

export const generateBuilderJobSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: claimed, error: claimError } = await sb
      .from("builder_jobs")
      .update({ source_status: "generating", source_last_error: null, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "planned")
      .in("source_status", ["not_started", "failed"])
      .select(jobColumns)
      .maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed || !claimed.plan) throw new Error("This build request is not ready for source generation.");

    const { provider, model } = await resolveBuilderPreference(sb, context.userId);

    try {
      const sourceManifest = await generateBuilderSourceManifest({
        title: String(claimed.title),
        prompt: String(claimed.prompt),
        plan: claimed.plan,
        provider,
        model,
      });

      const { data: generated, error: persistError } = await sb
        .from("builder_jobs")
        .update({
          source_manifest: sourceManifest,
          source_status: "generated",
          source_last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .eq("status", "planned")
        .eq("source_status", "generating")
        .select(jobColumns)
        .maybeSingle();
      if (persistError) throw new Error(persistError.message);
      if (!generated) throw new Error("Source generation was interrupted before the manifest could be saved.");
      return mapJob(generated);
    } catch (error) {
      const safeMessage =
        error instanceof ProviderError && error.status === 503
          ? "AI provider is not configured."
          : error instanceof Error && error.message.startsWith("The AI source generator returned")
            ? error.message
            : "AI source generation failed. Try again.";

      const { error: failureError } = await sb
        .from("builder_jobs")
        .update({ source_status: "failed", source_last_error: safeMessage, updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .eq("source_status", "generating");
      if (failureError) console.error("[builder] could not persist source generation failure", failureError.message);
      console.error("[builder] source generation failed", error);
      throw new Error(safeMessage);
    }
  });

export const cancelBuilderJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("builder_jobs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .in("status", ["requested", "planning"])
      .select(jobColumns)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Build request could not be cancelled because it is no longer pending.");
    return mapJob(row);
  });
