type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type GameFoundryEngine = "generic" | "unity" | "unreal" | "godot" | "web" | "blender";
export type GameFoundryQuality = "prototype" | "game_ready" | "cinematic";
export type AssetSourceKind = "prompt" | "image" | "model";

const ENGINE_EXPORTS: Record<GameFoundryEngine, string[]> = {
  generic: ["glb","gltf","fbx","obj","usd"],
  unity: ["fbx","glb","gltf","obj"],
  unreal: ["fbx","glb","gltf","usd"],
  godot: ["glb","gltf","obj"],
  web: ["glb","gltf"],
  blender: ["glb","gltf","fbx","obj","usd"],
};

const BLACKSTAR_HOSTED_3D_WORKER = "https://blackstar-3d-worker-v7iyno.v2.appdeploy.ai";

function cleanBase(value: string | undefined) {
  return (value || "").trim().replace(/\/+$/, "");
}

function promptWorkerBase() {
  return cleanBase(process.env["GAME_FOUNDRY_3D_API_URL"]) || BLACKSTAR_HOSTED_3D_WORKER;
}

function normalizeStatus(value: unknown) {
  const status = String(value ?? "").toLowerCase();
  if (["completed","succeeded","success","done"].includes(status)) return "completed";
  if (["failed","error"].includes(status)) return "failed";
  if (["cancelled","canceled"].includes(status)) return "cancelled";
  if (["running","processing","in_progress","active"].includes(status)) return "running";
  return "queued";
}

export function getGameFoundryCapabilities() {
  const configuredAssetWorker = cleanBase(process.env["GAME_FOUNDRY_3D_API_URL"]);
  const assetWorker = promptWorkerBase();
  const gameWorker = cleanBase(process.env["GAME_FOUNDRY_GAME_API_URL"]);
  const modly = cleanBase(process.env["MODLY_API_URL"]) || BLACKSTAR_HOSTED_3D_WORKER;
  return {
    assetGeneration: {
      promptTo3d: true,
      imageTo3d: Boolean(assetWorker || modly),
      modelEnhancement: Boolean(configuredAssetWorker),
      configuredProvider: configuredAssetWorker ? "game-foundry-3d" : "blackstar-hosted-3d",
      formats: configuredAssetWorker ? ["glb","gltf","fbx","obj","usd","ply","stl","vox"] : ["glb","gltf","obj","ply","stl","vox"],
    },
    gameGeneration: {
      configured: Boolean(gameWorker),
      provider: gameWorker ? "game-foundry-game" : null,
    },
    engines: (Object.keys(ENGINE_EXPORTS) as GameFoundryEngine[]).map((id) => ({
      id,
      exports: ENGINE_EXPORTS[id],
      integration:
        id === "generic" || id === "web" ? "export" :
        id === "blender" ? "export-or-bridge" :
        "export-or-plugin",
    })),
    qualityProfiles: ["prototype","game_ready","cinematic"] as GameFoundryQuality[],
    note: "Prompt-to-3D uses Blackstar's hosted 3D execution node by default. GAME_FOUNDRY_3D_API_URL overrides it for a private/custom worker. Engine entries describe compatible export/plugin paths, not guaranteed remote control.",
  };
}

function publicHttpUrl(value: string) {
  const url = new URL(value);
  if (!["http:","https:"].includes(url.protocol)) throw new Error("Source must use http or https.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) throw new Error("Private/local source URLs are not accepted.");
  if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) throw new Error("Private network source URLs are not accepted.");
  return url.toString();
}

function safeUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ["http:","https:"].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

function asJson(value: unknown, depth = 0): Json {
  if (depth > 5) return "[truncated]";
  if (value == null || typeof value === "string" || typeof value === "boolean") return value as Json;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.slice(0,100).map((item)=>asJson(item,depth+1));
  if (typeof value === "object") {
    const out: Record<string, Json> = {};
    for (const [key, child] of Object.entries(value as Record<string,unknown>).slice(0,100)) {
      if (/(token|secret|password|api[_-]?key|authorization|cookie)/i.test(key)) continue;
      out[key] = asJson(child, depth+1);
    }
    return out;
  }
  return String(value);
}

async function request(base: string, token: string | undefined, path: string, init: RequestInit) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type","application/json");
  if (token?.trim()) headers.set("Authorization",`Bearer ${token.trim()}`);
  const response = await fetch(`${base}${path}`, { ...init, headers, redirect:"manual", signal:AbortSignal.timeout(120_000) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Game Foundry worker error (${response.status}): ${text.slice(0,300)}`);
  try { return JSON.parse(text); } catch { throw new Error("Game Foundry worker returned invalid JSON."); }
}

export async function submitGameFoundryAsset(input: {
  sourceKind: AssetSourceKind;
  prompt?: string | null;
  sourceUrl?: string | null;
  outputFormat: string;
  qualityProfile: "draft" | "game_ready" | "cinematic";
  targetEngine: GameFoundryEngine;
}) {
  const configuredAssetBase = cleanBase(process.env["GAME_FOUNDRY_3D_API_URL"]);
  const assetBase = input.sourceKind === "prompt" ? promptWorkerBase() : configuredAssetBase;
  const token = configuredAssetBase ? process.env["GAME_FOUNDRY_3D_API_TOKEN"] : undefined;
  if (input.sourceKind === "image" && !assetBase) {
    const { submitThreeDJob } = await import("./../three-d/three-d-runtime.server");
    if (!input.sourceUrl) throw new Error("A public image URL is required.");
    const fallback = await submitThreeDJob({ sourceUrl: input.sourceUrl, outputFormat: input.outputFormat });
    return { ...fallback, provider:"modly-compatible" as const };
  }
  if (!assetBase) throw new Error("Model enhancement requires GAME_FOUNDRY_3D_API_URL.");
  const body = {
    source_kind: input.sourceKind,
    prompt: input.prompt?.trim() || null,
    source_url: input.sourceUrl ? publicHttpUrl(input.sourceUrl) : null,
    output_format: input.outputFormat,
    quality_profile: input.qualityProfile,
    target_engine: input.targetEngine,
  };
  if (input.sourceKind === "prompt" && !body.prompt) throw new Error("A prompt is required for prompt-to-3D.");
  if (input.sourceKind !== "prompt" && !body.source_url) throw new Error("A public source URL is required.");
  const json = await request(assetBase, token, "/v1/assets/generate", { method:"POST", body:JSON.stringify(body) });
  const workerJobId = String(json.id ?? json.job_id ?? json.run_id ?? "").trim();
  if (!workerJobId) throw new Error("Game Foundry 3D worker did not return a job id.");
  return {
    workerJobId,
    status: normalizeStatus(json.status),
    outputUrl: safeUrl(json.output_url ?? json.asset_url),
    previewUrl: safeUrl(json.preview_url ?? json.thumbnail_url),
    errorMessage: typeof json.error === "string" ? json.error.slice(0,1000) : null,
    metadata: asJson(json),
    provider:"game-foundry-3d" as const,
  };
}

export async function getGameFoundryAssetJob(workerJobId:string, provider:"modly-compatible"|"game-foundry-3d") {
  const id=workerJobId.trim();
  if(!/^[a-zA-Z0-9._:-]{1,180}$/.test(id)) throw new Error("Invalid Game Foundry asset worker id.");
  if(provider==="modly-compatible"){
    const { getThreeDJob } = await import("./../three-d/three-d-runtime.server");
    const result=await getThreeDJob(id);
    return { ...result, provider:"modly-compatible" as const };
  }
  const configuredBase=cleanBase(process.env["GAME_FOUNDRY_3D_API_URL"]);
  const base=configuredBase || promptWorkerBase();
  const json=await request(base,configuredBase ? process.env["GAME_FOUNDRY_3D_API_TOKEN"] : undefined,`/v1/assets/jobs/${encodeURIComponent(id)}`,{method:"GET"});
  return {
    workerJobId:id,
    status:normalizeStatus(json.status),
    outputUrl:safeUrl(json.output_url ?? json.asset_url),
    previewUrl:safeUrl(json.preview_url ?? json.thumbnail_url),
    errorMessage:typeof json.error==="string"?json.error.slice(0,1000):null,
    metadata:asJson(json),
    provider:"game-foundry-3d" as const,
  };
}

export async function submitGameFoundryProject(input: {
  projectId: string;
  name: string;
  prompt: string;
  projectType: string;
  targetEngine: GameFoundryEngine;
  qualityProfile: GameFoundryQuality;
  designSpec?: Json;
}) {
  const base = cleanBase(process.env["GAME_FOUNDRY_GAME_API_URL"]);
  if (!base) throw new Error("Full game generation requires GAME_FOUNDRY_GAME_API_URL.");
  const json = await request(base, process.env["GAME_FOUNDRY_GAME_API_TOKEN"], "/v1/games/generate", {
    method:"POST",
    body:JSON.stringify({
      project_id: input.projectId,
      name: input.name,
      prompt: input.prompt,
      project_type: input.projectType,
      target_engine: input.targetEngine,
      quality_profile: input.qualityProfile,
      design_spec: input.designSpec ?? {},
    }),
  });
  const workerJobId = String(json.id ?? json.job_id ?? json.run_id ?? "").trim();
  if (!workerJobId) throw new Error("Game Foundry game worker did not return a job id.");
  return {
    workerJobId,
    status: normalizeStatus(json.status),
    outputUrl: safeUrl(json.output_url ?? json.project_url),
    previewUrl: safeUrl(json.preview_url ?? json.play_url),
    errorMessage: typeof json.error === "string" ? json.error.slice(0,1000) : null,
    metadata: asJson(json),
    designSpec: asJson(json.design_spec ?? {}),
    provider:"game-foundry-game" as const,
  };
}

export async function getGameFoundryProjectJob(workerJobId:string) {
  const id=workerJobId.trim();
  if(!/^[a-zA-Z0-9._:-]{1,180}$/.test(id)) throw new Error("Invalid Game Foundry game worker id.");
  const base=cleanBase(process.env["GAME_FOUNDRY_GAME_API_URL"]);
  if(!base) throw new Error("Game Foundry game worker is not configured.");
  const json=await request(base,process.env["GAME_FOUNDRY_GAME_API_TOKEN"],`/v1/games/jobs/${encodeURIComponent(id)}`,{method:"GET"});
  return {
    workerJobId:id,
    status:normalizeStatus(json.status),
    outputUrl:safeUrl(json.output_url ?? json.project_url),
    previewUrl:safeUrl(json.preview_url ?? json.play_url),
    errorMessage:typeof json.error==="string"?json.error.slice(0,1000):null,
    metadata:asJson(json),
    provider:"game-foundry-game" as const,
  };
}


export type GameReadyProcessingProfile = {
  generatePbrMaterials: boolean;
  unwrapUvs: boolean;
  generateLods: boolean;
  generateCollision: boolean;
  optimizeTopology: boolean;
  rigging: "none" | "auto";
  animation: "none" | "idle" | "basic";
  textureResolution: 1024 | 2048 | 4096;
  targetPolycount: number | null;
};

export function getGameReadyProcessingCapabilities() {
  const base = cleanBase(process.env["GAME_FOUNDRY_3D_API_URL"]);
  return {
    configured: Boolean(base),
    provider: base ? "game-foundry-3d" : null,
    operations: [
      "pbr_materials",
      "uv_unwrap",
      "lod_generation",
      "collision_generation",
      "topology_optimization",
      "auto_rigging",
      "basic_animation",
      "validation",
    ],
    note: base
      ? "Processing uses the configured real Game Foundry 3D worker."
      : "Game-ready post-processing requires GAME_FOUNDRY_3D_API_URL; no local simulated processing is used.",
  };
}

export async function submitGameReadyProcessing(input: {
  sourceUrl: string;
  targetEngine: GameFoundryEngine;
  outputFormat: string;
  profile: GameReadyProcessingProfile;
}) {
  const base = cleanBase(process.env["GAME_FOUNDRY_3D_API_URL"]);
  if (!base) throw new Error("Game-ready 3D processing requires GAME_FOUNDRY_3D_API_URL.");
  const json = await request(base, process.env["GAME_FOUNDRY_3D_API_TOKEN"], "/v1/assets/process", {
    method: "POST",
    body: JSON.stringify({
      source_url: publicHttpUrl(input.sourceUrl),
      target_engine: input.targetEngine,
      output_format: input.outputFormat,
      processing_profile: input.profile,
    }),
  });
  const workerJobId = String(json.id ?? json.job_id ?? json.run_id ?? "").trim();
  if (!workerJobId) throw new Error("Game Foundry 3D processor did not return a job id.");
  return {
    workerJobId,
    status: normalizeStatus(json.status),
    outputUrl: safeUrl(json.output_url ?? json.asset_url ?? json.processed_output_url),
    previewUrl: safeUrl(json.preview_url ?? json.thumbnail_url),
    errorMessage: typeof json.error === "string" ? json.error.slice(0, 1000) : null,
    validationReport: asJson(json.validation_report ?? json.validation ?? {}),
    metadata: asJson(json),
    provider:"game-foundry-3d" as const,
  };
}

export async function getGameReadyProcessingJob(workerJobId:string) {
  const id=workerJobId.trim();
  if(!/^[a-zA-Z0-9._:-]{1,180}$/.test(id)) throw new Error("Invalid Game Foundry processing worker id.");
  const base=cleanBase(process.env["GAME_FOUNDRY_3D_API_URL"]);
  if(!base) throw new Error("Game Foundry 3D worker is not configured.");
  const json=await request(base,process.env["GAME_FOUNDRY_3D_API_TOKEN"],`/v1/assets/process/${encodeURIComponent(id)}`,{method:"GET"});
  return {
    workerJobId:id,
    status:normalizeStatus(json.status),
    outputUrl:safeUrl(json.output_url ?? json.asset_url ?? json.processed_output_url),
    previewUrl:safeUrl(json.preview_url ?? json.thumbnail_url),
    errorMessage:typeof json.error==="string"?json.error.slice(0,1000):null,
    validationReport:asJson(json.validation_report ?? json.validation ?? {}),
    metadata:asJson(json),
    provider:"game-foundry-3d" as const,
  };
}
