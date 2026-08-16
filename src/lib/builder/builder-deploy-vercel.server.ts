import { createHash } from "node:crypto";

const VERCEL_API = "https://api.vercel.com";
const MAX_FILES = 12;
const MAX_FILE_BYTES = 128_000;
const MAX_TOTAL_BYTES = 150_000;

type ManifestFile = { path: string; content: string };
type UploadedFile = { file: string; sha: string; size: number };

type VercelDeployment = {
  id: string;
  url: string | null;
  status: "building" | "ready" | "failed";
  rawState: string | null;
};

function credentials() {
  const token = process.env["VERCEL_TOKEN"]?.trim();
  if (!token) throw new Error("Vercel preview deployment is not configured.");
  const teamId = process.env["VERCEL_TEAM_ID"]?.trim() || null;
  return { token, teamId };
}

function safeProjectName(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  return slug || "palladium-builder-preview";
}

function manifestFiles(manifest: unknown): ManifestFile[] {
  const files = (manifest as { files?: unknown })?.files;
  if (!Array.isArray(files) || !files.length || files.length > MAX_FILES) throw new Error("The persisted Builder source manifest is invalid for deployment.");
  let totalBytes = 0;
  const seen = new Set<string>();
  return files.map((file: any) => {
    const path = String(file?.path ?? "").trim().replace(/^\/+/, "");
    const content = String(file?.content ?? "");
    if (!path || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("The Builder source manifest contains an unsafe deployment path.");
    if (seen.has(path)) throw new Error("The Builder source manifest contains duplicate deployment paths.");
    seen.add(path);
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > MAX_FILE_BYTES) throw new Error("A Builder deployment file exceeds the size limit.");
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("The Builder deployment manifest exceeds the size limit.");
    return { path, content };
  });
}

function url(path: string, teamId: string | null) {
  const endpoint = new URL(`${VERCEL_API}${path}`);
  if (teamId) endpoint.searchParams.set("teamId", teamId);
  return endpoint;
}

async function vercelJson<T>(path: string, init: RequestInit, token: string, teamId: string | null): Promise<T> {
  const response = await fetch(url(path, teamId), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { /* handled below */ }
  if (!response.ok) {
    const message = typeof payload?.error?.message === "string" ? payload.error.message : typeof payload?.message === "string" ? payload.message : `Vercel request failed (${response.status}).`;
    throw new Error(message.slice(0, 500));
  }
  return payload as T;
}

function deploymentState(payload: any): VercelDeployment {
  const id = typeof payload?.id === "string" ? payload.id : "";
  if (!id) throw new Error("Vercel did not return a deployment id.");
  const rawState = typeof payload?.readyState === "string" ? payload.readyState : typeof payload?.status === "string" ? payload.status : null;
  const state = (rawState ?? "").toUpperCase();
  const status: VercelDeployment["status"] = state === "READY" ? "ready" : ["ERROR", "CANCELED", "FAILED"].includes(state) ? "failed" : "building";
  const rawUrl = typeof payload?.url === "string" ? payload.url.trim() : "";
  const deploymentUrl = rawUrl ? (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`) : null;
  return { id, url: deploymentUrl, status, rawState };
}

async function uploadFile(file: ManifestFile, token: string, teamId: string | null): Promise<UploadedFile> {
  const data = Buffer.from(file.content, "utf8");
  const sha = createHash("sha1").update(data).digest("hex");
  await vercelJson<unknown>("/v2/files", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(data.byteLength),
      "x-vercel-digest": sha,
    },
    body: data,
  }, token, teamId);
  return { file: file.path, sha, size: data.byteLength };
}

export async function createVercelPreviewDeployment(args: { title: string; sourceManifest: unknown }) {
  const { token, teamId } = credentials();
  const files = manifestFiles(args.sourceManifest);
  const uploaded: UploadedFile[] = [];
  for (const file of files) uploaded.push(await uploadFile(file, token, teamId));

  const payload = await vercelJson<any>("/v13/deployments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: safeProjectName(args.title),
      files: uploaded,
      target: "preview",
    }),
  }, token, teamId);
  return deploymentState(payload);
}

export async function getVercelDeployment(deploymentId: string) {
  const id = deploymentId.trim();
  if (!/^[A-Za-z0-9_.-]{1,200}$/.test(id)) throw new Error("Invalid Vercel deployment id.");
  const { token, teamId } = credentials();
  const payload = await vercelJson<any>(`/v13/deployments/${encodeURIComponent(id)}`, { method: "GET" }, token, teamId);
  return deploymentState(payload);
}
