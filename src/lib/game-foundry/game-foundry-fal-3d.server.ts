// FAL provider adapter for Blackstar's existing Game Foundry job lifecycle.
// This is a real external generation lane, not a mock or a GTA V native exporter.
export type FalThreeDProvider = "fal-3d-text" | "fal-3d-image";

const FAL_QUEUE = "https://queue.fal.run";
const FAL_MODELS: Record<FalThreeDProvider, string> = {
  "fal-3d-text": "fal-ai/hunyuan3d-v3/text-to-3d",
  "fal-3d-image": "fal-ai/hunyuan3d-v3/image-to-3d",
};

type FalAssetResult = {
  workerJobId: string;
  status: "queued" | "running" | "completed" | "failed";
  outputUrl: string | null;
  previewUrl: string | null;
  errorMessage: string | null;
  metadata: Record<string, string | number | boolean | null>;
  provider: FalThreeDProvider;
};

function assetUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function failMessage(status: number): string {
  if (status === 401 || status === 403) return "The FAL 3D generation provider rejected the server credentials. Check the production FAL_API_KEY.";
  if (status === 402) return "The FAL 3D provider cannot start this job because its account has insufficient credits.";
  if (status === 429) return "The FAL 3D provider is temporarily rate-limited. Try again later.";
  return `The FAL 3D provider returned HTTP ${status}. Check the provider request and availability.`;
}

async function falJson(path: string, method: "GET" | "POST", payload?: object): Promise<Record<string, any>> {
  const key = (process.env["FAL_API_KEY"] || process.env["FAL_KEY"] || "").trim();
  if (!key) throw new Error("3D generation is not configured: FAL_API_KEY is missing on the server.");
  const response = await fetch(`${FAL_QUEUE}/${path}`, {
    method,
    headers: {
      Authorization: `Key ${key}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(failMessage(response.status));
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("The FAL 3D provider returned an invalid JSON response.");
  return body as Record<string, any>;
}

export function isFal3dReady() {
  return Boolean((process.env["FAL_API_KEY"] || process.env["FAL_KEY"] || "").trim());
}

export async function submitFalThreeDAsset(input: {
  sourceKind: "prompt" | "image";
  prompt?: string | null;
  sourceUrl?: string | null;
  outputFormat: string;
  qualityProfile: "draft" | "game_ready" | "cinematic";
}): Promise<FalAssetResult> {
  const format = input.outputFormat.toLowerCase();
  if (!["glb", "obj", "fbx"].includes(format)) {
    throw new Error("The FAL generation provider supports GLB, OBJ, and FBX exports. Select one of these formats.");
  }
  const provider: FalThreeDProvider = input.sourceKind === "image" ? "fal-3d-image" : "fal-3d-text";
  const model = FAL_MODELS[provider];
  const generateType = input.qualityProfile === "draft" ? "Geometry" : input.qualityProfile === "game_ready" ? "LowPoly" : "Normal";
  const inputData = provider === "fal-3d-text"
    ? { prompt: (input.prompt || "").trim().slice(0, 1024), generate_type: generateType, face_count: 40000 }
    : { input_image_url: input.sourceUrl, generate_type: generateType, face_count: 40000 };
  if (provider === "fal-3d-text" && !inputData.prompt) throw new Error("A 3D generation prompt is required.");
  if (provider === "fal-3d-image" && !input.sourceUrl) throw new Error("An image URL is required for image-to-3D.");
  const json = await falJson(model, "POST", inputData);
  const workerJobId = String(json.request_id ?? "").trim();
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(workerJobId)) throw new Error("The FAL 3D provider did not return a valid queue request ID.");
  return {
    workerJobId, status: "queued", outputUrl: null, previewUrl: null, errorMessage: null,
    metadata: { model, requestedFormat: format, queued: true }, provider,
  };
}

export async function getFalThreeDAssetJob(
  workerJobId: string, provider: FalThreeDProvider, outputFormat: string,
): Promise<FalAssetResult> {
  if (!/^[a-zA-Z0-9_-]{1,180}$/.test(workerJobId)) throw new Error("Invalid FAL 3D job ID.");
  const model = FAL_MODELS[provider];
  const path = `${model}/requests/${encodeURIComponent(workerJobId)}`;
  const queued = await falJson(`${path}/status`, "GET");
  const state = String(queued.status ?? "");
  const metadata = { model, requestedFormat: outputFormat };
  if (state === "IN_QUEUE") return { workerJobId, provider, status: "queued", outputUrl: null, previewUrl: null, errorMessage: null, metadata };
  if (state === "IN_PROGRESS") return { workerJobId, provider, status: "running", outputUrl: null, previewUrl: null, errorMessage: null, metadata };
  if (state === "FAILED" || state === "CANCELLED") {
    return { workerJobId, provider, status: "failed", outputUrl: null, previewUrl: null, errorMessage: "The FAL 3D generation job failed or was cancelled.", metadata };
  }
  if (state !== "COMPLETED") throw new Error("The FAL 3D provider returned an unknown queue status.");
  const response = await falJson(path, "GET");
  const format = outputFormat.toLowerCase();
  const output = assetUrl(response.model_urls?.[format]?.url ?? (format === "glb" ? response.model_glb?.url : null));
  const preview = assetUrl(response.thumbnail?.url);
  return {
    workerJobId, provider, status: output ? "completed" : "failed",
    outputUrl: output, previewUrl: preview,
    errorMessage: output ? null : `FAL did not return the requested ${format.toUpperCase()} model. No export was recorded.`,
    metadata: { ...metadata, outputFormat: format, completedByProvider: true },
  };
}
