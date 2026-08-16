import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveAssistantModelPreference } from "@/lib/ai/ai-preferences.server";
import { ProviderError } from "@/lib/runtime/model-gateway.server";
import { generateBuilderPlan } from "@/lib/builder/builder-plan.server";
import { generateBuilderSourceManifest } from "@/lib/builder/builder-source.server";
import { getUserGitHubInstallationId, splitGitHubRepository } from "@/lib/integrations/github-connected-service.server";
import { listGitHubBranches, listGitHubRepositories, readGitHubFile } from "@/lib/integrations/github-app.server";
import { buildGitHubWriteApproval, queueGitHubWriteApproval } from "@/lib/integrations/github-write-approval.server";

type Sb = { from: (table: string) => any };

const createInput = z.object({ title: z.string().trim().min(1).max(120), prompt: z.string().trim().min(20).max(12000) });
const jobInput = z.object({ id: z.string().uuid() });
const targetRepoInput = z.object({ id: z.string().uuid(), repository: z.string().trim().min(3).max(220) });

const jobColumns = "id,title,prompt,status,plan,source_status,source_manifest,source_last_error,repository_full_name,branch_name,branch_approval_id,file_approval_ids,repository_status,repository_last_error,last_error,created_at,updated_at";

function mapJob(row: any) {
  return {
    id: String(row.id), title: String(row.title), prompt: String(row.prompt), status: String(row.status), plan: row.plan ?? null,
    sourceStatus: row.source_status ? String(row.source_status) : "not_started", sourceManifest: row.source_manifest ?? null,
    sourceLastError: row.source_last_error ? String(row.source_last_error) : null,
    repositoryFullName: row.repository_full_name ? String(row.repository_full_name) : null,
    branchName: row.branch_name ? String(row.branch_name) : null,
    branchApprovalId: row.branch_approval_id ? String(row.branch_approval_id) : null,
    fileApprovalIds: Array.isArray(row.file_approval_ids) ? row.file_approval_ids : [],
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

function sourceFiles(manifest: any): Array<{ path: string; content: string }> {
  if (!manifest || !Array.isArray(manifest.files)) throw new Error("The persisted source manifest is invalid.");
  return manifest.files.map((file: any) => ({ path: String(file?.path ?? ""), content: String(file?.content ?? "") }));
}

async function requireConnectedTarget(userId: string, repository: string) {
  const installationId = await getUserGitHubInstallationId(userId);
  if (!installationId) throw new Error("GitHub is not connected.");
  const repos = await listGitHubRepositories(installationId);
  const target = repos.find((repo) => repo.fullName.toLowerCase() === repository.toLowerCase());
  if (!target) throw new Error("That repository is not available through your connected GitHub installation.");
  return { installationId, target };
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

  const { installationId, target } = await requireConnectedTarget(context.userId, data.repository);
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

export const queueBuilderFileApprovals = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => jobInput.parse(input)).handler(async ({ data, context }) => {
  const sb = context.supabase as unknown as Sb;
  const { data: job, error } = await sb.from("builder_jobs").select(jobColumns).eq("id", data.id).eq("user_id", context.userId).eq("source_status", "generated").maybeSingle();
  if (error) throw new Error(error.message);
  if (!job?.repository_full_name || !job.branch_name || !job.branch_approval_id || !job.source_manifest) throw new Error("Queue and approve the Builder branch before file approvals.");
  if (!["branch_approval_pending", "branch_ready"].includes(String(job.repository_status))) throw new Error("This Builder repository handoff is not ready for file approvals.");

  const { data: branchApproval, error: approvalError } = await sb.from("approval_requests").select("id,status").eq("id", job.branch_approval_id).eq("user_id", context.userId).maybeSingle();
  if (approvalError) throw new Error(approvalError.message);
  if (!branchApproval || branchApproval.status !== "approved") throw new Error("Approve the Builder branch creation request first.");

  const { installationId, target } = await requireConnectedTarget(context.userId, String(job.repository_full_name));
  const { owner, repo } = splitGitHubRepository(target.fullName);
  const branches = await listGitHubBranches({ installationId, owner, repo, perPage: 100 });
  if (!branches.some((branch) => branch.name === job.branch_name)) throw new Error("The approved Builder branch is not available on GitHub yet.");

  const { data: existingApprovals, error: existingError } = await sb.from("approval_requests").select("id,status,details").eq("user_id", context.userId).in("action_type", ["github_file_create", "github_file_update"]).eq("details->>builder_job_id", String(job.id)).eq("status", "pending");
  if (existingError) throw new Error(existingError.message);
  if ((existingApprovals ?? []).length) throw new Error("File approvals have already been queued for this build request.");

  const approvalRows: any[] = [];
  const unchanged: string[] = [];
  for (const file of sourceFiles(job.source_manifest)) {
    let existing: { sha: string; content: string } | null = null;
    try {
      existing = await readGitHubFile({ installationId, owner, repo, path: file.path, ref: String(job.branch_name) });
    } catch (readError) {
      const message = readError instanceof Error ? readError.message.toLowerCase() : "";
      if (!message.includes("not found")) throw readError;
    }
    if (existing?.content === file.content) {
      unchanged.push(file.path);
      continue;
    }
    const request = buildGitHubWriteApproval({
      action: existing ? "github_file_update" : "github_file_create",
      repository: target.fullName,
      branch: String(job.branch_name),
      path: file.path,
      content: file.content,
      message: `builder: ${existing ? "update" : "create"} ${file.path}`,
      ...(existing ? { sha: existing.sha } : {}),
    });
    approvalRows.push({
      user_id: context.userId,
      org_id: null,
      agent_id: null,
      task_id: null,
      ...request,
      details: { ...request.details, builder_job_id: String(job.id), builder_file_path: file.path },
      status: "pending",
    });
  }

  if (!approvalRows.length) {
    const { data: applied, error: appliedError } = await sb.from("builder_jobs").update({ repository_status: "files_applied", repository_last_error: null, file_approval_ids: [], updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).in("repository_status", ["branch_approval_pending", "branch_ready"]).select(jobColumns).maybeSingle();
    if (appliedError) throw new Error(appliedError.message);
    if (!applied) throw new Error("Repository handoff changed before it could be completed.");
    return { ...mapJob(applied), unchangedFiles: unchanged };
  }

  const { data: approvals, error: insertError } = await sb.from("approval_requests").insert(approvalRows).select("id,action_type,details,status");
  if (insertError) throw new Error("Could not queue Builder file approvals.");
  const fileApprovalIds = (approvals ?? []).map((row: any) => ({ id: String(row.id), action: String(row.action_type), path: String(row.details?.builder_file_path ?? ""), status: String(row.status) }));

  const { data: updated, error: updateError } = await sb.from("builder_jobs").update({ repository_status: "files_approval_pending", repository_last_error: null, file_approval_ids: fileApprovalIds, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).in("repository_status", ["branch_approval_pending", "branch_ready"]).select(jobColumns).maybeSingle();
  if (updateError) throw new Error(updateError.message);
  if (!updated) throw new Error("File approvals were queued but the Builder handoff state changed. Refresh before retrying.");
  return { ...mapJob(updated), unchangedFiles: unchanged };
});

export const refreshBuilderRepositoryStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => jobInput.parse(input)).handler(async ({ data, context }) => {
  const sb = context.supabase as unknown as Sb;
  const { data: job, error } = await sb.from("builder_jobs").select(jobColumns).eq("id", data.id).eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!job?.branch_approval_id || !job.repository_full_name || !job.branch_name) throw new Error("Repository handoff has not started.");

  const approvalIds = Array.isArray(job.file_approval_ids) ? job.file_approval_ids.map((entry: any) => String(entry?.id ?? "")).filter(Boolean) : [];
  if (approvalIds.length) {
    const { data: approvals, error: approvalsError } = await sb.from("approval_requests").select("id,status").eq("user_id", context.userId).in("id", approvalIds);
    if (approvalsError) throw new Error(approvalsError.message);
    const statuses: string[] = (approvals ?? []).map((row: any) => String(row.status));
    if (statuses.some((status: string) => status === "rejected")) {
      const { data: failed, error: failedError } = await sb.from("builder_jobs").update({ repository_status: "failed", repository_last_error: "One or more GitHub file approvals were rejected.", updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).select(jobColumns).maybeSingle();
      if (failedError) throw new Error(failedError.message);
      return mapJob(failed ?? job);
    }
    if (statuses.length === approvalIds.length && statuses.every((status: string) => status === "approved")) {
      const { data: applied, error: appliedError } = await sb.from("builder_jobs").update({ repository_status: "files_applied", repository_last_error: null, file_approval_ids: (job.file_approval_ids ?? []).map((entry: any) => ({ ...entry, status: "approved" })), updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).select(jobColumns).maybeSingle();
      if (appliedError) throw new Error(appliedError.message);
      return mapJob(applied ?? job);
    }
    return mapJob(job);
  }

  const { data: branchApproval, error: branchError } = await sb.from("approval_requests").select("status").eq("id", job.branch_approval_id).eq("user_id", context.userId).maybeSingle();
  if (branchError) throw new Error(branchError.message);
  if (branchApproval?.status === "rejected") {
    const { data: failed, error: failedError } = await sb.from("builder_jobs").update({ repository_status: "failed", repository_last_error: "GitHub branch creation was rejected.", updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).select(jobColumns).maybeSingle();
    if (failedError) throw new Error(failedError.message);
    return mapJob(failed ?? job);
  }
  if (branchApproval?.status !== "approved") return mapJob(job);

  const { installationId, target } = await requireConnectedTarget(context.userId, String(job.repository_full_name));
  const { owner, repo } = splitGitHubRepository(target.fullName);
  const branches = await listGitHubBranches({ installationId, owner, repo, perPage: 100 });
  if (!branches.some((branch) => branch.name === job.branch_name)) return mapJob(job);
  const { data: ready, error: readyError } = await sb.from("builder_jobs").update({ repository_status: "branch_ready", repository_last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("repository_status", "branch_approval_pending").select(jobColumns).maybeSingle();
  if (readyError) throw new Error(readyError.message);
  return mapJob(ready ?? job);
});

export const cancelBuilderJob = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => jobInput.parse(input)).handler(async ({ data, context }) => {
  const sb = context.supabase as unknown as Sb;
  const { data: row, error } = await sb.from("builder_jobs").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).in("status", ["requested", "planning"]).select(jobColumns).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Build request could not be cancelled because it is no longer pending.");
  return mapJob(row);
});