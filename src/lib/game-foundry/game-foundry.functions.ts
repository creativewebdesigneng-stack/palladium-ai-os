import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import {
  getGameFoundryCapabilities,
  submitGameFoundryAsset,
  submitGameFoundryProject,
} from "./game-foundry-runtime.server";

type Sb = { from: (table: string) => any };

const engine = z.enum(["generic","unity","unreal","godot","web","blender"]);
const quality = z.enum(["prototype","game_ready","cinematic"]);
const assetQuality = z.enum(["draft","game_ready","cinematic"]);
const projectType = z.enum(["game","environment","character","prop","vehicle","asset_pack"]);
const sourceKind = z.enum(["prompt","image","model"]);
const outputFormat = z.enum(["glb","gltf","fbx","obj","usd","ply","stl","vox"]);

export const getGameFoundryOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const [projects, assets] = await Promise.all([
      sb.from("game_foundry_projects")
        .select("id,name,prompt,target_engine,project_type,quality_profile,status,design_spec,worker_job_id,output_url,preview_url,error_message,metadata,created_at,updated_at,completed_at")
        .eq("user_id", context.userId)
        .order("created_at",{ascending:false})
        .limit(50),
      sb.from("three_d_jobs")
        .select("id,project_id,input_name,source_url,source_kind,prompt,workflow,requested_format,quality_profile,target_engine,status,worker_job_id,output_url,preview_url,error_message,metadata,created_at,updated_at,completed_at")
        .eq("user_id", context.userId)
        .order("created_at",{ascending:false})
        .limit(100),
    ]);
    if (projects.error) throw new Error(projects.error.message);
    if (assets.error) throw new Error(assets.error.message);
    return { capabilities:getGameFoundryCapabilities(), projects:projects.data ?? [], assets:assets.data ?? [] };
  });

export const createGameFoundryProject = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    name:z.string().trim().min(1).max(160),
    prompt:z.string().trim().min(1).max(20_000),
    targetEngine:engine,
    projectType,
    qualityProfile:quality,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const created = await sb.from("game_foundry_projects").insert({
      user_id:context.userId,
      name:data.name,
      prompt:data.prompt,
      target_engine:data.targetEngine,
      project_type:data.projectType,
      quality_profile:data.qualityProfile,
      status:"draft",
    }).select("id,name,status").single();
    if (created.error) throw new Error(created.error.message);
    await writeAudit({ userId:context.userId, orgId:null, action:"game_foundry.project_created", targetType:"game_foundry_project", targetId:created.data.id, status:"success", metadata:{ targetEngine:data.targetEngine, projectType:data.projectType, qualityProfile:data.qualityProfile } });
    return created.data;
  });

export const generateGameFoundryProject = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id:z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await sb.from("game_foundry_projects")
      .select("id,name,prompt,target_engine,project_type,quality_profile")
      .eq("id",data.id).eq("user_id",context.userId).maybeSingle();
    if (project.error) throw new Error(project.error.message);
    if (!project.data) throw new Error("Game Foundry project not found.");
    await sb.from("game_foundry_projects").update({status:"queued",error_message:null,updated_at:new Date().toISOString()}).eq("id",data.id).eq("user_id",context.userId);
    try {
      const worker = await submitGameFoundryProject({
        projectId:project.data.id,
        name:project.data.name,
        prompt:project.data.prompt,
        projectType:project.data.project_type,
        targetEngine:project.data.target_engine,
        qualityProfile:project.data.quality_profile,
      });
      const terminal = ["completed","failed","cancelled"].includes(worker.status);
      const updated = await sb.from("game_foundry_projects").update({
        status:worker.status,
        worker_job_id:worker.workerJobId,
        output_url:worker.outputUrl,
        preview_url:worker.previewUrl,
        error_message:worker.errorMessage,
        design_spec:worker.designSpec,
        metadata:worker.metadata,
        completed_at:terminal ? new Date().toISOString() : null,
        updated_at:new Date().toISOString(),
      }).eq("id",data.id).eq("user_id",context.userId);
      if (updated.error) throw new Error(updated.error.message);
      return { id:data.id, ...worker };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Game generation failed";
      await sb.from("game_foundry_projects").update({status:"failed",error_message:message.slice(0,1000),completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",data.id).eq("user_id",context.userId);
      throw error;
    }
  });

export const createGameFoundryAsset = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    projectId:z.string().uuid().nullable().optional(),
    inputName:z.string().trim().min(1).max(240),
    sourceKind,
    prompt:z.string().trim().max(10_000).nullable().optional(),
    sourceUrl:z.string().url().max(4000).nullable().optional(),
    storagePath:z.string().trim().max(500).nullable().optional(),
    outputFormat,
    qualityProfile:assetQuality,
    targetEngine:engine,
  }).superRefine((value,ctx)=>{
    if (value.sourceKind === "prompt" && !value.prompt?.trim()) ctx.addIssue({code:"custom",path:["prompt"],message:"Prompt-to-3D requires a prompt."});
    if (value.sourceKind !== "prompt" && !value.sourceUrl && !value.storagePath) ctx.addIssue({code:"custom",path:["sourceUrl"],message:"Image/model workflows require an uploaded source or public source URL."});
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (data.projectId) {
      const owner = await sb.from("game_foundry_projects").select("id").eq("id",data.projectId).eq("user_id",context.userId).maybeSingle();
      if (owner.error) throw new Error(owner.error.message);
      if (!owner.data) throw new Error("Game Foundry project not found.");
    }
    let resolvedSourceUrl = data.sourceUrl ?? null;
    if (data.storagePath) {
      const expectedPrefix = `${context.userId}/`;
      if (!data.storagePath.startsWith(expectedPrefix)) throw new Error("Uploaded source path is not owned by this account.");
      const storageClient = (context.supabase as any).storage;
      const { data: signed, error: signedError } = await storageClient
        .from("game-foundry")
        .createSignedUrl(data.storagePath, 300);
      if (signedError || !signed?.signedUrl) throw new Error("Could not prepare the private Game Foundry source for generation.");
      resolvedSourceUrl = signed.signedUrl;
    }

    const created = await sb.from("three_d_jobs").insert({
      user_id:context.userId,
      project_id:data.projectId ?? null,
      input_name:data.inputName,
      source_url:data.sourceUrl ?? null,
      source_storage_path:data.storagePath ?? null,
      source_kind:data.sourceKind,
      prompt:data.prompt?.trim() || null,
      workflow:`${data.sourceKind}-to-mesh`,
      requested_format:data.outputFormat,
      quality_profile:data.qualityProfile,
      target_engine:data.targetEngine,
      status:"queued",
    }).select("id").single();
    if (created.error) throw new Error(created.error.message);
    try {
      const worker = await submitGameFoundryAsset({
        sourceKind: data.sourceKind,
        prompt: data.prompt ?? null,
        sourceUrl: resolvedSourceUrl,
        outputFormat: data.outputFormat,
        qualityProfile: data.qualityProfile,
        targetEngine: data.targetEngine,
      });
      const terminal = ["completed","failed","cancelled"].includes(worker.status);
      const updated = await sb.from("three_d_jobs").update({
        worker_job_id:worker.workerJobId,
        status:worker.status,
        output_url:worker.outputUrl,
        preview_url:worker.previewUrl,
        error_message:worker.errorMessage,
        metadata:worker.metadata,
        completed_at:terminal ? new Date().toISOString() : null,
        updated_at:new Date().toISOString(),
      }).eq("id",created.data.id).eq("user_id",context.userId);
      if (updated.error) throw new Error(updated.error.message);
      await writeAudit({ userId:context.userId, orgId:null, action:"game_foundry.asset_submitted", targetType:"three_d_job", targetId:created.data.id, status:"success", metadata:{ sourceKind:data.sourceKind, format:data.outputFormat, targetEngine:data.targetEngine, qualityProfile:data.qualityProfile } });
      return { id:created.data.id, ...worker };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Asset generation failed";
      await sb.from("three_d_jobs").update({status:"failed",error_message:message.slice(0,1000),completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",created.data.id).eq("user_id",context.userId);
      throw error;
    }
  });
