import { normalizeWorkerGpuReport } from "@/lib/runtime/gpu-worker-report";
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type ThreeDJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ThreeDWorkerResult = {
  workerJobId: string;
  status: ThreeDJobStatus;
  outputUrl: string | null;
  previewUrl: string | null;
  errorMessage: string | null;
  metadata: Json;
  inlineGlbBase64?: string;
};

const ALLOWED_FORMATS = new Set(["glb", "gltf", "obj", "ply", "stl", "vox"]);
const DEFAULT_MODLY_API_URL = "https://blackstar-3d-worker-v7iyno.v2.appdeploy.ai";

function hostedWorkerPath(base: string, path: string) {
  return base === DEFAULT_MODLY_API_URL ? `/api${path}` : path;
}

function workerConfig() {
  const mesh = (process.env["MESH_WORKER_URL"] || "").trim().replace(/\/+$/, "");
  const modly = (process.env["MODLY_API_URL"] || "").trim().replace(/\/+$/, "");
  const base = mesh || modly || DEFAULT_MODLY_API_URL;
  const token = (mesh ? (process.env["MESH_WORKER_TOKEN"] || process.env["MODLY_API_TOKEN"] || "") : (process.env["MODLY_API_TOKEN"] || "")).trim();
  return { base, token };
}

export function getHuggingFaceMeshFallback() {
  const endpoint = (process.env["THREE_D_HF_ENDPOINT_URL"] || "").trim().replace(/\/+$/, "");
  const token = (process.env["HF_TOKEN"] || process.env["HUGGINGFACE_TOKEN"] || "").trim();
  if (!endpoint && !token) {
    return { configured: false, endpoint: "", token: "", note: "Hugging Face image-to-mesh stays off until THREE_D_HF_ENDPOINT_URL and HF_TOKEN (or HUGGINGFACE_TOKEN) are set." };
  }
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !token || host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      throw new Error("disabled");
    }
    return { configured: true, endpoint: url.toString().replace(/\/+$/, ""), token, note: "Hugging Face is used only when the mesh worker does not return a real mesh." };
  } catch {
    return { configured: false, endpoint: "", token: "", note: "Hugging Face image-to-mesh stays off until THREE_D_HF_ENDPOINT_URL is a public https URL and a token is set." };
  }
}

export async function probeThreeDWorker() {
  const { base, token } = workerConfig();
  const started = Date.now();
  if (!base) {
    return {
      provider: "modly-compatible",
      configured: false,
      reachable: false,
      healthy: false,
      readySignal: null,
      httpStatus: null,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
      gpuReport:null,
      workflows: [] as string[],
      formats: [] as string[],
      error: "3D Studio execution worker is unavailable.",
    };
  }
  try {
    const response = await fetch(`${base}${hostedWorkerPath(base, "/health")}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    const text = await response.text();
    const looksLikeHtml = /^\s*</.test(text);
    let payload: any = null;
    try { payload = text && !looksLikeHtml ? JSON.parse(text) : null; } catch { payload = null; }
    const readySignal = payload && typeof payload === "object" && "ready" in payload ? payload.ready === true : null;
    const healthy = response.ok && readySignal === true && !looksLikeHtml;
    return {
      provider: typeof payload?.provider === "string" ? payload.provider : "modly-compatible",
      configured: true,
      reachable: true,
      healthy,
      readySignal,
      httpStatus: response.status,
      latencyMs: Math.max(0, Date.now() - started),
      checkedAt: new Date().toISOString(),
      gpuReport:healthy?normalizeWorkerGpuReport(payload):null,
      workflows: Array.isArray(payload?.workflows) ? payload.workflows.filter((item: unknown) => typeof item === "string").slice(0, 20) : [],
      formats: Array.isArray(payload?.formats) ? payload.formats.filter((item: unknown) => typeof item === "string").slice(0, 20) : [],
      error: healthy
        ? null
        : looksLikeHtml
          ? "3D worker health endpoint returned HTML instead of a ready JSON report."
          : readySignal === false
            ? "3D worker health endpoint reported ready=false."
            : response.ok
              ? "3D worker health endpoint did not return explicit ready=true JSON."
              : `3D worker health endpoint returned HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      provider: "modly-compatible",
      configured: true,
      reachable: false,
      healthy: false,
      readySignal: null,
      httpStatus: null,
      latencyMs: Math.max(0, Date.now() - started),
      checkedAt: new Date().toISOString(),
      gpuReport:null,
      workflows: [] as string[],
      formats: [] as string[],
      error: error instanceof Error ? error.message.slice(0, 240) : "3D worker health probe failed.",
    };
  }
}

export function getThreeDRuntimeCapabilities() {
  const { base } = workerConfig();
  const huggingface = getHuggingFaceMeshFallback();
  return {
    provider: "modly-compatible",
    configured: Boolean(base),
    meshWorkerConfigured: Boolean((process.env["MESH_WORKER_URL"] || "").trim()),
    workflows: ["image-to-mesh"],
    formats: [...ALLOWED_FORMATS],
    localFirst: true,
    note: "Uses the Blackstar hosted Modly-compatible image-to-mesh execution node by default. MODLY_API_URL can override it with a dedicated Modly-compatible GPU worker. MESH_WORKER_URL selects the repo's image-to-mesh worker.",
    huggingface: { configured: huggingface.configured, note: huggingface.note },
  };
}

function publicHttpUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("3D source must use http or https.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) throw new Error("Private/local source URLs are not accepted.");
  if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) throw new Error("Private network source URLs are not accepted.");
  return url;
}

function normalizeStatus(value: unknown): ThreeDJobStatus {
  const status = String(value ?? "").toLowerCase();
  if (["completed", "succeeded", "success", "done"].includes(status)) return "completed";
  if (["failed", "error"].includes(status)) return "failed";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (["running", "processing", "in_progress", "active"].includes(status)) return "running";
  return "queued";
}

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function asJson(value: unknown, depth = 0): Json {
  if (depth > 6) return "[truncated]";
  if (value == null || typeof value === "string" || typeof value === "boolean") return value as Json;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => asJson(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, Json> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>).slice(0, 100)) {
      if (/(token|secret|password|api[_-]?key|authorization|cookie)/i.test(key)) continue;
      out[key] = asJson(child, depth + 1);
    }
    return out;
  }
  return String(value);
}

async function request(path: string, init?: RequestInit): Promise<any> {
  const { base, token } = workerConfig();
  if (!base) throw new Error("3D Studio execution worker is unavailable.");
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${base}${hostedWorkerPath(base, path)}`, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
    headers,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`3D worker error (${response.status}): ${text.slice(0, 300)}`);
  if (/^\s*</.test(text)) throw new Error("3D worker returned HTML instead of a job response. The configured route is not a live mesh worker.");
  try { return JSON.parse(text); } catch { throw new Error("3D worker returned invalid JSON."); }
}

function workerResult(workerJobId: string, json: any): ThreeDWorkerResult {
  return {
    workerJobId,
    status: normalizeStatus(json.status),
    outputUrl: safeUrl(json.output_url ?? json.asset_url ?? json.export_url),
    previewUrl: safeUrl(json.preview_url ?? json.thumbnail_url),
    errorMessage: typeof json.error === "string" ? json.error.slice(0, 1000) : null,
    metadata: asJson(json),
  };
}

function canUseHuggingFace(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return /HTML|unavailable|invalid JSON|fetch failed|network|HTTP 5\d\d|timed out|abort/i.test(message);
}

async function submitHuggingFaceMesh(input: { sourceUrl: string; outputFormat: string }): Promise<ThreeDWorkerResult> {
  const fallback = getHuggingFaceMeshFallback();
  if (!fallback.configured || !fallback.endpoint || !fallback.token) throw new Error("Hugging Face image-to-mesh is not configured.");
  const response = await fetch(fallback.endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${fallback.token}`, "Content-Type": "application/json", Accept: "application/json, model/gltf-binary, application/octet-stream" },
    body: JSON.stringify({ image_url: input.sourceUrl, output_format: input.outputFormat }),
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) throw new Error(`Hugging Face image-to-mesh error (${response.status}): ${bytes.subarray(0, 300).toString("utf8")}`);
  const text = bytes.subarray(0, 1).toString("utf8");
  if (text === "{" || text === "[") {
    const json = JSON.parse(bytes.toString("utf8"));
    const id = String(json.id ?? json.job_id ?? "direct").replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 120) || "direct";
    return workerResult(`hf:${id}`, json);
  }
  if (bytes.length < 128 || bytes.length > 40_000_000) throw new Error("Hugging Face returned an unusable mesh.");
  return {
    workerJobId: `hf:inline:${crypto.randomUUID()}`,
    status: "completed",
    outputUrl: null,
    previewUrl: null,
    errorMessage: null,
    metadata: { provider: "huggingface", inline: true },
    inlineGlbBase64: bytes.toString("base64"),
  };
}

export async function submitThreeDJob(input: { sourceUrl: string; outputFormat: string }): Promise<ThreeDWorkerResult> {
  const source = publicHttpUrl(input.sourceUrl).toString();
  const format = input.outputFormat.toLowerCase();
  if (!ALLOWED_FORMATS.has(format)) throw new Error("Unsupported 3D output format.");
  try {
    const json = await request("/workflow-runs/from-image", { method: "POST", body: JSON.stringify({ image_url: source, output_format: format }) });
    const workerJobId = String(json.id ?? json.run_id ?? json.workflow_run_id ?? "").trim();
    if (!workerJobId) throw new Error("3D worker did not return a workflow run id.");
    return workerResult(workerJobId, json);
  } catch (error) {
    if (!getHuggingFaceMeshFallback().configured || !canUseHuggingFace(error)) throw error;
    return submitHuggingFaceMesh({ sourceUrl: source, outputFormat: format });
  }
}

export async function getThreeDJob(workerJobId: string): Promise<ThreeDWorkerResult> {
  const id = workerJobId.trim();
  if (!/^[a-zA-Z0-9._:-]{1,180}$/.test(id)) throw new Error("Invalid 3D worker run id.");
  if (id.startsWith("hf:")) {
    const fallback = getHuggingFaceMeshFallback();
    if (!fallback.configured || !fallback.endpoint || !fallback.token) throw new Error("Hugging Face image-to-mesh is not configured.");
    const remoteId = id.slice(3).replace(/^inline:/, "");
    const response = await fetch(`${fallback.endpoint}/jobs/${encodeURIComponent(remoteId)}`, {
      headers: { Authorization: `Bearer ${fallback.token}`, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Hugging Face image-to-mesh error (${response.status}): ${text.slice(0, 300)}`);
    return workerResult(id, JSON.parse(text));
  }
  const json = await request(`/workflow-runs/${encodeURIComponent(id)}`, { method: "GET" });
  return workerResult(id, json);
}
