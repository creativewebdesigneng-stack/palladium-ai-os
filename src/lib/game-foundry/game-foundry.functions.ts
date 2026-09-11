import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import { resolveAssistantModelPreference } from "@/lib/ai/ai-preferences.server";
import { ProviderError } from "@/lib/runtime/model-gateway.server";
import { generateGameFoundryDesign } from "./game-foundry-plan.server";
import { generateGameFoundryContent } from "./game-foundry-content.server";
import { getGameFoundryIntegrations } from "./game-foundry-integrations.server";
import { buildGameFoundryExportManifest, gameFoundryBridgeBase, submitGameFoundryBridgeHandoff } from "./game-foundry-package.server";
import { generateBuilderSourceManifest } from "@/lib/builder/builder-source.server";
import { buildGameFoundryProjectPackage, gameFoundryPackageFilename } from "./game-foundry-project-package.server";
import {
  getGameFoundryCapabilities,
  getGameReadyProcessingCapabilities,
  submitGameFoundryAsset,
  submitGameFoundryProject,
  submitGameReadyProcessing,
} from "./game-foundry-runtime.server";

type Sb = { from: (table: string) => any };

async function resolveGameFoundryPreference(sb: Sb, userId: string) {
  let stored: { default_provider?: unknown; default_model?: unknown } | null = null;
  try {
    const result = await sb.from("user_ai_preferences").select("default_provider,default_model").eq("user_id",userId).maybeSingle();
    if (!result.error) stored = result.data;
  } catch {}
  return resolveAssistantModelPreference(stored);
}

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
        .select("id,name,prompt,target_engine,project_type,quality_profile,status,design_spec,worker_job_id,output_url,preview_url,error_message,metadata,export_manifest,handoff_status,handoff_id,handoff_error,handoff_updated_at,source_manifest,source_status,source_error,source_generated_at,package_manifest,package_status,package_error,package_prepared_at,content_manifest,content_status,content_error,content_generated_at,created_at,updated_at,completed_at")
        .eq("user_id", context.userId)
        .order("created_at",{ascending:false})
        .limit(50),
      sb.from("three_d_jobs")
        .select("id,project_id,input_name,source_url,source_storage_path,source_kind,prompt,workflow,requested_format,quality_profile,target_engine,status,worker_job_id,output_url,preview_url,error_message,metadata,processing_profile,validation_report,processed_output_url,processing_worker_job_id,processing_status,created_at,updated_at,completed_at")
        .eq("user_id", context.userId)
        .order("created_at",{ascending:false})
        .limit(100),
    ]);
    if (projects.error) throw new Error(projects.error.message);
    if (assets.error) throw new Error(assets.error.message);
    return { capabilities:{ ...getGameFoundryCapabilities(), gameReadyProcessing:getGameReadyProcessingCapabilities(), integrations:getGameFoundryIntegrations() }, projects:projects.data ?? [], assets:assets.data ?? [] };
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

export const planGameFoundryProject = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id:z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const claimed = await sb.from("game_foundry_projects")
      .update({status:"planning",error_message:null,updated_at:new Date().toISOString()})
      .eq("id",data.id).eq("user_id",context.userId).in("status",["draft","failed"])
      .select("id,name,prompt,target_engine,project_type,quality_profile").maybeSingle();
    if (claimed.error) throw new Error(claimed.error.message);
    if (!claimed.data) throw new Error("This Game Foundry project is not ready for planning.");

    const { provider, model } = await resolveGameFoundryPreference(sb, context.userId);
    try {
      const design = await generateGameFoundryDesign({
        name:claimed.data.name,
        prompt:claimed.data.prompt,
        projectType:claimed.data.project_type,
        targetEngine:claimed.data.target_engine,
        qualityProfile:claimed.data.quality_profile,
        provider,
        model,
      });
      const saved = await sb.from("game_foundry_projects")
        .update({design_spec:design,status:"planned",error_message:null,updated_at:new Date().toISOString()})
        .eq("id",data.id).eq("user_id",context.userId).eq("status","planning")
        .select("id,name,status,design_spec").maybeSingle();
      if (saved.error) throw new Error(saved.error.message);
      if (!saved.data) throw new Error("Game Foundry planning was interrupted before the design could be saved.");
      await writeAudit({ userId:context.userId, orgId:null, action:"game_foundry.design_planned", targetType:"game_foundry_project", targetId:data.id, status:"success", metadata:{provider:design.generatedBy.provider,model:design.generatedBy.model} });
      return saved.data;
    } catch (error) {
      const safe = error instanceof ProviderError && error.status === 503
        ? "AI provider is not configured."
        : error instanceof Error && error.message.startsWith("The AI game planner returned")
          ? error.message
          : "Game Foundry planning failed. Try again.";
      await sb.from("game_foundry_projects")
        .update({status:"failed",error_message:safe,updated_at:new Date().toISOString()})
        .eq("id",data.id).eq("user_id",context.userId).eq("status","planning");
      throw new Error(safe);
    }
  });

export const generateGameFoundryProject = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id:z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await sb.from("game_foundry_projects")
      .select("id,name,prompt,target_engine,project_type,quality_profile,design_spec,status")
      .eq("id",data.id).eq("user_id",context.userId).maybeSingle();
    if (project.error) throw new Error(project.error.message);
    if (!project.data) throw new Error("Game Foundry project not found.");
    const designRow = await sb.from("game_foundry_projects").select("design_spec,status").eq("id",data.id).eq("user_id",context.userId).maybeSingle();
    if (designRow.error) throw new Error(designRow.error.message);
    if (!designRow.data || designRow.data.status !== "planned" || !designRow.data.design_spec || Object.keys(designRow.data.design_spec).length === 0) {
      throw new Error("Generate and review the Game Foundry design plan before starting the game build.");
    }
    await sb.from("game_foundry_projects").update({status:"queued",error_message:null,updated_at:new Date().toISOString()}).eq("id",data.id).eq("user_id",context.userId);
    try {
      const worker = await submitGameFoundryProject({
        projectId:project.data.id,
        name:project.data.name,
        prompt:project.data.prompt,
        projectType:project.data.project_type,
        targetEngine:project.data.target_engine,
        qualityProfile:project.data.quality_profile,
        designSpec:project.data.design_spec,
      });
      const terminal = ["completed","failed","cancelled"].includes(worker.status);
      const updated = await sb.from("game_foundry_projects").update({
        status:worker.status,
        worker_job_id:worker.workerJobId,
        output_url:worker.outputUrl,
        preview_url:worker.previewUrl,
        error_message:worker.errorMessage,
        design_spec:project.data.design_spec,
        metadata:{ ...(worker.metadata && typeof worker.metadata === "object" && !Array.isArray(worker.metadata) ? worker.metadata : {}), worker_design_spec:worker.designSpec },
        completed_at:terminal ? new Date().toISOString() : null,
        updated_at:new Date().toISOString(),
      }).eq("id",data.id).eq("user_id",context.userId);
      if (updated.error) throw new Error(updated.error.message);
      return { id:data.id, ...worker };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Game generation failed";
      await sb.from("game_foundry_projects").update({status:"planned",error_message:message.slice(0,1000),completed_at:null,updated_at:new Date().toISOString()}).eq("id",data.id).eq("user_id",context.userId);
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


const gameReadyProfile = z.object({
  generatePbrMaterials: z.boolean().default(true),
  unwrapUvs: z.boolean().default(true),
  generateLods: z.boolean().default(true),
  generateCollision: z.boolean().default(true),
  optimizeTopology: z.boolean().default(true),
  rigging: z.enum(["none","auto"]).default("none"),
  animation: z.enum(["none","idle","basic"]).default("none"),
  textureResolution: z.union([z.literal(1024),z.literal(2048),z.literal(4096)]).default(2048),
  targetPolycount: z.number().int().min(500).max(5_000_000).nullable().default(null),
});

export const processGameFoundryAsset = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id:z.string().uuid(),
    profile:gameReadyProfile,
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const asset = await sb.from("three_d_jobs")
      .select("id,user_id,status,output_url,preview_url,requested_format,target_engine,processing_status")
      .eq("id",data.id).eq("user_id",context.userId).maybeSingle();
    if (asset.error) throw new Error(asset.error.message);
    if (!asset.data) throw new Error("Game Foundry asset not found.");
    if (asset.data.status !== "completed" || !asset.data.output_url) throw new Error("The source asset must complete before game-ready processing.");
    if (!["not_started","failed"].includes(String(asset.data.processing_status))) throw new Error("This asset is already being processed.");

    const claimed = await sb.from("three_d_jobs").update({
      processing_status:"queued",
      processing_profile:data.profile,
      validation_report:{},
      processed_output_url:null,
      processing_worker_job_id:null,
      updated_at:new Date().toISOString(),
    }).eq("id",data.id).eq("user_id",context.userId).in("processing_status",["not_started","failed"]).select("id").maybeSingle();
    if (claimed.error) throw new Error(claimed.error.message);
    if (!claimed.data) throw new Error("This asset is no longer ready for processing.");

    try {
      const worker = await submitGameReadyProcessing({
        sourceUrl:String(asset.data.output_url),
        targetEngine:asset.data.target_engine,
        outputFormat:String(asset.data.requested_format),
        profile:data.profile,
      });
      const update = await sb.from("three_d_jobs").update({
        processing_status:worker.status,
        processing_worker_job_id:worker.workerJobId,
        processed_output_url:worker.outputUrl,
        preview_url:worker.previewUrl ?? asset.data.preview_url,
        error_message:worker.errorMessage,
        validation_report:worker.validationReport,
        metadata:worker.metadata,
        updated_at:new Date().toISOString(),
      }).eq("id",data.id).eq("user_id",context.userId);
      if (update.error) throw new Error(update.error.message);
      await writeAudit({ userId:context.userId, orgId:null, action:"game_foundry.asset_processed", targetType:"three_d_job", targetId:data.id, status:"success", metadata:{ targetEngine:asset.data.target_engine, format:asset.data.requested_format } });
      return { id:data.id, ...worker };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Game-ready processing failed";
      await sb.from("three_d_jobs").update({
        processing_status:"failed",
        error_message:message.slice(0,1000),
        updated_at:new Date().toISOString(),
      }).eq("id",data.id).eq("user_id",context.userId);
      throw error;
    }
  });


export const prepareGameFoundryEngineHandoff = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id:z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [project, assets] = await Promise.all([
      sb.from("game_foundry_projects")
        .select("id,name,prompt,target_engine,project_type,quality_profile,design_spec")
        .eq("id",data.id).eq("user_id",context.userId).maybeSingle(),
      sb.from("three_d_jobs")
        .select("id,input_name,requested_format,output_url,processed_output_url,target_engine,validation_report,status")
        .eq("project_id",data.id).eq("user_id",context.userId).eq("status","completed")
        .order("created_at",{ascending:true}),
    ]);
    if (project.error) throw new Error(project.error.message);
    if (assets.error) throw new Error(assets.error.message);
    if (!project.data) throw new Error("Game Foundry project not found.");
    const manifest = buildGameFoundryExportManifest(project.data, assets.data ?? []);
    const bridgeConfigured = Boolean(gameFoundryBridgeBase(project.data.target_engine));
    const saved = await sb.from("game_foundry_projects").update({
      export_manifest:manifest,
      handoff_status:"prepared",
      handoff_id:null,
      handoff_error:null,
      handoff_updated_at:new Date().toISOString(),
      updated_at:new Date().toISOString(),
    }).eq("id",data.id).eq("user_id",context.userId)
      .select("id,export_manifest,handoff_status,target_engine").maybeSingle();
    if (saved.error) throw new Error(saved.error.message);
    if (!saved.data) throw new Error("Engine handoff could not be prepared.");
    await writeAudit({ userId:context.userId, orgId:null, action:"game_foundry.handoff_prepared", targetType:"game_foundry_project", targetId:data.id, status:"success", metadata:{ targetEngine:project.data.target_engine, assetCount:manifest.assets.length, bridgeConfigured } });
    return { ...saved.data, bridgeConfigured };
  });

export const sendGameFoundryEngineHandoff = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id:z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await sb.from("game_foundry_projects")
      .select("id,target_engine,export_manifest,handoff_status")
      .eq("id",data.id).eq("user_id",context.userId).maybeSingle();
    if (project.error) throw new Error(project.error.message);
    if (!project.data) throw new Error("Game Foundry project not found.");
    if (project.data.handoff_status !== "prepared" || !project.data.export_manifest || Object.keys(project.data.export_manifest).length === 0) {
      throw new Error("Prepare the engine handoff manifest before sending it.");
    }
    const claimed = await sb.from("game_foundry_projects").update({
      handoff_status:"queued",handoff_error:null,handoff_updated_at:new Date().toISOString(),updated_at:new Date().toISOString(),
    }).eq("id",data.id).eq("user_id",context.userId).eq("handoff_status","prepared").select("id").maybeSingle();
    if (claimed.error) throw new Error(claimed.error.message);
    if (!claimed.data) throw new Error("This engine handoff is no longer ready.");
    try {
      const result = await submitGameFoundryBridgeHandoff({
        engine:project.data.target_engine,
        manifest:project.data.export_manifest,
        projectId:data.id,
      });
      const status = ["completed","running","queued"].includes(result.status) ? result.status : "queued";
      const update = await sb.from("game_foundry_projects").update({
        handoff_status:status,
        handoff_id:result.handoffId,
        handoff_error:null,
        handoff_updated_at:new Date().toISOString(),
        updated_at:new Date().toISOString(),
      }).eq("id",data.id).eq("user_id",context.userId);
      if (update.error) throw new Error(update.error.message);
      await writeAudit({ userId:context.userId, orgId:null, action:"game_foundry.handoff_sent", targetType:"game_foundry_project", targetId:data.id, status:"success", metadata:{ targetEngine:project.data.target_engine, handoffId:result.handoffId } });
      return { id:data.id, ...result };
    } catch (error) {
      const message=error instanceof Error?error.message:"Engine handoff failed";
      await sb.from("game_foundry_projects").update({
        handoff_status:"prepared",handoff_error:message.slice(0,1000),handoff_updated_at:new Date().toISOString(),updated_at:new Date().toISOString(),
      }).eq("id",data.id).eq("user_id",context.userId);
      throw error;
    }
  });


export const generateGameFoundryContentManifest = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id:z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb=context.supabase as unknown as Sb;
    const claimed=await sb.from("game_foundry_projects")
      .update({content_status:"generating",content_error:null,updated_at:new Date().toISOString()})
      .eq("id",data.id).eq("user_id",context.userId)
      .eq("status","planned").in("content_status",["not_started","failed"])
      .select("id,name,prompt,target_engine,quality_profile,design_spec").maybeSingle();
    if(claimed.error) throw new Error(claimed.error.message);
    if(!claimed.data) throw new Error("Plan the Game Foundry project before generating gameplay content.");
    const {provider,model}=await resolveGameFoundryPreference(sb,context.userId);
    try{
      const manifest=await generateGameFoundryContent({
        name:claimed.data.name,
        prompt:claimed.data.prompt,
        targetEngine:claimed.data.target_engine,
        qualityProfile:claimed.data.quality_profile,
        designSpec:claimed.data.design_spec,
        provider,
        model,
      });
      const saved=await sb.from("game_foundry_projects").update({
        content_manifest:manifest,
        content_status:"generated",
        content_error:null,
        content_generated_at:new Date().toISOString(),
        updated_at:new Date().toISOString(),
      }).eq("id",data.id).eq("user_id",context.userId).eq("content_status","generating")
        .select("id,content_manifest,content_status,content_generated_at").maybeSingle();
      if(saved.error) throw new Error(saved.error.message);
      if(!saved.data) throw new Error("Game Foundry content generation was interrupted before it could be saved.");
      await writeAudit({userId:context.userId,orgId:null,action:"game_foundry.content_generated",targetType:"game_foundry_project",targetId:data.id,status:"success",metadata:{provider:manifest.generatedBy.provider,model:manifest.generatedBy.model,scenes:manifest.scenes.length,assets:manifest.assetRequirements.length}});
      return saved.data;
    }catch(error){
      const safe=error instanceof ProviderError&&error.status===503
        ?"AI provider is not configured."
        : error instanceof Error&&error.message.startsWith("The AI content compiler returned")
          ? error.message
          :"Game Foundry content generation failed. Try again.";
      await sb.from("game_foundry_projects").update({content_status:"failed",content_error:safe,updated_at:new Date().toISOString()})
        .eq("id",data.id).eq("user_id",context.userId).eq("content_status","generating");
      throw new Error(safe);
    }
  });

export const generateGameFoundrySource = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id:z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb=context.supabase as unknown as Sb;
    const claimed=await sb.from("game_foundry_projects")
      .update({source_status:"generating",source_error:null,updated_at:new Date().toISOString()})
      .eq("id",data.id).eq("user_id",context.userId)
      .eq("status","planned").in("source_status",["not_started","failed"])
      .select("id,name,prompt,target_engine,project_type,quality_profile,design_spec,content_manifest,content_status").maybeSingle();
    if(claimed.error) throw new Error(claimed.error.message);
    if(!claimed.data) throw new Error("Plan the Game Foundry project before generating engine source.");

    const {provider,model}=await resolveGameFoundryPreference(sb,context.userId);
    try{
      const engineGuidanceByTarget: Record<string,string> = {
        unity:"Generate a bounded Unity starter using C# scripts and text project/config files only. Do not emit binary scenes, prefabs, packages, Library output or credentials.",
        unreal:"Generate a bounded Unreal Engine starter using C++ source, headers, Build.cs/Target.cs and text config only. Do not claim Blueprint assets, .uasset files or compiled binaries exist.",
        godot:"Generate a bounded Godot starter using GDScript, .tscn/.tres text resources and project.godot where useful.",
        web:"Generate a bounded playable web-game starter using browser-native JavaScript, HTML and CSS with no vendored dependencies. Always include index.html. Avoid module imports, remote scripts, remote stylesheets, network APIs and external assets so Blackstar can run the generated game inside a network-blocked sandboxed preview.",
        blender:"Generate a bounded Blender-oriented starter using Python automation/scripts and text configuration only. Do not claim a .blend binary was created.",
        generic:"Generate a portable game prototype source starter using text source/config files only.",
      };
      const engineGuidance = engineGuidanceByTarget[String(claimed.data.target_engine)] ?? engineGuidanceByTarget["generic"]!;
      const source=await generateBuilderSourceManifest({
        title:claimed.data.name,
        prompt:[
          claimed.data.prompt,
          `Target engine: ${claimed.data.target_engine}`,
          `Project type: ${claimed.data.project_type}`,
          `Quality profile: ${claimed.data.quality_profile}`,
          engineGuidance,
          "This is a Blackstar Game Foundry project. Keep generated code bounded, game-oriented, and compatible with the approved design. Linked 3D assets are managed separately; reference import locations/placeholders rather than inventing binary asset files.",
          claimed.data.content_status === "generated" ? `Compiled gameplay/world content:\n${JSON.stringify(claimed.data.content_manifest)}` : "No compiled gameplay/world content manifest is available yet; do not invent one as already approved.",
        ].join("\n\n"),
        plan:claimed.data.design_spec,
        provider,
        model,
      });
      const saved=await sb.from("game_foundry_projects").update({
        source_manifest:source,source_status:"generated",source_error:null,source_generated_at:new Date().toISOString(),updated_at:new Date().toISOString(),
      }).eq("id",data.id).eq("user_id",context.userId).eq("source_status","generating")
        .select("id,source_manifest,source_status,source_generated_at").maybeSingle();
      if(saved.error) throw new Error(saved.error.message);
      if(!saved.data) throw new Error("Game Foundry source generation was interrupted before it could be saved.");
      await writeAudit({userId:context.userId,orgId:null,action:"game_foundry.source_generated",targetType:"game_foundry_project",targetId:data.id,status:"success",metadata:{provider:source.generatedBy.provider,model:source.generatedBy.model,targetEngine:claimed.data.target_engine,fileCount:source.files.length}});
      return saved.data;
    }catch(error){
      const safe=error instanceof ProviderError&&error.status===503
        ?"AI provider is not configured."
        : error instanceof Error&&error.message.startsWith("The AI source generator returned")
          ? error.message
          :"Game Foundry source generation failed. Try again.";
      await sb.from("game_foundry_projects").update({source_status:"failed",source_error:safe,updated_at:new Date().toISOString()})
        .eq("id",data.id).eq("user_id",context.userId).eq("source_status","generating");
      throw new Error(safe);
    }
  });


export const prepareGameFoundryProjectPackage = createServerFn({ method:"POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id:z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb=context.supabase as unknown as Sb;
    const project=await sb.from("game_foundry_projects")
      .select("id,name,prompt,target_engine,project_type,quality_profile,design_spec,source_manifest,source_status,export_manifest,handoff_status")
      .eq("id",data.id).eq("user_id",context.userId).maybeSingle();
    if(project.error) throw new Error(project.error.message);
    if(!project.data) throw new Error("Game Foundry project not found.");
    if(project.data.source_status!=="generated") throw new Error("Generate the engine source before preparing the project package.");
    try{
      const packageManifest=buildGameFoundryProjectPackage({project:project.data});
      const saved=await sb.from("game_foundry_projects").update({
        package_manifest:packageManifest,
        package_status:"prepared",
        package_error:null,
        package_prepared_at:new Date().toISOString(),
        updated_at:new Date().toISOString(),
      }).eq("id",data.id).eq("user_id",context.userId)
        .select("id,name,target_engine,package_manifest,package_status,package_prepared_at").maybeSingle();
      if(saved.error) throw new Error(saved.error.message);
      if(!saved.data) throw new Error("Game Foundry project package could not be prepared.");
      await writeAudit({userId:context.userId,orgId:null,action:"game_foundry.package_prepared",targetType:"game_foundry_project",targetId:data.id,status:"success",metadata:{targetEngine:project.data.target_engine,sourceFileCount:packageManifest.assembly.sourceFileCount,linkedAssetCount:packageManifest.assembly.linkedAssetCount}});
      return {
        ...saved.data,
        filename:gameFoundryPackageFilename(saved.data.name,saved.data.target_engine),
      };
    }catch(error){
      const message=error instanceof Error?error.message:"Game Foundry package preparation failed.";
      await sb.from("game_foundry_projects").update({package_status:"failed",package_error:message.slice(0,1000),updated_at:new Date().toISOString()})
        .eq("id",data.id).eq("user_id",context.userId);
      throw error;
    }
  });
