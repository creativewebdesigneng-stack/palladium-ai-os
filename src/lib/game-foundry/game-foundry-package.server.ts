import type { GameFoundryEngine } from "./game-foundry-runtime.server";

type AssetRow = {
  id: string;
  input_name: string;
  requested_format: string | null;
  output_url: string | null;
  processed_output_url: string | null;
  target_engine: string | null;
  validation_report?: unknown;
};

type ProjectRow = {
  id: string;
  name: string;
  prompt: string;
  target_engine: GameFoundryEngine;
  project_type: string;
  quality_profile: string;
  design_spec: unknown;
};

const bridgeEnv: Partial<Record<GameFoundryEngine,string>> = {
  unity:"GAME_FOUNDRY_UNITY_BRIDGE_URL",
  unreal:"GAME_FOUNDRY_UNREAL_BRIDGE_URL",
  godot:"GAME_FOUNDRY_GODOT_BRIDGE_URL",
  blender:"GAME_FOUNDRY_BLENDER_BRIDGE_URL",
};

function cleanBase(value: string | undefined) {
  return (value || "").trim().replace(/\/+$/,"");
}

export function gameFoundryBridgeBase(engine: GameFoundryEngine) {
  const env = bridgeEnv[engine];
  return env ? cleanBase(process.env[env]) : "";
}

function importRoot(engine: GameFoundryEngine) {
  if (engine === "unity") return "Assets/BlackstarGameFoundry";
  if (engine === "unreal") return "/Game/BlackstarGameFoundry";
  if (engine === "godot") return "res://blackstar_game_foundry";
  if (engine === "blender") return "//BlackstarGameFoundry";
  return "./BlackstarGameFoundry";
}

export function buildGameFoundryExportManifest(project: ProjectRow, assets: AssetRow[]) {
  const usable = assets
    .filter((asset) => Boolean(asset.processed_output_url || asset.output_url))
    .map((asset) => ({
      id:asset.id,
      name:asset.input_name,
      format:String(asset.requested_format || "glb").toLowerCase(),
      url:asset.processed_output_url || asset.output_url,
      preferredSource:asset.processed_output_url ? "processed" : "generated",
      importPath:`${importRoot(project.target_engine)}/${asset.input_name.replace(/[^a-zA-Z0-9._-]+/g,"-").slice(0,80)}`,
      validation:asset.validation_report && typeof asset.validation_report === "object" ? asset.validation_report : {},
    }));
  if (!usable.length) throw new Error("This project has no completed 3D assets to include in an engine handoff.");
  return {
    schema:"blackstar.game_foundry.export_manifest.v1",
    project:{
      id:project.id,
      name:project.name,
      type:project.project_type,
      targetEngine:project.target_engine,
      qualityProfile:project.quality_profile,
      designSpec:project.design_spec && typeof project.design_spec === "object" ? project.design_spec : {},
    },
    importRoot:importRoot(project.target_engine),
    assets:usable,
    generatedAt:new Date().toISOString(),
  };
}

export async function submitGameFoundryBridgeHandoff(args: {
  engine: GameFoundryEngine;
  manifest: unknown;
  projectId: string;
}) {
  const base=gameFoundryBridgeBase(args.engine);
  if (!base) throw new Error(`No ${args.engine} Game Foundry bridge is configured. Export the prepared manifest instead.`);
  const response=await fetch(`${base}/v1/imports`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      ...(process.env["GAME_FOUNDRY_ENGINE_BRIDGE_TOKEN"]?.trim()
        ? { Authorization:`Bearer ${process.env["GAME_FOUNDRY_ENGINE_BRIDGE_TOKEN"]!.trim()}` }
        : {}),
    },
    body:JSON.stringify({project_id:args.projectId,engine:args.engine,manifest:args.manifest}),
    redirect:"error",
    signal:AbortSignal.timeout(120_000),
  });
  const text=await response.text();
  if(!response.ok) throw new Error(`Game Foundry engine bridge error (${response.status}): ${text.slice(0,300)}`);
  let json:any;
  try{json=JSON.parse(text);}catch{throw new Error("Game Foundry engine bridge returned invalid JSON.");}
  const handoffId=String(json.id??json.handoff_id??json.import_id??"").trim();
  if(!handoffId) throw new Error("Game Foundry engine bridge did not return a handoff id.");
  return {
    handoffId,
    status:String(json.status??"queued").toLowerCase(),
  };
}


function normalizeHandoffStatus(value:unknown) {
  const status=String(value??"").toLowerCase();
  if(["completed","succeeded","success","done"].includes(status)) return "completed";
  if(["failed","error"].includes(status)) return "failed";
  if(["cancelled","canceled"].includes(status)) return "cancelled";
  if(["running","processing","in_progress","active"].includes(status)) return "running";
  return "queued";
}

export async function getGameFoundryBridgeHandoff(args:{engine:GameFoundryEngine;handoffId:string}) {
  const base=gameFoundryBridgeBase(args.engine);
  if(!base) throw new Error(`No ${args.engine} Game Foundry bridge is configured.`);
  const id=args.handoffId.trim();
  if(!/^[a-zA-Z0-9._:-]{1,180}$/.test(id)) throw new Error("Invalid Game Foundry bridge handoff id.");
  const response=await fetch(`${base}/v1/imports/${encodeURIComponent(id)}`,{
    method:"GET",
    headers:process.env["GAME_FOUNDRY_ENGINE_BRIDGE_TOKEN"]?.trim()
      ? {Authorization:`Bearer ${process.env["GAME_FOUNDRY_ENGINE_BRIDGE_TOKEN"]!.trim()}`}
      : {},
    redirect:"error",
    signal:AbortSignal.timeout(120_000),
  });
  const body=await response.text();
  if(!response.ok) throw new Error(`Game Foundry engine bridge error (${response.status}): ${body.slice(0,300)}`);
  let json:any;
  try{json=JSON.parse(body);}catch{throw new Error("Game Foundry engine bridge returned invalid JSON.");}
  return {
    handoffId:id,
    status:normalizeHandoffStatus(json.status),
    errorMessage:typeof json.error==="string"?json.error.slice(0,1000):null,
  };
}
