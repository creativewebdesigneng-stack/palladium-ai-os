import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import { getGameFoundryCapabilities, getGameReadyProcessingCapabilities, getGameFoundryAssetJob, getGameFoundryProjectJob, getGameReadyProcessingJob, submitGameFoundryAsset, submitGameFoundryProject, submitGameReadyProcessing } from "./game-foundry-runtime.server";
import { resolveAssistantModelPreference } from "@/lib/ai/ai-preferences.server";
import { generateGameFoundryDesign } from "./game-foundry-plan.server";
import { generateGameFoundryContent } from "./game-foundry-content.server";
import { buildGameFoundryExportManifest, gameFoundryBridgeBase, getGameFoundryBridgeHandoff, submitGameFoundryBridgeHandoff } from "./game-foundry-package.server";
import { buildGameFoundryProjectPackage, gameFoundryPackageFilename } from "./game-foundry-project-package.server";
import { probeGameFoundryConnections } from "./game-foundry-integrations.server";
import { auditGameFoundryReadiness } from "./game-foundry-readiness.server";

type ToolContext = { userId: string; sb: { from: (table: string) => any } };

const ENGINES = ["generic","unity","unreal","godot","web","blender"] as const;
const FORMATS = ["glb","gltf","fbx","obj","usd","ply","stl","vox"] as const;

export const GAME_FOUNDRY_TOOL_DEF: ToolDef = {
  name: "game_foundry",
  description: "Plan Blackstar Game Foundry projects and submit real configured 3D/game generation jobs. It never fabricates completed assets or engine integrations.",
  parameters: {
    type: "object",
    properties: {
      action: { type:"string", enum:["capabilities","connection_health","list_projects","create_project","plan_project","generate_content","generate_required_assets","create_asset","process_asset","refresh_asset","generate_project","refresh_project","prepare_handoff","send_handoff","refresh_handoff","prepare_package","audit_readiness","certify_project"] },
      project_id: { type:"string" },
      name: { type:"string", maxLength:240 },
      prompt: { type:"string", maxLength:20000 },
      project_type: { type:"string", enum:["game","environment","character","prop","vehicle","asset_pack"] },
      target_engine: { type:"string", enum:[...ENGINES] },
      quality_profile: { type:"string", enum:["prototype","draft","game_ready","cinematic"] },
      source_kind: { type:"string", enum:["prompt","image","model"] },
      source_url: { type:"string", maxLength:4000 },
      output_format: { type:"string", enum:[...FORMATS] },
    },
    required:["action"],
  },
};

function text(input: Record<string,unknown>, key: string, max: number) {
  return typeof input[key] === "string" ? String(input[key]).trim().slice(0,max) : "";
}

async function resolvePreference(ctx: ToolContext) {
  let stored: { default_provider?: unknown; default_model?: unknown } | null = null;
  try {
    const result = await ctx.sb.from("user_ai_preferences").select("default_provider,default_model").eq("user_id",ctx.userId).maybeSingle();
    if (!result.error) stored = result.data;
  } catch {}
  return resolveAssistantModelPreference(stored);
}

export async function runGameFoundryTool(input: Record<string, unknown>, ctx: ToolContext) {
  const action = text(input,"action",40);
  if (action === "capabilities") return { ...getGameFoundryCapabilities(), gameReadyProcessing:getGameReadyProcessingCapabilities() };
  if (action === "connection_health") return probeGameFoundryConnections();
  if (action === "list_projects") {
    const result = await ctx.sb.from("game_foundry_projects")
      .select("id,name,target_engine,project_type,quality_profile,status,output_url,preview_url,error_message,created_at,updated_at")
      .eq("user_id",ctx.userId).order("created_at",{ascending:false}).limit(25);
    if (result.error) throw new Error(result.error.message);
    return { projects:result.data ?? [] };
  }
  if (action === "create_project") {
    const name = text(input,"name",160);
    const prompt = text(input,"prompt",20000);
    const projectType = text(input,"project_type",40) || "game";
    const targetEngine = text(input,"target_engine",40) || "generic";
    const qualityProfile = text(input,"quality_profile",40) || "game_ready";
    if (!name || !prompt) throw new Error("create_project requires name and prompt.");
    if (!ENGINES.includes(targetEngine as any)) throw new Error("Unsupported target engine.");
    if (!["prototype","game_ready","cinematic"].includes(qualityProfile)) throw new Error("Unsupported project quality profile.");
    if (!["game","environment","character","prop","vehicle","asset_pack"].includes(projectType)) throw new Error("Unsupported project type.");
    const created = await ctx.sb.from("game_foundry_projects").insert({
      user_id:ctx.userId,name,prompt,project_type:projectType,target_engine:targetEngine,quality_profile:qualityProfile,status:"draft",
    }).select("id,name,status").single();
    if (created.error) throw new Error(created.error.message);
    return created.data;
  }
  if (action === "plan_project") {
    const projectId = text(input,"project_id",60);
    if (!projectId) throw new Error("plan_project requires project_id.");
    const claimed = await ctx.sb.from("game_foundry_projects")
      .update({status:"planning",error_message:null,updated_at:new Date().toISOString()})
      .eq("id",projectId).eq("user_id",ctx.userId).in("status",["draft","failed"])
      .select("id,name,prompt,target_engine,project_type,quality_profile").maybeSingle();
    if (claimed.error) throw new Error(claimed.error.message);
    if (!claimed.data) throw new Error("This Game Foundry project is not ready for planning.");
    const { provider, model } = await resolvePreference(ctx);
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
      const saved = await ctx.sb.from("game_foundry_projects")
        .update({design_spec:design,status:"planned",error_message:null,updated_at:new Date().toISOString()})
        .eq("id",projectId).eq("user_id",ctx.userId).eq("status","planning")
        .select("id,name,status,design_spec").maybeSingle();
      if (saved.error) throw new Error(saved.error.message);
      if (!saved.data) throw new Error("Game Foundry planning was interrupted before the design could be saved.");
      return saved.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Game Foundry planning failed.";
      await ctx.sb.from("game_foundry_projects")
        .update({status:"failed",error_message:message.slice(0,1000),updated_at:new Date().toISOString()})
        .eq("id",projectId).eq("user_id",ctx.userId).eq("status","planning");
      throw error;
    }
  }
  if (action === "generate_content") {
    const projectId=text(input,"project_id",60);
    if (!projectId) throw new Error("generate_content requires project_id.");
    const claimed=await ctx.sb.from("game_foundry_projects")
      .update({content_status:"generating",content_error:null,updated_at:new Date().toISOString()})
      .eq("id",projectId).eq("user_id",ctx.userId).eq("status","planned").in("content_status",["not_started","failed"])
      .select("id,name,prompt,target_engine,quality_profile,design_spec").maybeSingle();
    if(claimed.error) throw new Error(claimed.error.message);
    if(!claimed.data) throw new Error("Plan the Game Foundry project before generating gameplay content.");
    const {provider,model}=await resolvePreference(ctx);
    try{
      const manifest=await generateGameFoundryContent({
        name:claimed.data.name,prompt:claimed.data.prompt,targetEngine:claimed.data.target_engine,
        qualityProfile:claimed.data.quality_profile,designSpec:claimed.data.design_spec,provider,model,
      });
      const update=await ctx.sb.from("game_foundry_projects").update({
        content_manifest:manifest,content_status:"generated",content_error:null,content_generated_at:new Date().toISOString(),updated_at:new Date().toISOString(),
      }).eq("id",projectId).eq("user_id",ctx.userId).eq("content_status","generating");
      if(update.error) throw new Error(update.error.message);
      return {projectId,manifest};
    }catch(error){
      const message=error instanceof Error?error.message:"Game Foundry content generation failed.";
      await ctx.sb.from("game_foundry_projects").update({content_status:"failed",content_error:message.slice(0,1000),updated_at:new Date().toISOString()})
        .eq("id",projectId).eq("user_id",ctx.userId).eq("content_status","generating");
      throw error;
    }
  }
  if (action === "generate_required_assets") {
    const projectId=text(input,"project_id",60);
    if(!projectId) throw new Error("generate_required_assets requires project_id.");
    const project=await ctx.sb.from("game_foundry_projects")
      .select("id,name,target_engine,quality_profile,content_manifest,content_status")
      .eq("id",projectId).eq("user_id",ctx.userId).maybeSingle();
    if(project.error) throw new Error(project.error.message);
    if(!project.data) throw new Error("Game Foundry project not found.");
    if(project.data.content_status!=="generated") throw new Error("Generate the approved gameplay/world content before generating required 3D assets.");
    const requirements=Array.isArray(project.data.content_manifest?.assetRequirements)?project.data.content_manifest.assetRequirements:[];
    const supported=new Set(["environment","character","prop","vehicle","weapon"]);
    const eligible=requirements.filter((item:any)=>item&&typeof item.id==="string"&&typeof item.name==="string"&&typeof item.description==="string"&&supported.has(String(item.kind))).slice(0,6);
    if(!eligible.length) throw new Error("This content manifest has no supported 3D asset requirements.");
    const existing=await ctx.sb.from("three_d_jobs").select("content_requirement_id").eq("project_id",projectId).eq("user_id",ctx.userId).not("content_requirement_id","is",null);
    if(existing.error) throw new Error(existing.error.message);
    const seen=new Set((existing.data??[]).map((row:any)=>String(row.content_requirement_id)));
    const pending=eligible.filter((item:any)=>!seen.has(String(item.id)));
    if(!pending.length) throw new Error("The selected Game Foundry asset requirements already have linked 3D jobs.");
    const targetEngine=project.data.target_engine;
    const outputFormat=["unreal","unity"].includes(targetEngine)?"fbx":"glb";
    const qualityProfile=project.data.quality_profile==="cinematic"?"cinematic":project.data.quality_profile==="prototype"?"draft":"game_ready";
    const results:any[]=[];
    for(const requirement of pending){
      const prompt=`Create a ${requirement.kind} asset for the game project "${project.data.name}". ${requirement.description} Target engine: ${targetEngine}. Quality target: ${qualityProfile}. Produce clean game-ready geometry and physically based material readiness.`;
      const created=await ctx.sb.from("three_d_jobs").insert({
        user_id:ctx.userId,project_id:projectId,content_requirement_id:String(requirement.id),input_name:String(requirement.name).slice(0,240),
        source_url:null,source_kind:"prompt",prompt,workflow:"prompt-to-mesh",requested_format:outputFormat,quality_profile:qualityProfile,target_engine:targetEngine,status:"queued",
      }).select("id").single();
      if(created.error) throw new Error(created.error.message);
      try{
        const worker=await submitGameFoundryAsset({sourceKind:"prompt",prompt,sourceUrl:null,outputFormat,qualityProfile,targetEngine});
        const terminal=["completed","failed","cancelled"].includes(worker.status);
        const update=await ctx.sb.from("three_d_jobs").update({
          worker_job_id:worker.workerJobId,status:worker.status,output_url:worker.outputUrl,preview_url:worker.previewUrl,error_message:worker.errorMessage,
          metadata:{provider:worker.provider,response:worker.metadata},completed_at:terminal?new Date().toISOString():null,updated_at:new Date().toISOString(),
        }).eq("id",created.data.id).eq("user_id",ctx.userId);
        if(update.error) throw new Error(update.error.message);
        results.push({id:created.data.id,requirementId:String(requirement.id),status:worker.status});
      }catch(error){
        const message=error instanceof Error?error.message:"Required 3D asset generation failed";
        await ctx.sb.from("three_d_jobs").update({status:"failed",error_message:message.slice(0,1000),completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",created.data.id).eq("user_id",ctx.userId);
        results.push({id:created.data.id,requirementId:String(requirement.id),status:"failed"});
      }
    }
    return {projectId,results};
  }
  if (action === "create_asset") {
    const name = text(input,"name",240) || "Game asset";
    const sourceKind = text(input,"source_kind",20) || "prompt";
    const prompt = text(input,"prompt",10000);
    const sourceUrl = text(input,"source_url",4000);
    const outputFormat = text(input,"output_format",20) || "glb";
    const targetEngine = text(input,"target_engine",40) || "generic";
    const qualityProfile = text(input,"quality_profile",40) || "game_ready";
    const projectId = text(input,"project_id",60) || null;
    if (!["prompt","image","model"].includes(sourceKind)) throw new Error("Unsupported source kind.");
    if (!FORMATS.includes(outputFormat as any)) throw new Error("Unsupported output format.");
    if (!ENGINES.includes(targetEngine as any)) throw new Error("Unsupported target engine.");
    if (sourceKind === "prompt" && !prompt) throw new Error("Prompt-to-3D requires a prompt.");
    if (sourceKind !== "prompt" && !sourceUrl) throw new Error("Image/model generation requires a public source URL.");
    if (projectId) {
      const project = await ctx.sb.from("game_foundry_projects").select("id").eq("id",projectId).eq("user_id",ctx.userId).maybeSingle();
      if (project.error) throw new Error(project.error.message);
      if (!project.data) throw new Error("Game Foundry project not found.");
    }
    const created = await ctx.sb.from("three_d_jobs").insert({
      user_id:ctx.userId,project_id:projectId,input_name:name,source_url:sourceUrl||null,source_kind:sourceKind,prompt:prompt||null,
      workflow:`${sourceKind}-to-mesh`,requested_format:outputFormat,quality_profile:qualityProfile,target_engine:targetEngine,status:"queued",
    }).select("id").single();
    if (created.error) throw new Error(created.error.message);
    try {
      const worker = await submitGameFoundryAsset({
        sourceKind:sourceKind as "prompt"|"image"|"model",prompt:prompt||null,sourceUrl:sourceUrl||null,outputFormat,
        qualityProfile:qualityProfile === "draft" ? "draft" : qualityProfile === "cinematic" ? "cinematic" : "game_ready",
        targetEngine:targetEngine as any,
      });
      const terminal=["completed","failed","cancelled"].includes(worker.status);
      const update=await ctx.sb.from("three_d_jobs").update({
        worker_job_id:worker.workerJobId,status:worker.status,output_url:worker.outputUrl,preview_url:worker.previewUrl,error_message:worker.errorMessage,metadata:worker.metadata,
        completed_at:terminal?new Date().toISOString():null,updated_at:new Date().toISOString(),
      }).eq("id",created.data.id).eq("user_id",ctx.userId);
      if (update.error) throw new Error(update.error.message);
      return { id:created.data.id,...worker };
    } catch (error) {
      const message=error instanceof Error?error.message:"Asset generation failed";
      await ctx.sb.from("three_d_jobs").update({status:"failed",error_message:message.slice(0,1000),completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",created.data.id).eq("user_id",ctx.userId);
      throw error;
    }
  }
  if (action === "process_asset") {
    const assetId = text(input,"project_id",60);
    if (!assetId) throw new Error("process_asset requires the asset id in project_id.");
    const asset = await ctx.sb.from("three_d_jobs")
      .select("id,status,output_url,preview_url,requested_format,target_engine,processing_status")
      .eq("id",assetId).eq("user_id",ctx.userId).maybeSingle();
    if (asset.error) throw new Error(asset.error.message);
    if (!asset.data) throw new Error("Game Foundry asset not found.");
    if (asset.data.status !== "completed" || !asset.data.output_url) throw new Error("The source asset must complete before game-ready processing.");
    if (!["not_started","failed"].includes(String(asset.data.processing_status))) throw new Error("This asset is already being processed.");
    const profile = {
      generatePbrMaterials:true,
      unwrapUvs:true,
      generateLods:true,
      generateCollision:true,
      optimizeTopology:true,
      rigging:"none" as const,
      animation:"none" as const,
      textureResolution:2048 as const,
      targetPolycount:null,
    };
    const claimed = await ctx.sb.from("three_d_jobs").update({
      processing_status:"queued",processing_profile:profile,validation_report:{},processed_output_url:null,processing_worker_job_id:null,updated_at:new Date().toISOString(),
    }).eq("id",assetId).eq("user_id",ctx.userId).in("processing_status",["not_started","failed"]).select("id").maybeSingle();
    if (claimed.error) throw new Error(claimed.error.message);
    if (!claimed.data) throw new Error("This asset is no longer ready for processing.");
    try {
      const worker = await submitGameReadyProcessing({
        sourceUrl:String(asset.data.output_url),targetEngine:asset.data.target_engine,outputFormat:String(asset.data.requested_format),profile,
      });
      const update = await ctx.sb.from("three_d_jobs").update({
        processing_status:worker.status,processing_worker_job_id:worker.workerJobId,processed_output_url:worker.outputUrl,
        preview_url:worker.previewUrl ?? asset.data.preview_url,error_message:worker.errorMessage,validation_report:worker.validationReport,
        metadata:worker.metadata,updated_at:new Date().toISOString(),
      }).eq("id",assetId).eq("user_id",ctx.userId);
      if (update.error) throw new Error(update.error.message);
      return { id:assetId,...worker };
    } catch (error) {
      const message=error instanceof Error?error.message:"Game-ready processing failed";
      await ctx.sb.from("three_d_jobs").update({processing_status:"failed",error_message:message.slice(0,1000),updated_at:new Date().toISOString()}).eq("id",assetId).eq("user_id",ctx.userId);
      throw error;
    }
  }
  if (action === "refresh_asset") {
    const assetId=text(input,"project_id",60);
    if(!assetId) throw new Error("refresh_asset requires the asset id in project_id.");
    const asset=await ctx.sb.from("three_d_jobs")
      .select("id,status,worker_job_id,preview_url,metadata,processing_status,processing_worker_job_id")
      .eq("id",assetId).eq("user_id",ctx.userId).maybeSingle();
    if(asset.error) throw new Error(asset.error.message);
    if(!asset.data) throw new Error("Game Foundry asset not found.");
    let generation=null;
    if(["queued","running"].includes(String(asset.data.status))&&asset.data.worker_job_id){
      const provider=asset.data.metadata?.provider==="game-foundry-3d"?"game-foundry-3d":"modly-compatible";
      generation=await getGameFoundryAssetJob(String(asset.data.worker_job_id),provider);
      const terminal=["completed","failed","cancelled"].includes(generation.status);
      const update=await ctx.sb.from("three_d_jobs").update({
        status:generation.status,output_url:generation.outputUrl,preview_url:generation.previewUrl,error_message:generation.errorMessage,
        metadata:{provider:generation.provider,response:generation.metadata},completed_at:terminal?new Date().toISOString():null,updated_at:new Date().toISOString(),
      }).eq("id",assetId).eq("user_id",ctx.userId);
      if(update.error) throw new Error(update.error.message);
    }
    let processing=null;
    if(["queued","running"].includes(String(asset.data.processing_status))&&asset.data.processing_worker_job_id){
      processing=await getGameReadyProcessingJob(String(asset.data.processing_worker_job_id));
      const update=await ctx.sb.from("three_d_jobs").update({
        processing_status:processing.status,processed_output_url:processing.outputUrl,preview_url:processing.previewUrl??asset.data.preview_url,
        error_message:processing.errorMessage,validation_report:processing.validationReport,
        metadata:{provider:processing.provider,response:processing.metadata},updated_at:new Date().toISOString(),
      }).eq("id",assetId).eq("user_id",ctx.userId);
      if(update.error) throw new Error(update.error.message);
    }
    if(!generation&&!processing) throw new Error("This Game Foundry asset has no active worker job to refresh.");
    return {assetId,generation,processing};
  }
  if (action === "refresh_project") {
    const projectId=text(input,"project_id",60);
    if(!projectId) throw new Error("refresh_project requires project_id.");
    const project=await ctx.sb.from("game_foundry_projects")
      .select("id,status,worker_job_id").eq("id",projectId).eq("user_id",ctx.userId).maybeSingle();
    if(project.error) throw new Error(project.error.message);
    if(!project.data) throw new Error("Game Foundry project not found.");
    if(!["queued","running"].includes(String(project.data.status))||!project.data.worker_job_id) throw new Error("This Game Foundry project has no active game worker job.");
    const worker=await getGameFoundryProjectJob(String(project.data.worker_job_id));
    const terminal=["completed","failed","cancelled"].includes(worker.status);
    const update=await ctx.sb.from("game_foundry_projects").update({
      status:worker.status,output_url:worker.outputUrl,preview_url:worker.previewUrl,error_message:worker.errorMessage,
      metadata:{provider:worker.provider,response:worker.metadata},completed_at:terminal?new Date().toISOString():null,updated_at:new Date().toISOString(),
    }).eq("id",projectId).eq("user_id",ctx.userId);
    if(update.error) throw new Error(update.error.message);
    return {projectId,...worker};
  }
  if (action === "refresh_handoff") {
    const projectId=text(input,"project_id",60);
    if(!projectId) throw new Error("refresh_handoff requires project_id.");
    const project=await ctx.sb.from("game_foundry_projects")
      .select("id,target_engine,handoff_status,handoff_id").eq("id",projectId).eq("user_id",ctx.userId).maybeSingle();
    if(project.error) throw new Error(project.error.message);
    if(!project.data) throw new Error("Game Foundry project not found.");
    if(!["queued","running"].includes(String(project.data.handoff_status))||!project.data.handoff_id) throw new Error("This Game Foundry project has no active engine handoff.");
    const handoff=await getGameFoundryBridgeHandoff({engine:project.data.target_engine,handoffId:String(project.data.handoff_id)});
    const update=await ctx.sb.from("game_foundry_projects").update({
      handoff_status:handoff.status,handoff_error:handoff.errorMessage,handoff_updated_at:new Date().toISOString(),updated_at:new Date().toISOString(),
    }).eq("id",projectId).eq("user_id",ctx.userId);
    if(update.error) throw new Error(update.error.message);
    return {projectId,...handoff};
  }
  if (action === "certify_project") {
    const projectId=text(input,"project_id",60);
    if(!projectId) throw new Error("certify_project requires project_id.");
    const [project,assets,connections]=await Promise.all([
      ctx.sb.from("game_foundry_projects")
        .select("id,name,target_engine,quality_profile,status,design_spec,content_manifest,content_status,source_manifest,source_status,package_manifest,package_status,export_manifest,handoff_status,output_url")
        .eq("id",projectId).eq("user_id",ctx.userId).maybeSingle(),
      ctx.sb.from("three_d_jobs")
        .select("id,content_requirement_id,status,output_url,processed_output_url,processing_status,validation_report")
        .eq("project_id",projectId).eq("user_id",ctx.userId).order("created_at",{ascending:true}),
      probeGameFoundryConnections(),
    ]);
    if(project.error) throw new Error(project.error.message);
    if(assets.error) throw new Error(assets.error.message);
    if(!project.data) throw new Error("Game Foundry project not found.");
    const readiness=auditGameFoundryReadiness(project.data,assets.data??[]);
    const requiredIds=project.data.target_engine==="web"?[]:["game-worker",String(project.data.target_engine)];
    const required=connections.results.filter((item)=>requiredIds.includes(item.id));
    const externalHealthy=required.every((item)=>item.configured&&item.reachable&&item.healthy);
    const externallyBlocked=project.data.target_engine!=="web"&&!externalHealthy;
    return {
      projectId,certified:readiness.runtimeReady&&!externallyBlocked,codeReady:true,packageReady:readiness.packageReady,
      runtimeReady:readiness.runtimeReady,externallyBlocked,readiness,connections:{summary:connections.summary,required},
    };
  }
  if (action === "audit_readiness") {
    const projectId=text(input,"project_id",60);
    if(!projectId) throw new Error("audit_readiness requires project_id.");
    const [project,assets]=await Promise.all([
      ctx.sb.from("game_foundry_projects")
        .select("id,name,target_engine,quality_profile,status,design_spec,content_manifest,content_status,source_manifest,source_status,package_manifest,package_status,export_manifest,handoff_status,output_url")
        .eq("id",projectId).eq("user_id",ctx.userId).maybeSingle(),
      ctx.sb.from("three_d_jobs")
        .select("id,content_requirement_id,status,output_url,processed_output_url,processing_status,validation_report")
        .eq("project_id",projectId).eq("user_id",ctx.userId).order("created_at",{ascending:true}),
    ]);
    if(project.error) throw new Error(project.error.message);
    if(assets.error) throw new Error(assets.error.message);
    if(!project.data) throw new Error("Game Foundry project not found.");
    return {projectId,...auditGameFoundryReadiness(project.data,assets.data??[])};
  }
  if (action === "prepare_package") {
    const projectId=text(input,"project_id",60);
    if (!projectId) throw new Error("prepare_package requires project_id.");
    const project=await ctx.sb.from("game_foundry_projects")
      .select("id,name,prompt,target_engine,project_type,quality_profile,design_spec,content_manifest,source_manifest,source_status,export_manifest")
      .eq("id",projectId).eq("user_id",ctx.userId).maybeSingle();
    if(project.error) throw new Error(project.error.message);
    if(!project.data) throw new Error("Game Foundry project not found.");
    if(project.data.source_status!=="generated") throw new Error("Generate the engine source before preparing a project package.");
    const packageManifest=buildGameFoundryProjectPackage({project:project.data});
    const update=await ctx.sb.from("game_foundry_projects").update({
      package_manifest:packageManifest,package_status:"prepared",package_error:null,package_prepared_at:new Date().toISOString(),updated_at:new Date().toISOString(),
    }).eq("id",projectId).eq("user_id",ctx.userId);
    if(update.error) throw new Error(update.error.message);
    return { projectId, filename:gameFoundryPackageFilename(project.data.name,project.data.target_engine), packageManifest };
  }
  if (action === "prepare_handoff") {
    const projectId=text(input,"project_id",60);
    if (!projectId) throw new Error("prepare_handoff requires project_id.");
    const [project, assets] = await Promise.all([
      ctx.sb.from("game_foundry_projects")
        .select("id,name,prompt,target_engine,project_type,quality_profile,design_spec")
        .eq("id",projectId).eq("user_id",ctx.userId).maybeSingle(),
      ctx.sb.from("three_d_jobs")
        .select("id,input_name,requested_format,output_url,processed_output_url,target_engine,validation_report,status")
        .eq("project_id",projectId).eq("user_id",ctx.userId).eq("status","completed").order("created_at",{ascending:true}),
    ]);
    if (project.error) throw new Error(project.error.message);
    if (assets.error) throw new Error(assets.error.message);
    if (!project.data) throw new Error("Game Foundry project not found.");
    const manifest=buildGameFoundryExportManifest(project.data,assets.data??[]);
    const update=await ctx.sb.from("game_foundry_projects").update({
      export_manifest:manifest,handoff_status:"prepared",handoff_id:null,handoff_error:null,handoff_updated_at:new Date().toISOString(),updated_at:new Date().toISOString(),
    }).eq("id",projectId).eq("user_id",ctx.userId);
    if(update.error) throw new Error(update.error.message);
    return { projectId,manifest,bridgeConfigured:Boolean(gameFoundryBridgeBase(project.data.target_engine)) };
  }
  if (action === "send_handoff") {
    const projectId=text(input,"project_id",60);
    if (!projectId) throw new Error("send_handoff requires project_id.");
    const project=await ctx.sb.from("game_foundry_projects")
      .select("id,target_engine,export_manifest,handoff_status")
      .eq("id",projectId).eq("user_id",ctx.userId).maybeSingle();
    if(project.error) throw new Error(project.error.message);
    if(!project.data) throw new Error("Game Foundry project not found.");
    if(project.data.handoff_status!=="prepared"||!project.data.export_manifest||Object.keys(project.data.export_manifest).length===0) throw new Error("Prepare the engine handoff before sending it.");
    const result=await submitGameFoundryBridgeHandoff({engine:project.data.target_engine,manifest:project.data.export_manifest,projectId});
    const status=["completed","running","queued"].includes(result.status)?result.status:"queued";
    const update=await ctx.sb.from("game_foundry_projects").update({
      handoff_status:status,handoff_id:result.handoffId,handoff_error:null,handoff_updated_at:new Date().toISOString(),updated_at:new Date().toISOString(),
    }).eq("id",projectId).eq("user_id",ctx.userId);
    if(update.error) throw new Error(update.error.message);
    return {projectId,...result};
  }
  if (action === "generate_project") {
    const projectId=text(input,"project_id",60);
    if (!projectId) throw new Error("generate_project requires project_id.");
    const project=await ctx.sb.from("game_foundry_projects")
      .select("id,name,prompt,target_engine,project_type,quality_profile,design_spec,status").eq("id",projectId).eq("user_id",ctx.userId).maybeSingle();
    if (project.error) throw new Error(project.error.message);
    if (!project.data) throw new Error("Game Foundry project not found.");
    if (project.data.status !== "planned" || !project.data.design_spec || Object.keys(project.data.design_spec).length === 0) throw new Error("Plan the Game Foundry project before generation.");
    const worker=await submitGameFoundryProject({
      projectId:project.data.id,name:project.data.name,prompt:project.data.prompt,projectType:project.data.project_type,
      targetEngine:project.data.target_engine,qualityProfile:project.data.quality_profile,designSpec:project.data.design_spec,
    });
    const terminal=["completed","failed","cancelled"].includes(worker.status);
    const update=await ctx.sb.from("game_foundry_projects").update({
      status:worker.status,worker_job_id:worker.workerJobId,output_url:worker.outputUrl,preview_url:worker.previewUrl,error_message:worker.errorMessage,
      design_spec:project.data.design_spec,metadata:{ ...(worker.metadata && typeof worker.metadata === "object" && !Array.isArray(worker.metadata) ? worker.metadata : {}), worker_design_spec:worker.designSpec },completed_at:terminal?new Date().toISOString():null,updated_at:new Date().toISOString(),
    }).eq("id",projectId).eq("user_id",ctx.userId);
    if (update.error) throw new Error(update.error.message);
    return { id:projectId,...worker };
  }
  return { error:"Unsupported Game Foundry action." };
}
