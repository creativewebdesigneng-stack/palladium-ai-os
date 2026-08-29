import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import { getThreeDJob, getThreeDRuntimeCapabilities, submitThreeDJob } from "./three-d-runtime.server";

type ToolContext = { userId: string; sb: { from: (table: string) => any } };

export const THREE_D_STUDIO_TOOL_DEF: ToolDef = {
  name: "three_d_studio",
  description: "Create and inspect bounded image-to-3D generation jobs through the configured Modly-compatible worker. Reuses PalladiumAI tool grants, Harness policy and execution audit; accepts no credentials or arbitrary server paths.",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["capabilities", "list", "create", "status"] },
      input_name: { type: "string", maxLength: 240 },
      source_url: { type: "string", description: "Public http(s) image URL for create." },
      output_format: { type: "string", enum: ["glb","gltf","obj","ply","stl","vox"] },
      job_id: { type: "string", description: "PalladiumAI 3D job UUID for status." },
    },
    required: ["action"],
  },
};

export async function runThreeDStudioTool(input: Record<string, unknown>, ctx: ToolContext): Promise<unknown> {
  const action = typeof input["action"] === "string" ? input["action"] : "";
  if (action === "capabilities") return getThreeDRuntimeCapabilities();
  if (action === "list") {
    const result = await ctx.sb.from("three_d_jobs").select("id,input_name,workflow,requested_format,status,output_url,preview_url,error_message,created_at,updated_at,completed_at").eq("user_id", ctx.userId).order("created_at", { ascending: false }).limit(25);
    if (result.error) throw new Error(result.error.message);
    return { jobs: result.data ?? [] };
  }
  if (action === "create") {
    const inputName = typeof input["input_name"] === "string" ? input["input_name"].trim().slice(0, 240) : "3D asset";
    const sourceUrl = typeof input["source_url"] === "string" ? input["source_url"].trim() : "";
    const outputFormat = typeof input["output_format"] === "string" ? input["output_format"].toLowerCase() : "glb";
    if (!sourceUrl || sourceUrl.length > 4000) throw new Error("A bounded public source_url is required.");
    if (!["glb","gltf","obj","ply","stl","vox"].includes(outputFormat)) throw new Error("Unsupported 3D output format.");
    const created = await ctx.sb.from("three_d_jobs").insert({ user_id: ctx.userId, input_name: inputName || "3D asset", source_url: sourceUrl, workflow: "image-to-mesh", requested_format: outputFormat, status: "queued" }).select("id").single();
    if (created.error) throw new Error(created.error.message);
    try {
      const worker = await submitThreeDJob({ sourceUrl, outputFormat });
      const completedAt = ["completed","failed","cancelled"].includes(worker.status) ? new Date().toISOString() : null;
      const updated = await ctx.sb.from("three_d_jobs").update({ worker_job_id: worker.workerJobId, status: worker.status, output_url: worker.outputUrl, preview_url: worker.previewUrl, error_message: worker.errorMessage, metadata: worker.metadata, completed_at: completedAt, updated_at: new Date().toISOString() }).eq("id", created.data.id).eq("user_id", ctx.userId);
      if (updated.error) throw new Error(updated.error.message);
      return { id: created.data.id, ...worker };
    } catch (error) {
      const message = error instanceof Error ? error.message : "3D generation failed";
      await ctx.sb.from("three_d_jobs").update({ status: "failed", error_message: message.slice(0, 1000), completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", created.data.id).eq("user_id", ctx.userId);
      throw error;
    }
  }
  if (action === "status") {
    const id = typeof input["job_id"] === "string" ? input["job_id"].trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("A valid 3D job id is required.");
    const job = await ctx.sb.from("three_d_jobs").select("id,worker_job_id,status,output_url,preview_url,error_message").eq("id", id).eq("user_id", ctx.userId).maybeSingle();
    if (job.error) throw new Error(job.error.message);
    if (!job.data) throw new Error("3D job not found or access denied.");
    if (!job.data.worker_job_id || ["completed","failed","cancelled"].includes(String(job.data.status))) return job.data;
    const worker = await getThreeDJob(String(job.data.worker_job_id));
    const completedAt = ["completed","failed","cancelled"].includes(worker.status) ? new Date().toISOString() : null;
    const updated = await ctx.sb.from("three_d_jobs").update({ status: worker.status, output_url: worker.outputUrl, preview_url: worker.previewUrl, error_message: worker.errorMessage, metadata: worker.metadata, completed_at: completedAt, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.userId);
    if (updated.error) throw new Error(updated.error.message);
    return { id, ...worker };
  }
  return { error: "action must be capabilities, list, create or status." };
}
