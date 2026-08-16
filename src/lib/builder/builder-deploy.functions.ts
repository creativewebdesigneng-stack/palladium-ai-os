import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createVercelPreviewDeployment, getVercelDeployment, promoteVercelDeployment } from "./builder-deploy-vercel.server";

type Sb = { from: (table: string) => any };

const jobInput = z.object({ id: z.string().uuid() });
const deploymentInput = z.object({ id: z.string().uuid() });
const deploymentColumns = "id,builder_job_id,provider,target,status,provider_deployment_id,provider_project_id,url,last_error,production_approval_id,production_status,production_promoted_at,production_aliases,production_last_error,created_at,updated_at";

function mapDeployment(row: any) {
  return {
    id: String(row.id),
    builderJobId: String(row.builder_job_id),
    provider: String(row.provider),
    target: String(row.target),
    status: String(row.status),
    providerDeploymentId: row.provider_deployment_id ? String(row.provider_deployment_id) : null,
    providerProjectId: row.provider_project_id ? String(row.provider_project_id) : null,
    url: row.url ? String(row.url) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    productionApprovalId: row.production_approval_id ? String(row.production_approval_id) : null,
    productionStatus: row.production_status ? String(row.production_status) : "not_started",
    productionPromotedAt: row.production_promoted_at ? String(row.production_promoted_at) : null,
    productionAliases: Array.isArray(row.production_aliases) ? row.production_aliases : [],
    productionLastError: row.production_last_error ? String(row.production_last_error) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const listBuilderDeployments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from("builder_deployments").select(deploymentColumns).eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapDeployment);
  });

export const createBuilderPreviewDeployment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: job, error: jobError } = await sb.from("builder_jobs").select("id,title,source_manifest,source_status,repository_status,sandbox_status").eq("id", data.id).eq("user_id", context.userId).eq("source_status", "generated").eq("repository_status", "files_applied").eq("sandbox_status", "passed").maybeSingle();
    if (jobError) throw new Error(jobError.message);
    if (!job?.source_manifest) throw new Error("This build request must pass isolated validation before preview deployment.");

    const { data: existing, error: existingError } = await sb.from("builder_deployments").select("id").eq("builder_job_id", data.id).eq("user_id", context.userId).eq("target", "preview").in("status", ["queued", "uploading", "building"]).maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) throw new Error("A preview deployment is already active for this build request.");

    const now = new Date().toISOString();
    const { data: queued, error: insertError } = await sb.from("builder_deployments").insert({ builder_job_id: data.id, user_id: context.userId, provider: "vercel", target: "preview", status: "uploading", created_at: now, updated_at: now }).select(deploymentColumns).single();
    if (insertError) throw new Error(insertError.message);

    try {
      const result = await createVercelPreviewDeployment({ title: `${String(job.title)}-${String(job.id).slice(0, 8)}`, sourceManifest: job.source_manifest });
      const { data: updated, error: updateError } = await sb.from("builder_deployments").update({ provider_deployment_id: result.id, provider_project_id: result.projectId, url: result.url, status: result.status, last_error: result.status === "failed" ? `Vercel deployment failed (${result.rawState ?? "unknown"}).` : null, updated_at: new Date().toISOString() }).eq("id", queued.id).eq("user_id", context.userId).eq("status", "uploading").select(deploymentColumns).maybeSingle();
      if (updateError) throw new Error(updateError.message);
      if (!updated) throw new Error("Preview deployment state changed before it could be persisted.");
      return mapDeployment(updated);
    } catch (error) {
      const safeMessage = error instanceof Error && error.message === "Vercel preview deployment is not configured." ? error.message : "Vercel preview deployment failed. Review the deployment configuration and retry.";
      const { error: failureError } = await sb.from("builder_deployments").update({ status: "failed", last_error: safeMessage, updated_at: new Date().toISOString() }).eq("id", queued.id).eq("user_id", context.userId).in("status", ["queued", "uploading"]);
      if (failureError) console.error("[builder:deploy] could not persist deployment failure", failureError.message);
      console.error("[builder:deploy] preview deployment failed", error);
      throw new Error(safeMessage);
    }
  });

export const refreshBuilderDeployment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deploymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: deployment, error } = await sb.from("builder_deployments").select(deploymentColumns).eq("id", data.id).eq("user_id", context.userId).eq("provider", "vercel").eq("target", "preview").maybeSingle();
    if (error) throw new Error(error.message);
    if (!deployment?.provider_deployment_id) throw new Error("This preview deployment does not have a Vercel deployment id yet.");

    try {
      const result = await getVercelDeployment(String(deployment.provider_deployment_id));
      const { data: updated, error: updateError } = await sb.from("builder_deployments").update({ status: result.status, provider_project_id: result.projectId ?? deployment.provider_project_id, url: result.url ?? deployment.url, last_error: result.status === "failed" ? `Vercel deployment failed (${result.rawState ?? "unknown"}).` : null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).select(deploymentColumns).maybeSingle();
      if (updateError) throw new Error(updateError.message);
      return mapDeployment(updated ?? deployment);
    } catch (refreshError) {
      console.error("[builder:deploy] refresh failed", refreshError);
      throw new Error("Could not refresh the Vercel preview deployment.");
    }
  });

export const queueBuilderProductionApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deploymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: deployment, error } = await sb.from("builder_deployments").select(deploymentColumns).eq("id", data.id).eq("user_id", context.userId).eq("provider", "vercel").eq("target", "preview").eq("status", "ready").maybeSingle();
    if (error) throw new Error(error.message);
    if (!deployment?.provider_deployment_id || !deployment?.provider_project_id) throw new Error("Refresh the ready Vercel preview before requesting production approval.");
    if (String(deployment.production_status) !== "not_started") throw new Error("Production publishing has already been started for this preview.");

    const approvalPayload = {
      provider: "vercel",
      builder_deployment_id: String(deployment.id),
      builder_job_id: String(deployment.builder_job_id),
      project_id: String(deployment.provider_project_id),
      deployment_id: String(deployment.provider_deployment_id),
      preview_url: deployment.url ? String(deployment.url) : null,
      target: "production",
    };
    const { data: approval, error: approvalError } = await sb.from("approval_requests").insert({
      user_id: context.userId,
      org_id: null,
      agent_id: null,
      task_id: null,
      title: "Publish Builder preview to Vercel Production",
      summary: "Promote the validated Vercel preview so the project's production domains serve this deployment.",
      details: approvalPayload,
      action_type: "vercel_production_promote",
      risk_level: "high",
      status: "pending",
    }).select("id,status").single();
    if (approvalError) throw new Error(approvalError.message);

    const { data: updated, error: updateError } = await sb.from("builder_deployments").update({ production_approval_id: approval.id, production_status: "approval_pending", production_last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("production_status", "not_started").select(deploymentColumns).maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updated) throw new Error("Production publish state changed before approval could be linked.");
    return mapDeployment(updated);
  });

export const refreshBuilderProductionApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deploymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: deployment, error } = await sb.from("builder_deployments").select(deploymentColumns).eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!deployment?.production_approval_id) throw new Error("No production approval is linked to this preview.");
    const { data: approval, error: approvalError } = await sb.from("approval_requests").select("id,status").eq("id", deployment.production_approval_id).eq("user_id", context.userId).maybeSingle();
    if (approvalError) throw new Error(approvalError.message);
    if (!approval) throw new Error("The linked production approval no longer exists.");
    const nextStatus = approval.status === "approved" ? "approved" : approval.status === "rejected" ? "failed" : "approval_pending";
    const { data: updated, error: updateError } = await sb.from("builder_deployments").update({ production_status: nextStatus, production_last_error: approval.status === "rejected" ? "Production publish approval was rejected." : null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).in("production_status", ["approval_pending", "approved"]).select(deploymentColumns).maybeSingle();
    if (updateError) throw new Error(updateError.message);
    return mapDeployment(updated ?? deployment);
  });

export const promoteBuilderDeploymentToProduction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deploymentInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: deployment, error } = await sb.from("builder_deployments").select(deploymentColumns).eq("id", data.id).eq("user_id", context.userId).eq("provider", "vercel").eq("target", "preview").eq("status", "ready").eq("production_status", "approved").maybeSingle();
    if (error) throw new Error(error.message);
    if (!deployment?.production_approval_id || !deployment?.provider_project_id || !deployment?.provider_deployment_id) throw new Error("This preview is not ready for approved production promotion.");
    const { data: approval, error: approvalError } = await sb.from("approval_requests").select("id,status,details").eq("id", deployment.production_approval_id).eq("user_id", context.userId).eq("status", "approved").maybeSingle();
    if (approvalError) throw new Error(approvalError.message);
    if (!approval) throw new Error("Production approval has not been granted.");
    if (String(approval.details?.deployment_id ?? "") !== String(deployment.provider_deployment_id) || String(approval.details?.project_id ?? "") !== String(deployment.provider_project_id)) throw new Error("Production approval does not match this Vercel deployment.");

    const { data: claimed, error: claimError } = await sb.from("builder_deployments").update({ production_status: "promoting", production_last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("production_status", "approved").select(deploymentColumns).maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) throw new Error("Production promotion is already being processed.");

    try {
      const result = await promoteVercelDeployment({ projectId: String(claimed.provider_project_id), deploymentId: String(claimed.provider_deployment_id) });
      const { data: updated, error: updateError } = await sb.from("builder_deployments").update({ production_status: "promoted", production_promoted_at: new Date().toISOString(), production_aliases: result.aliases, production_last_error: null, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("production_status", "promoting").select(deploymentColumns).maybeSingle();
      if (updateError) throw new Error(updateError.message);
      if (!updated) throw new Error("Production promotion state changed before completion could be persisted.");
      return mapDeployment(updated);
    } catch (promoteError) {
      console.error("[builder:deploy] production promotion failed", promoteError);
      const safeMessage = "Vercel production promotion failed. Review Vercel project/domain configuration before retrying.";
      await sb.from("builder_deployments").update({ production_status: "failed", production_last_error: safeMessage, updated_at: new Date().toISOString() }).eq("id", data.id).eq("user_id", context.userId).eq("production_status", "promoting");
      throw new Error(safeMessage);
    }
  });
