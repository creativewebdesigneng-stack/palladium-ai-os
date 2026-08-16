import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createVercelPreviewDeployment, getVercelDeployment } from "./builder-deploy-vercel.server";

type Sb = { from: (table: string) => any };

const jobInput = z.object({ id: z.string().uuid() });
const deploymentInput = z.object({ id: z.string().uuid() });
const deploymentColumns = "id,builder_job_id,provider,target,status,provider_deployment_id,url,last_error,created_at,updated_at";

function mapDeployment(row: any) {
  return {
    id: String(row.id),
    builderJobId: String(row.builder_job_id),
    provider: String(row.provider),
    target: String(row.target),
    status: String(row.status),
    providerDeploymentId: row.provider_deployment_id ? String(row.provider_deployment_id) : null,
    url: row.url ? String(row.url) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const listBuilderDeployments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("builder_deployments")
      .select(deploymentColumns)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapDeployment);
  });

export const createBuilderPreviewDeployment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: job, error: jobError } = await sb
      .from("builder_jobs")
      .select("id,title,source_manifest,source_status,repository_status,sandbox_status")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("source_status", "generated")
      .eq("repository_status", "files_applied")
      .eq("sandbox_status", "passed")
      .maybeSingle();
    if (jobError) throw new Error(jobError.message);
    if (!job?.source_manifest) throw new Error("This build request must pass isolated validation before preview deployment.");

    const { data: existing, error: existingError } = await sb
      .from("builder_deployments")
      .select("id")
      .eq("builder_job_id", data.id)
      .eq("user_id", context.userId)
      .eq("target", "preview")
      .in("status", ["queued", "uploading", "building"])
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) throw new Error("A preview deployment is already active for this build request.");

    const now = new Date().toISOString();
    const { data: queued, error: insertError } = await sb
      .from("builder_deployments")
      .insert({
        builder_job_id: data.id,
        user_id: context.userId,
        provider: "vercel",
        target: "preview",
        status: "uploading",
        created_at: now,
        updated_at: now,
      })
      .select(deploymentColumns)
      .single();
    if (insertError) throw new Error(insertError.message);

    try {
      const result = await createVercelPreviewDeployment({ title: `${String(job.title)}-${String(job.id).slice(0, 8)}`, sourceManifest: job.source_manifest });
      const { data: updated, error: updateError } = await sb
        .from("builder_deployments")
        .update({
          provider_deployment_id: result.id,
          url: result.url,
          status: result.status,
          last_error: result.status === "failed" ? `Vercel deployment failed (${result.rawState ?? "unknown"}).` : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", queued.id)
        .eq("user_id", context.userId)
        .eq("status", "uploading")
        .select(deploymentColumns)
        .maybeSingle();
      if (updateError) throw new Error(updateError.message);
      if (!updated) throw new Error("Preview deployment state changed before it could be persisted.");
      return mapDeployment(updated);
    } catch (error) {
      const safeMessage = error instanceof Error && error.message === "Vercel preview deployment is not configured."
        ? error.message
        : "Vercel preview deployment failed. Review the deployment configuration and retry.";
      const { error: failureError } = await sb
        .from("builder_deployments")
        .update({ status: "failed", last_error: safeMessage, updated_at: new Date().toISOString() })
        .eq("id", queued.id)
        .eq("user_id", context.userId)
        .in("status", ["queued", "uploading"]);
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
    const { data: deployment, error } = await sb
      .from("builder_deployments")
      .select(deploymentColumns)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("provider", "vercel")
      .eq("target", "preview")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!deployment?.provider_deployment_id) throw new Error("This preview deployment does not have a Vercel deployment id yet.");
    if (["ready", "failed", "cancelled"].includes(String(deployment.status))) return mapDeployment(deployment);

    try {
      const result = await getVercelDeployment(String(deployment.provider_deployment_id));
      const { data: updated, error: updateError } = await sb
        .from("builder_deployments")
        .update({
          status: result.status,
          url: result.url ?? deployment.url,
          last_error: result.status === "failed" ? `Vercel deployment failed (${result.rawState ?? "unknown"}).` : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select(deploymentColumns)
        .maybeSingle();
      if (updateError) throw new Error(updateError.message);
      return mapDeployment(updated ?? deployment);
    } catch (refreshError) {
      console.error("[builder:deploy] refresh failed", refreshError);
      throw new Error("Could not refresh the Vercel preview deployment.");
    }
  });
