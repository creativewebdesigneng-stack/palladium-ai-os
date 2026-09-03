type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type ThreeDJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type ThreeDWorkerResult = {
  workerJobId: string;
  status: ThreeDJobStatus;
  outputUrl: string | null;
  previewUrl: string | null;
  errorMessage: string | null;
  metadata: Json;
};

const ALLOWED_FORMATS = new Set(["glb", "gltf", "obj", "ply", "stl", "vox"]);
const DEFAULT_MODLY_API_URL = "https://blackstar-3d-worker-v7iyno.v2.appdeploy.ai";

function workerConfig() {
  const base = (process.env["MODLY_API_URL"] || DEFAULT_MODLY_API_URL).trim().replace(/\/+$/, "");
  const token = (process.env["MODLY_API_TOKEN"] || "").trim();
  return { base, token };
}

export function getThreeDRuntimeCapabilities() {
  const { base } = workerConfig();
  return {
    provider: "modly-compatible",
    configured: Boolean(base),
    workflows: ["image-to-mesh"],
    formats: [...ALLOWED_FORMATS],
    localFirst: true,
    note: "Uses the Blackstar hosted Modly-compatible image-to-mesh execution node by default. MODLY_API_URL can override it with a dedicated Modly-compatible GPU worker.",
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
  const response = await fetch(`${base}${path}`, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(120_000),
    headers,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`3D worker error (${response.status}): ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { throw new Error("3D worker returned invalid JSON."); }
}

export async function submitThreeDJob(input: { sourceUrl: string; outputFormat: string }): Promise<ThreeDWorkerResult> {
  const source = publicHttpUrl(input.sourceUrl).toString();
  const format = input.outputFormat.toLowerCase();
  if (!ALLOWED_FORMATS.has(format)) throw new Error("Unsupported 3D output format.");
  const json = await request("/workflow-runs/from-image", { method: "POST", body: JSON.stringify({ image_url: source, output_format: format }) });
  const workerJobId = String(json.id ?? json.run_id ?? json.workflow_run_id ?? "").trim();
  if (!workerJobId) throw new Error("3D worker did not return a workflow run id.");
  return {
    workerJobId,
    status: normalizeStatus(json.status),
    outputUrl: safeUrl(json.output_url ?? json.asset_url),
    previewUrl: safeUrl(json.preview_url ?? json.thumbnail_url),
    errorMessage: typeof json.error === "string" ? json.error.slice(0, 1000) : null,
    metadata: asJson(json),
  };
}

export async function getThreeDJob(workerJobId: string): Promise<ThreeDWorkerResult> {
  const id = workerJobId.trim();
  if (!/^[a-zA-Z0-9._:-]{1,180}$/.test(id)) throw new Error("Invalid 3D worker run id.");
  const json = await request(`/workflow-runs/${encodeURIComponent(id)}`, { method: "GET" });
  return {
    workerJobId: id,
    status: normalizeStatus(json.status),
    outputUrl: safeUrl(json.output_url ?? json.asset_url ?? json.export_url),
    previewUrl: safeUrl(json.preview_url ?? json.thumbnail_url),
    errorMessage: typeof json.error === "string" ? json.error.slice(0, 1000) : null,
    metadata: asJson(json),
  };
}
