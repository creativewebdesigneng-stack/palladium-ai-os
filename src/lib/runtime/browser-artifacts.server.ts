import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import type { BrowserTool } from "@/lib/mission/browser-agent";
import { isDomainAllowed } from "@/lib/mission/browser-agent";

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

function privateIp(ip: string) {
  if (!net.isIP(ip)) return true;
  if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc") || ip.startsWith("fd")) return true;
  if (net.isIPv4(ip)) {
    const [a = 0, b = 0] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return false;
}

async function assertDownloadUrl(raw: string, allowedDomains: string[]) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Download link is not a valid URL."); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http(s) downloads are supported.");
  if (!isDomainAllowed(url.toString(), allowedDomains)) {
    throw new Error("Download link is outside this agent's domain allow-list.");
  }
  const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => privateIp(address))) {
    throw new Error("Download link resolves to a private or unsafe network address.");
  }
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
  const match = items.find((item) => item && typeof item === "object" && (item as any).selector === args.selector) as any;
  const href = typeof match?.href === "string" ? match.href : "";
  if (!href) throw new Error("The selected browser control does not expose a downloadable link.");
  const url = await assertDownloadUrl(href, args.allowedDomains);

  const response = await fetch(url, {
    redirect: "follow",
    signal: args.signal ?? AbortSignal.timeout(30_000),
    headers: { "User-Agent": "PalladiumAI-BrowserArtifact/1.0" },
  });
  if (!response.ok) throw new Error(`Download failed (${response.status}).`);
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_DOWNLOAD_BYTES) throw new Error("Browser download exceeds the 25 MB artifact limit.");
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.byteLength > MAX_DOWNLOAD_BYTES) throw new Error("Browser download exceeds the 25 MB artifact limit.");

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
  mimeType?: string | null;
  data: Uint8Array;
  sourceUrl?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

  const { data: artifact, error } = await supabaseAdmin
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
