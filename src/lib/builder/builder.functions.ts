import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveAssistantModelPreference } from "@/lib/ai/ai-preferences.server";
import { ProviderError } from "@/lib/runtime/model-gateway.server";
import { generateBuilderPlan } from "@/lib/builder/builder-plan.server";
import { generateBuilderSourceManifest } from "@/lib/builder/builder-source.server";
import { getUserGitHubInstallationId, splitGitHubRepository } from "@/lib/integrations/github-connected-service.server";
import { listGitHubBranches, listGitHubRepositories } from "@/lib/integrations/github-app.server";
import { queueGitHubWriteApproval } from "@/lib/integrations/github-write-approval.server";

type Sb = { from: (table: string) => any };

const createInput = z.object({ title: z.string().trim().min(1).max(120), prompt: z.string().trim().min(20).max(12000) });
const jobInput = z.object({ id: z.string().uuid() });
const targetRepoInput = z.object({ id: z.string().uuid(), repository: z.string().trim().min(3).max(220) });

const jobColumns = "id,title,prompt,status,plan,source_status,source_manifest,source_last_error,repository_full_name,branch_name,branch_approval_id,repository_status,repository_last_error,last_error,created_at,updated_at";

function mapJob(row: any) {
  return {
    id: String(row.id), title: String(row.title), prompt: String(row.prompt), status: String(row.status), plan: row.plan ?? null,
    sourceStatus: row.source_status ? String(row.source_status) : "not_started", sourceManifest: row.source_manifest ?? null,
    sourceLastError: row.source_last_error ? String(row.source_last_error) : null,
    repositoryFullName: row.repository_full_name ? String(row.repository_full_name) : null,
    branchName: row.branch_name ? String(row.branch_name) : null,
    branchApprovalId: row.branch_approval_id ? String(row.branch_approval_id) : null,
    repositoryStatus: row.repository_status ? String(row.repository_status) : "not_started",
    repositoryLastError: row.repository_last_error ? String(row.repository_last_error) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

async function resolveBuilderPreference(sb: Sb, userId: string) {
  let storedPreference: { default_provider?: unknown; default_model?: unknown } | null = null;
  try {
    const preferenceResult = await sb.from("user_ai_preferences").select("default_provider,default_model").eq("user_id", userId).maybeSingle();
    if (!preferenceResult.error) storedPreference = preferenceResult.data;
  } catch (error) { console.warn("[builder] AI preference lookup unavailable; using deployment default", error); }
  return resolveAssistantModelPreference(storedPreference);
}

function builderBranch(title: string, id: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "app";
  return `palladium/${slug}-${id.slice(0, 8)}`;
}

export const listBuilderJobs = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const sb = context.supabase as unknown as Sb;
  const { data, error } = await sb.from("builder_jobs").select(jobColumns).eq("user_id", context.userId).order("created_at", { ascending: false }).limit(25);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapJob);
});

export const listBuilderGitHubRepositories = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const installationId = await getUserGitHubInstallationId(context.userId);
  if (!installationId) throw new Error("GitHub is not connected. Connect GitHub before choosing a Builder repository.");
  return (await listGitHubRepositories(installationId)).map((repo) => ({ fullName: repo.fullName, private: repo.private, defaultBranch: repo.defaultBranch, htmlUrl: repo.htmlUrl }));
});

export const createBuilderJob = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => createInput.parse(input)).handler(async ({ data, context }) => {
  const sb = context.supabase as unknown as Sb;
  const { data: row, error } = await sb.from("builder_jobs").insert({ user_id: context.userId, title: data.title.trim(), prompt: data.prompt.trim(), status: "requested" }).select(jobColumns).single();
  if (error) throw new Error(error.message);
  return mapJob(row);
});

export const generateBuilderJobPlan = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => jobInput.parse(input)).handler(async ({ data, context }) => {
  const sb = context.supabase as unknown as Sb;
  const { data: claimed, error: claimError } = await sb.from("builder_jobs").update({ status: "planning", last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).in("status", ["requested", "failed"]).select(jobColumns).maybeSingle();
  if (claimError) throw new Error(claimError.message);
  if (!claimed) throw new Error("This build request is no longer ready for planning.");
  const { provider, model } = await resolveBuilderPreference(sb, context.userId);
  try {
    const plan = await generateBuilderPlan({ title: String(claimed.title), prompt: String(claimed.prompt), provider, model });
    const { data: planned, error: persistError } = await sb.from("builder_jobs").update({ plan, status: "planned", last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("status", "planning").select(jobColumns).maybeSingle();
    if (persistError) throw new Error(persistError.message);
    if (!planned) throw new Error("Planning was cancelled before the generated plan could be saved.");
    return mapJob(planned);
  } catch (error) {
    const safeMessage = error instanceof ProviderError && error.status === 503 ? "AI provider is not configured." : error instanceof Error && error.message.startsWith("The AI planner returned") ? error.message : "AI planning failed. Try again.";
    const { error: failureError } = await sb.from("builder_jobs").update({ status: "failed", last_error: safeMessage, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("status", "planning");
    if (failureError) console.error("[builder] could not persist planning failure", failureError.message);
    throw new Error(safeMessage);
  }
});

export const generateBuilderJobSource = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => jobInput.parse(input)).handler(async ({ data, context }) => {
  const sb = context.supabase as unknown as Sb;
  const { data: claimed, error: claimError } = await sb.from("builder_jobs").update({ source_status: "generating", source_last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("status", "planned").in("source_status", ["not_started", "failed"]).select(jobColumns).maybeSingle();
  if (claimError) throw new Error(claimError.message);
  if (!claimed || !claimed.plan) throw new Error("This build request is not ready for source generation.");
  const { provider, model } = await resolveBuilderPreference(sb, context.userId);
  try {
    const sourceManifest = await generateBuilderSourceManifest({ title: String(claimed.title), prompt: String(claimed.prompt), plan: claimed.plan, provider, model });
    const { data: generated, error: persistError } = await sb.from("builder_jobs").update({ source_manifest: sourceManifest, source_status: "generated", source_last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("status", "planned").eq("source_status", "generating").select(jobColumns).maybeSingle();
    if (persistError) throw new Error(persistError.message);
    if (!generated) throw new Error("Source generation was interrupted before the manifest could be saved.");
    return mapJob(generated);
  } catch (error) {
    const safeMessage = error instanceof ProviderError && error.status === 503 ? "AI provider is not configured." : error instanceof Error && error.message.startsWith("The AI source generator returned") ? error.message : "AI source generation failed. Try again.";
    const { error: failureError } = await sb.from("builder_jobs").update({ source_status: "failed", source_last_error: safeMessage, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("source_status", "generating");
    if (failureError) console.error("[builder] could not persist source generation failure", failureError.message);
    throw new Error(safeMessage);
  }
});

export const queueBuilderBranchApproval = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => targetRepoInput.parse(input)).handler(async ({ data, context }) => {
  const sb = context.supabase as unknown as Sb;
  const { data: job, error } = await sb.from("builder_jobs").select(jobColumns).eq("id", data.id).eq("user_id", context.userId).eq("source_status", "generated").maybeSingle();
  if (error) throw new Error(error.message);
  if (!job || !job.source_manifest) throw new Error("Generate and review source before choosing a repository.");
  if (job.branch_approval_id || job.repository_status !== "not_started") throw new Error("A repository handoff has already been started for this build request.");

  const installationId = await getUserGitHubInstallationId(context.userId);
  if (!installationId) throw new Error("GitHub is not connected.");
  const repos = await listGitHubRepositories(installationId);
  const target = repos.find((repo) => repo.fullName.toLowerCase() === data.repository.toLowerCase());
  if (!target) throw new Error("That repository is not available through your connected GitHub installation.");
  const { owner, repo } = splitGitHubRepository(target.fullName);
  const branches = await listGitHubBranches({ installationId, owner, repo, perPage: 100 });
  const base = branches.find((branch) => branch.name === target.defaultBranch);
  if (!base?.sha) throw new Error("Could not resolve the repository default branch SHA.");

  const branch = builderBranch(String(job.title), String(job.id));
  const queued = await queueGitHubWriteApproval({ sb, userId: context.userId }, { action: "github_branch_create", repository: target.fullName, branch, base_sha: base.sha });
  if (!queued.approval_request_id) throw new Error("GitHub branch approval could not be queued.");

  const { data: updated, error: updateError } = await sb.from("builder_jobs").update({ repository_full_name: target.fullName, branch_name: branch, branch_approval_id: queued.approval_request_id, repository_status: "branch_approval_pending", repository_last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("repository_status", "not_started").select(jobColumns).maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!updated) throw new Error("Repository handoff changed before it could be saved.");
  return mapJob(updated);
});

export const cancelBuilderJob = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => jobInput.parse(input)).handler(async ({ data, context }) => {
  const sb = context.supabase as unknown as Sb;
  const { data: row, error } = await sb.from("builder_jobs").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).in("status", ["requested", "planning"]).select(jobColumns).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Build request could not be cancelled because it is no longer pending.");
  return mapJob(row);
});
