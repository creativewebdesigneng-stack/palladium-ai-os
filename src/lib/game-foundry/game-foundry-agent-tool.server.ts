import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import { getGameFoundryCapabilities, submitGameFoundryAsset, submitGameFoundryProject } from "./game-foundry-runtime.server";

type ToolContext = { userId: string; sb: { from: (table: string) => any } };

const ENGINES = ["generic","unity","unreal","godot","web","blender"] as const;
const FORMATS = ["glb","gltf","fbx","obj","usd","ply","stl","vox"] as const;

export const GAME_FOUNDRY_TOOL_DEF: ToolDef = {
  name: "game_foundry",
  description: "Plan Blackstar Game Foundry projects and submit real configured 3D/game generation jobs. It never fabricates completed assets or engine integrations.",
  parameters: {
    type: "object",
    properties: {
      action: { type:"string", enum:["capabilities","list_projects","create_project","create_asset","generate_project"] },
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

export async function runGameFoundryTool(input: Record<string, unknown>, ctx: ToolContext) {
  const action = text(input,"action",40);
  if (action === "capabilities") return getGameFoundryCapabilities();
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
  if (action === "generate_project") {
    const projectId=text(input,"project_id",60);
    if (!projectId) throw new Error("generate_project requires project_id.");
    const project=await ctx.sb.from("game_foundry_projects")
      .select("id,name,prompt,target_engine,project_type,quality_profile").eq("id",projectId).eq("user_id",ctx.userId).maybeSingle();
    if (project.error) throw new Error(project.error.message);
    if (!project.data) throw new Error("Game Foundry project not found.");
    const worker=await submitGameFoundryProject({
      projectId:project.data.id,name:project.data.name,prompt:project.data.prompt,projectType:project.data.project_type,
      targetEngine:project.data.target_engine,qualityProfile:project.data.quality_profile,
    });
    const terminal=["completed","failed","cancelled"].includes(worker.status);
    const update=await ctx.sb.from("game_foundry_projects").update({
      status:worker.status,worker_job_id:worker.workerJobId,output_url:worker.outputUrl,preview_url:worker.previewUrl,error_message:worker.errorMessage,
      design_spec:worker.designSpec,metadata:worker.metadata,completed_at:terminal?new Date().toISOString():null,updated_at:new Date().toISOString(),
    }).eq("id",projectId).eq("user_id",ctx.userId);
    if (update.error) throw new Error(update.error.message);
    return { id:projectId,...worker };
  }
  return { error:"Unsupported Game Foundry action." };
}
