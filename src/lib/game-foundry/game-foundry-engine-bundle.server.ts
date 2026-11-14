import { buildEngineProjectZip, classifyMeshBytes, type EngineBundleAsset } from "./game-foundry-engine-bundle";

const MAX_MESH = 40_000_000;

function publicMeshUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Mesh downloads require https.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) {
    throw new Error("Private or local mesh URLs are not accepted.");
  }
  if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    throw new Error("Private network mesh URLs are not accepted.");
  }
  return url.toString();
}

export async function downloadMeshBytes(url: string) {
  const target = publicMeshUrl(url);
  const response = await fetch(target, { redirect: "error", signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`Mesh download failed (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 32 || bytes.length > MAX_MESH) throw new Error("Mesh download was an unusable size.");
  const head = new TextDecoder().decode(bytes.subarray(0, 80)).trimStart().toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html")) throw new Error("Mesh URL returned a page instead of a model.");
  if (!classifyMeshBytes(bytes)) throw new Error("Downloaded file is not a GLB, glTF or OBJ mesh.");
  return bytes;
}

export async function buildGameFoundryEngineArchive(input: {
  engine: string;
  projectName: string;
  prompt: string;
  assets: Array<{ input_name: string; output_url: string | null; processed_output_url: string | null }>;
  sourceFiles?: { path: string; content: string }[];
}) {
  const prepared: EngineBundleAsset[] = [];
  const omitted: string[] = [];
  for (const asset of input.assets) {
    const url = asset.processed_output_url || asset.output_url;
    if (!url) {
      omitted.push(`${asset.input_name}: no output URL.`);
      continue;
    }
    try {
      prepared.push({ name: asset.input_name, bytes: await downloadMeshBytes(url) });
    } catch (error) {
      omitted.push(`${asset.input_name}: ${error instanceof Error ? error.message : "download failed."}`);
    }
  }
  return buildEngineProjectZip({
    engine: input.engine,
    projectName: input.projectName,
    prompt: input.prompt,
    assets: prepared,
    omitted,
    ...(input.sourceFiles ? { sourceFiles: input.sourceFiles } : {}),
  });
}
