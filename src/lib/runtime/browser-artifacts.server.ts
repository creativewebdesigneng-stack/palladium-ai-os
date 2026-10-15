import crypto from "node:crypto";
import { assertPublicNetworkEndpoint } from "@/lib/security/public-network.server";
import type { BrowserTool } from "@/lib/mission/browser-agent";
import { isDomainAllowed } from "@/lib/mission/browser-agent";
import { asBrowserDatabase } from "./browser-database.types";

const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

function safeName(value: string) {
  return (
    value
      .replace(/[\\/\0<>:"|?*]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "browser-download"
  );
}

async function assertDownloadUrl(raw: string, allowedDomains: string[]) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Download link is not a valid URL."); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http(s) downloads are supported.");
  if (url.username || url.password) throw new Error("Download links cannot contain embedded credentials.");
  if (!isDomainAllowed(url.toString(), allowedDomains)) {
    throw new Error("Download link is outside this agent's domain allow-list.");
  }
  await assertPublicNetworkEndpoint(url);
  return url;
}

function filenameFromResponse(url: URL, header: string | null, hint?: string) {
  if (hint) return safeName(hint);
  const utf8 = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const basic = header?.match(/filename="?([^";]+)"?/i)?.[1];
  const candidate = utf8 ? decodeURIComponent(utf8) : basic || url.pathname.split("/").filter(Boolean).pop() || "browser-download";
  return safeName(candidate);
}

export async function captureBrowserDownloadFromPage(args: {
  tool: BrowserTool;
  currentUrl: string;
  selector: string;
  allowedDomains: string[];
  filenameHint?: string;
  signal?: AbortSignal;
}) {
  const page = await args.tool.extract(args.currentUrl);
  const items = Array.isArray(page.items) ? page.items : [];
  const match = items.find((item) => item && typeof item === "object" && (item as { selector?: unknown }).selector === args.selector) as { href?: unknown } | undefined;
  const href = typeof match?.href === "string" ? match.href : "";
  if (!href) throw new Error("The selected browser control does not expose a downloadable link.");
  const url = await assertDownloadUrl(href, args.allowedDomains);

  const response = await fetch(url, {
    redirect: "manual",
    signal: args.signal ? AbortSignal.any([args.signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
    headers: { "User-Agent": "PalladiumAI-BrowserArtifact/1.0" },
  });
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel();
    throw new Error("Browser download redirects require a separately verified link.");
  }
  if (!response.ok) throw new Error(`Download failed (${response.status}).`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_DOWNLOAD_BYTES) {
    await response.body?.cancel();
    throw new Error("Browser download exceeds the 25 MB artifact limit.");
  }
  const chunks: Uint8Array[] = [];
  let sizeBytes = 0;
  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sizeBytes += value.byteLength;
        if (sizeBytes > MAX_DOWNLOAD_BYTES) {
          await reader.cancel();
          throw new Error("Browser download exceeds the 25 MB artifact limit.");
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
  }
  const data = new Uint8Array(sizeBytes);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.byteLength; }

  return {
    filename: filenameFromResponse(url, response.headers.get("content-disposition"), args.filenameHint),
    mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream",
    sizeBytes: data.byteLength,
    data,
    sourceUrl: url.toString(),
  };
}

export async function storeBrowserArtifact(args: {
  userId: string;
  orgId: string | null;
  agentId: string;
  taskId: string | null;
  filename: string;
  mimeType?: string | null | undefined;
  data: Uint8Array;
  sourceUrl?: string | null | undefined;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = asBrowserDatabase(supabaseAdmin);
  const sha256 = crypto.createHash("sha256").update(args.data).digest("hex");
  const filename = safeName(args.filename);
  const path = `${args.userId}/browser/${Date.now()}-${crypto.randomUUID()}-${filename}`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from("knowledge")
    .upload(path, args.data, {
      contentType: args.mimeType || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) throw new Error(`Browser artifact could not be stored: ${uploadError.message}`);

  const { data: artifact, error } = await db
    .from("browser_artifacts")
    .insert({
      user_id: args.userId,
      org_id: args.orgId,
      agent_id: args.agentId,
      task_id: args.taskId,
      kind: "download",
      filename,
      mime_type: args.mimeType || null,
      size_bytes: args.data.byteLength,
      sha256,
      storage_path: path,
      source_url: args.sourceUrl || null,
    })
    .select("id,filename,mime_type,size_bytes,sha256,created_at")
    .maybeSingle();
  if (error || !artifact) {
    await supabaseAdmin.storage.from("knowledge").remove([path]).catch(() => {});
    throw new Error("Browser artifact metadata could not be stored.");
  }
  return {
    artifact_id: artifact.id,
    filename: artifact.filename,
    mime_type: artifact.mime_type,
    size_bytes: artifact.size_bytes,
    sha256: artifact.sha256,
    private: true,
  };
}
