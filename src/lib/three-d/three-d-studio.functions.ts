import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import { getThreeDJob, getThreeDRuntimeCapabilities, submitThreeDJob } from "./three-d-runtime.server";

type Sb = { from: (table: string) => any };
const outputFormat = z.enum(["glb","gltf","obj","ply","stl","vox"]);

export const getThreeDStudioOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from("three_d_jobs").select("id,input_name,source_url,workflow,requested_format,status,worker_job_id,output_url,preview_url,error_message,metadata,created_at,updated_at,completed_at").order("created_at", { ascending: false }).limit(100);
    if (result.error) throw new Error(result.error.message);
    return { capabilities: getThreeDRuntimeCapabilities(), jobs: result.data ?? [] };
  });

export const createThreeDJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ inputName: z.string().trim().min(1).max(240), sourceUrl: z.string().url().max(4000), outputFormat }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const created = await sb.from("three_d_jobs").insert({ user_id: context.userId, input_name: data.inputName, source_url: data.sourceUrl, workflow: "image-to-mesh", requested_format: data.outputFormat, status: "queued" }).select("id").single();
    if (created.error) throw new Error(created.error.message);
    try {
      const worker = await submitThreeDJob(data);
      const completedAt = ["completed","failed","cancelled"].includes(worker.status) ? new Date().toISOString() : null;
      const update = await sb.from("three_d_jobs").update({ worker_job_id: worker.workerJobId, status: worker.status, output_url: worker.outputUrl, preview_url: worker.previewUrl, error_message: worker.errorMessage, metadata: worker.metadata, completed_at: completedAt, updated_at: new Date().toISOString() }).eq("id", created.data.id);
      if (update.error) throw new Error(update.error.message);
      await writeAudit({ userId: context.userId, orgId: null, action: "three_d.submitted", targetType: "three_d_job", targetId: created.data.id, status: "success", metadata: { format: data.outputFormat, provider: "modly-compatible" } });
      return { id: created.data.id, ...worker };
    } catch (error) {
      const message = error instanceof Error ? error.message : "3D generation failed";
      await sb.from("three_d_jobs").update({ status: "failed", error_message: message.slice(0, 1000), completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", created.data.id);
      throw error;
    }
  });

export const refreshThreeDJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const job = await sb.from("three_d_jobs").select("id,worker_job_id").eq("id", data.id).maybeSingle();
    if (job.error) throw new Error(job.error.message);
    if (!job.data) throw new Error("3D job not found or access denied.");
    if (!job.data.worker_job_id) throw new Error("This 3D job was not accepted by the worker.");
    const worker = await getThreeDJob(String(job.data.worker_job_id));
    const completedAt = ["completed","failed","cancelled"].includes(worker.status) ? new Date().toISOString() : null;
    const updated = await sb.from("three_d_jobs").update({ status: worker.status, output_url: worker.outputUrl, preview_url: worker.previewUrl, error_message: worker.errorMessage, metadata: worker.metadata, completed_at: completedAt, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (updated.error) throw new Error(updated.error.message);
    return { id: data.id, ...worker };
  });
