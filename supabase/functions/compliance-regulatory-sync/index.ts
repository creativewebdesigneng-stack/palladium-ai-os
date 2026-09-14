import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_SOURCES_PER_RUN = 12;
const MAX_RESPONSE_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 15_000;
const SCHEDULER_CREDENTIAL = "compliance_regulatory_sync";
const ALLOWED_HOSTS = new Set([
  "handbook.fca.org.uk",
  "www.legislation.gov.uk",
  "legislation.gov.uk",
  "eur-lex.europa.eu",
  "www.govinfo.gov",
  "govinfo.gov",
  "www.sec.gov",
  "sec.gov",
  "ico.org.uk",
  "www.bankofengland.co.uk",
  "bankofengland.co.uk",
  "www.gov.uk",
]);

const jsonHeaders = { "Content-Type": "application/json" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function bearerToken(req: Request): string {
  const value = req.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match?.[1]?.trim() || "";
}

async function schedulerAuthorized(supabase: any, req: Request): Promise<boolean> {
  const token = bearerToken(req);
  if (token.length < 32 || token.length > 512) return false;
  const suppliedHash = await sha256(token);
  const { data, error } = await supabase
    .from("compliance_scheduler_credentials")
    .select("token_sha256,enabled")
    .eq("name", SCHEDULER_CREDENTIAL)
    .maybeSingle();
  if (error || !data?.enabled || typeof data.token_sha256 !== "string") return false;
  return safeEqualHex(data.token_sha256, suppliedHash);
}

function normalizedText(input: string): string {
  return input
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function safeOfficialUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) throw new Error("source_host_not_allowlisted");
  return url;
}

function monitorUrl(source: any): URL {
  if (source.adapter === "fca_handbook") return safeOfficialUrl("https://handbook.fca.org.uk/index.html");
  return safeOfficialUrl(String(source.api_url || source.canonical_url));
}

function nextCheck(intervalHours: number): string {
  const hours = Math.max(1, Math.min(720, Number(intervalHours || 24)));
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function sourceTitle(source: any): string {
  return `${source.title} — authoritative source monitor`;
}

async function fetchAuthoritativeSource(source: any) {
  const url = monitorUrl(source);
  const headers = new Headers({
    Accept: "text/html,application/xhtml+xml,application/json,application/xml,text/xml;q=0.9,*/*;q=0.5",
    "User-Agent": "Blackstar-Compliance-Sentinel/1.0 (+source-monitoring)",
  });
  if (source.etag) headers.set("If-None-Match", String(source.etag));
  if (source.last_modified) headers.set("If-Modified-Since", String(source.last_modified));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const result = await fetch(url, { method: "GET", headers, redirect: "follow", signal: controller.signal });
    safeOfficialUrl(result.url);
    if (result.status === 304) return { unchanged: true, status: 304, url: result.url, etag: result.headers.get("etag"), lastModified: result.headers.get("last-modified") };
    if (!result.ok) throw new Error(`source_http_${result.status}`);
    const length = Number(result.headers.get("content-length") || "0");
    if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) throw new Error("source_response_too_large");
    const raw = await result.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_RESPONSE_BYTES) throw new Error("source_response_too_large");
    const contentType = result.headers.get("content-type") || "";
    const normalized = contentType.includes("html") ? normalizedText(raw) : raw.replace(/\s+/g, " ").trim();
    if (!normalized) throw new Error("source_empty_response");
    return {
      unchanged: false,
      status: result.status,
      url: result.url,
      etag: result.headers.get("etag"),
      lastModified: result.headers.get("last-modified"),
      normalized,
      hash: await sha256(normalized),
      contentType,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function ensureSourceMonitorRegulation(supabase: any, source: any) {
  const reference = `source-monitor:${source.id}`;
  const { data: existing, error: findError } = await supabase
    .from("compliance_regulations")
    .select("id,current_version_id,status")
    .eq("source_id", source.id)
    .eq("regulator_reference", reference)
    .maybeSingle();
  if (findError) throw new Error(`regulation_lookup_failed:${findError.message}`);
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("compliance_regulations")
    .insert({
      source_id: source.id,
      regulator_reference: reference,
      title: sourceTitle(source),
      jurisdiction: source.jurisdiction,
      domains: ["regulatory-intelligence"],
      sectors: [],
      status: "unknown",
      summary: "Sentinel source-level monitor. Review captured versions and the authoritative source before making an applicability or legal conclusion.",
      canonical_url: source.canonical_url,
      metadata: { sentinel_kind: "source_monitor", source_type: source.source_type, adapter: source.adapter },
    })
    .select("id,current_version_id,status")
    .single();
  if (error) throw new Error(`regulation_create_failed:${error.message}`);
  return created;
}

async function syncOne(supabase: any, source: any) {
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await supabase
    .from("compliance_sync_runs")
    .insert({ source_id: source.id, status: "running", started_at: startedAt })
    .select("id")
    .single();
  if (runError) throw new Error(`sync_run_create_failed:${runError.message}`);

  try {
    if (!source.automation_ready) {
      await supabase.from("compliance_sync_runs").update({ status: "skipped", finished_at: new Date().toISOString(), diagnostics: { reason: "adapter_not_verified" } }).eq("id", run.id);
      return { sourceId: source.id, status: "skipped", reason: "adapter_not_verified" };
    }
    if (!["fca_handbook", "official_web"].includes(source.adapter)) {
      await supabase.from("compliance_sync_runs").update({ status: "skipped", finished_at: new Date().toISOString(), diagnostics: { reason: "adapter_not_deployed", adapter: source.adapter } }).eq("id", run.id);
      return { sourceId: source.id, status: "skipped", reason: "adapter_not_deployed" };
    }

    const fetched = await fetchAuthoritativeSource(source);
    const checkedAt = new Date().toISOString();
    if (fetched.unchanged || (fetched as any).hash === source.content_hash) {
      await supabase.from("compliance_regulatory_sources").update({
        last_checked_at: checkedAt,
        last_success_at: checkedAt,
        next_check_at: nextCheck(source.check_interval_hours),
        etag: fetched.etag || source.etag,
        last_modified: fetched.lastModified || source.last_modified,
        last_error: null,
      }).eq("id", source.id);
      await supabase.from("compliance_sync_runs").update({ status: "success", finished_at: checkedAt, http_status: fetched.status, items_seen: 1, diagnostics: { unchanged: true, fetched_url: fetched.url } }).eq("id", run.id);
      return { sourceId: source.id, status: "success", changed: false };
    }

    const regulation = await ensureSourceMonitorRegulation(supabase, source);
    const oldVersionId = regulation.current_version_id || null;
    const { data: version, error: versionError } = await supabase
      .from("compliance_regulation_versions")
      .insert({
        regulation_id: regulation.id,
        version_label: checkedAt,
        source_url: (fetched as any).url,
        content_hash: (fetched as any).hash,
        content_text: (fetched as any).normalized.slice(0, 250_000),
        structured_content: {},
        diff_summary: oldVersionId ? "Authoritative source content changed. Applicability and legal effect require review." : "Initial authoritative source snapshot captured.",
        provenance: { adapter: source.adapter, http_status: fetched.status, content_type: (fetched as any).contentType, etag: fetched.etag, last_modified: fetched.lastModified },
        captured_at: checkedAt,
      })
      .select("id")
      .single();
    if (versionError) throw new Error(`version_create_failed:${versionError.message}`);

    const changeType = oldVersionId ? "updated" : "new";
    const { error: changeError } = await supabase.from("compliance_regulatory_changes").insert({
      regulation_id: regulation.id,
      previous_version_id: oldVersionId,
      current_version_id: version.id,
      change_type: changeType,
      severity: "medium",
      authoritative: true,
      detected_at: checkedAt,
      summary: oldVersionId
        ? `${source.title} changed at its authoritative source. Sentinel captured a new immutable snapshot; review the source before determining legal or operational impact.`
        : `${source.title} initial authoritative snapshot captured by Sentinel.`,
      review_required: true,
      provenance: { source_id: source.id, source_url: (fetched as any).url, adapter: source.adapter, content_hash: (fetched as any).hash },
    });
    if (changeError) throw new Error(`change_create_failed:${changeError.message}`);

    const { error: regulationUpdateError } = await supabase.from("compliance_regulations").update({ current_version_id: version.id, updated_at: checkedAt }).eq("id", regulation.id);
    if (regulationUpdateError) throw new Error(`regulation_update_failed:${regulationUpdateError.message}`);

    await supabase.from("compliance_regulatory_sources").update({
      last_checked_at: checkedAt,
      last_success_at: checkedAt,
      next_check_at: nextCheck(source.check_interval_hours),
      etag: fetched.etag,
      last_modified: fetched.lastModified,
      content_hash: (fetched as any).hash,
      last_error: null,
    }).eq("id", source.id);
    await supabase.from("compliance_sync_runs").update({
      status: "success",
      finished_at: checkedAt,
      http_status: fetched.status,
      items_seen: 1,
      versions_created: 1,
      changes_created: 1,
      diagnostics: { unchanged: false, fetched_url: (fetched as any).url, content_hash: (fetched as any).hash },
    }).eq("id", run.id);
    return { sourceId: source.id, status: "success", changed: true, versionId: version.id };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "unknown_sync_error";
    const finishedAt = new Date().toISOString();
    await supabase.from("compliance_regulatory_sources").update({
      last_checked_at: finishedAt,
      next_check_at: nextCheck(Math.min(24, source.check_interval_hours || 24)),
      last_error: message,
    }).eq("id", source.id);
    await supabase.from("compliance_sync_runs").update({ status: "failed", finished_at: finishedAt, error: message }).eq("id", run.id);
    return { sourceId: source.id, status: "failed", error: message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const secret = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !secret) return response({ error: "runtime_not_configured" }, 503);

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  if (!(await schedulerAuthorized(supabase, req))) return response({ error: "unauthorized" }, 401);

  const now = new Date().toISOString();
  const { data: sources, error } = await supabase
    .from("compliance_regulatory_sources")
    .select("*")
    .eq("active", true)
    .lte("next_check_at", now)
    .order("next_check_at", { ascending: true })
    .limit(MAX_SOURCES_PER_RUN);
  if (error) return response({ error: "source_query_failed", detail: error.message }, 500);

  const results = [];
  for (const source of sources || []) results.push(await syncOne(supabase, source));
  return response({ ok: true, checked: results.length, results });
});
