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

// Classify upstream errors without disclosing raw provider responses, account identifiers or secrets.
function providerErrorDetail(raw: string): string {
  const bounded = raw.slice(0, 4096);
  try {
    const parsed: unknown = JSON.parse(bounded);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const error = parsed as Record<string, unknown>;
      const value = error["detail"] ?? error["message"] ?? error["error"];
      if (typeof value === "string") return value.slice(0, 1000);
      if (Array.isArray(value)) return value.map((part) => {
        if (!part || typeof part !== "object") return "";
        const message = (part as Record<string, unknown>)["msg"];
        return typeof message === "string" ? message : "";
      }).join(" ").slice(0, 1000);
    }
  } catch { /* Upstream may return HTML or plain text. */ }
  return bounded;
}

export function falFailureMessage(status: number, rawResponse = ""): string {
  const detail = providerErrorDetail(rawResponse);
  if (/cloudfront|distribution is not configured|request method.*not allowed/i.test(detail)) {
    return "The FAL request was rejected by an upstream gateway. Check the provider endpoint and request method.";
  }
  if (/exhausted balance|insufficient (balance|credits?|funds)|balance (is )?(exhausted|depleted|insufficient)|top[ -]?up|billing (disabled|issue)|payment required/i.test(detail) || status === 402) {
    return "FAL has blocked 3D generation because the account needs billing attention. Check the FAL billing dashboard and account balance.";
  }
  if (/user is locked|account (is )?(locked|suspended|disabled)|account restriction/i.test(detail)) {
    return "The FAL account is locked or restricted. Check account status in FAL or contact FAL support.";
  }
  if (status === 401 || /invalid (api )?key|no user found for key|invalid credentials|unauthenticated|unauthorized (api )?key|authentication failed/i.test(detail)) {
    return "FAL did not authenticate the server API key. Generate a valid FAL API key and update FAL_API_KEY in Vercel production.";
  }
  if (status === 403) {
    return "FAL denied this 3D request (HTTP 403). Check the FAL account's billing status, API key permissions, and Hunyuan3D model access.";
  }
  if (status === 429) return "The FAL 3D provider is temporarily rate-limited. Try again later.";
  if (status === 422 || status === 400) return "FAL rejected the 3D request parameters. Review the selected model input and format.";
  if (status === 404) return "The configured FAL 3D model endpoint could not be found.";
  return `The FAL 3D provider returned HTTP ${status}. Check provider service availability.`;
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
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    // Do not log raw upstream responses: they may include account data or other sensitive details.
    throw new Error(falFailureMessage(response.status, errorBody));
  }
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
  if (provider === "fal-3d-text" && !(input.prompt || "").trim()) throw new Error("A 3D generation prompt is required.");
  if (provider === "fal-3d-image" && !input.sourceUrl) throw new Error("An image URL is required for image-to-3D.");
  const json = await falJson(model, "POST", inputData);
  const workerJobId = String(json['request_id'] ?? "").trim();
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
  const state = String(queued['status'] ?? "");
  const metadata = { model, requestedFormat: outputFormat };
  if (state === "IN_QUEUE") return { workerJobId, provider, status: "queued", outputUrl: null, previewUrl: null, errorMessage: null, metadata };
  if (state === "IN_PROGRESS") return { workerJobId, provider, status: "running", outputUrl: null, previewUrl: null, errorMessage: null, metadata };
  if (state === "FAILED" || state === "CANCELLED") {
    return { workerJobId, provider, status: "failed", outputUrl: null, previewUrl: null, errorMessage: "The FAL 3D generation job failed or was cancelled.", metadata };
  }
  if (state !== "COMPLETED") throw new Error("The FAL 3D provider returned an unknown queue status.");
  const response = await falJson(path, "GET");
  const format = outputFormat.toLowerCase();
  const output = assetUrl(response['model_urls']?.[format]?.url ?? (format === "glb" ? response['model_glb']?.url : null));
  const preview = assetUrl(response['thumbnail']?.url);
  return {
    workerJobId, provider, status: output ? "completed" : "failed",
    outputUrl: output, previewUrl: preview,
    errorMessage: output ? null : `FAL did not return the requested ${format.toUpperCase()} model. No export was recorded.`,
    metadata: { ...metadata, outputFormat: format, completedByProvider: true },
  };
}
