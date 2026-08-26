import { lookup } from "node:dns/promises";
import { decryptToken } from "@/lib/integrations/oauth.server";

const MCP_PROTOCOL_VERSION = "2025-06-18";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_TOOL_COUNT = 200;

export type ExternalMcpServer = {
  id: string;
  user_id: string;
  org_id: string | null;
  name: string;
  slug: string;
  endpoint_url: string;
  auth_header_name: string | null;
  auth_header_ciphertext: string | null;
  enabled: boolean;
  requires_approval: boolean;
  allowed_tool_names: string[] | null;
};

export type ExternalMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

type Db = { from: (table: string) => any };
type LookupAddress = { address: string; family: number };
type LookupFn = (host: string) => Promise<LookupAddress[]>;
type FetchFn = typeof fetch;

type RpcEnvelope = {
  jsonrpc?: string;
  id?: string | number | null;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
};

type RuntimeOptions = {
  fetchImpl?: FetchFn;
  lookupImpl?: LookupFn;
  signal?: AbortSignal;
};

function isIpv4Private(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a = 0, b = 0] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateAddress(address: string): boolean {
  const value = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (isIpv4Private(value)) return true;
  if (value === "::" || value === "::1") return true;
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(value) || /^fe[89ab][0-9a-f]:/i.test(value)) return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(value)?.[1];
  return mapped ? isIpv4Private(mapped) : false;
}

export function validateExternalMcpEndpoint(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("MCP endpoint must be a valid HTTPS URL.");
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("MCP endpoint must use HTTPS and cannot contain embedded credentials.");
  }
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal" ||
    host === "metadata.google" ||
    isPrivateAddress(host)
  ) {
    throw new Error("MCP endpoint must resolve to a public network host.");
  }
  url.hash = "";
  return url;
}

async function defaultLookup(host: string): Promise<LookupAddress[]> {
  return lookup(host, { all: true, verbatim: true });
}

export async function assertPublicMcpEndpoint(
  endpoint: URL,
  lookupImpl: LookupFn = defaultLookup,
): Promise<void> {
  const addresses = await lookupImpl(endpoint.hostname);
  if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) {
    throw new Error("MCP endpoint resolved to a private or unavailable network address.");
  }
}

function safeAuthHeaderName(value: string | null): string | null {
  if (!value) return null;
  if (!/^[A-Za-z][A-Za-z0-9-]{0,63}$/.test(value)) throw new Error("Invalid MCP auth header name.");
  const lower = value.toLowerCase();
  if (["host", "content-length", "connection", "transfer-encoding", "mcp-session-id"].includes(lower)) {
    throw new Error("That MCP auth header name is reserved.");
  }
  return value;
}

async function loadServer(sb: Db, userId: string, serverId: string): Promise<ExternalMcpServer> {
  const { data, error } = await sb
    .from("external_mcp_servers")
    .select(
      "id,user_id,org_id,name,slug,endpoint_url,auth_header_name,auth_header_ciphertext,enabled,requires_approval,allowed_tool_names",
    )
    .eq("id", serverId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("External MCP server is not available.");
  if (!data.enabled) throw new Error("External MCP server is disabled.");
  return data as ExternalMcpServer;
}

async function readBoundedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_RESPONSE_BYTES) throw new Error("MCP response exceeded the size limit.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("MCP response exceeded the size limit.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function parseRpcBody(text: string): RpcEnvelope {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("MCP server returned an empty response.");
  if (trimmed.startsWith("data:")) {
    const dataLines = trimmed
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== "[DONE]");
    for (let index = dataLines.length - 1; index >= 0; index -= 1) {
      try {
        return JSON.parse(dataLines[index]!) as RpcEnvelope;
      } catch {
        // Continue to the previous event.
      }
    }
    throw new Error("MCP server returned unreadable event-stream data.");
  }
  try {
    return JSON.parse(trimmed) as RpcEnvelope;
  } catch {
    throw new Error("MCP server returned unreadable JSON.");
  }
}

function combineSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function postRpc(args: {
  server: ExternalMcpServer;
  method: string;
  params?: Record<string, unknown>;
  sessionId?: string | null;
  requestId: number;
  options?: RuntimeOptions;
}): Promise<{ envelope: RpcEnvelope; sessionId: string | null }> {
  const endpoint = validateExternalMcpEndpoint(args.server.endpoint_url);
  await assertPublicMcpEndpoint(endpoint, args.options?.lookupImpl ?? defaultLookup);
  const authName = safeAuthHeaderName(args.server.auth_header_name);
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
    "User-Agent": "PalladiumAI-MCP/1.0",
  };
  if (args.sessionId) headers["Mcp-Session-Id"] = args.sessionId;
  if (authName && args.server.auth_header_ciphertext) {
    headers[authName] = decryptToken(args.server.auth_header_ciphertext);
  }
  const response = await (args.options?.fetchImpl ?? fetch)(endpoint, {
    method: "POST",
    headers,
    redirect: "manual",
    signal: combineSignal(args.options?.signal),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: args.requestId,
      method: args.method,
      ...(args.params ? { params: args.params } : {}),
    }),
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error("MCP endpoint redirects are not followed for network safety.");
  }
  if (!response.ok) throw new Error(`MCP request failed (${response.status}).`);
  const envelope = parseRpcBody(await readBoundedText(response));
  if (envelope.error) {
    throw new Error(String(envelope.error.message ?? `MCP error ${envelope.error.code ?? "unknown"}`).slice(0, 400));
  }
  return { envelope, sessionId: response.headers.get("mcp-session-id") ?? args.sessionId ?? null };
}

async function initialise(server: ExternalMcpServer, options?: RuntimeOptions): Promise<string | null> {
  const response = await postRpc({
    server,
    method: "initialize",
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "PalladiumAI", version: "1.0" },
    },
    requestId: 1,
    options,
  });
  return response.sessionId;
}

function normaliseTool(value: unknown): ExternalMcpTool | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const name = typeof row["name"] === "string" ? row["name"].trim() : "";
  if (!name || name.length > 160) return null;
  const description = typeof row["description"] === "string" ? row["description"].slice(0, 2000) : "";
  const schema = row["inputSchema"];
  const inputSchema = schema && typeof schema === "object" && !Array.isArray(schema)
    ? (schema as Record<string, unknown>)
    : { type: "object", properties: {} };
  return { name, description, inputSchema };
}

export async function listExternalMcpTools(args: {
  sb: Db;
  userId: string;
  serverId: string;
  options?: RuntimeOptions;
}): Promise<{ server: Pick<ExternalMcpServer, "id" | "name" | "slug" | "requires_approval">; tools: ExternalMcpTool[] }> {
  const server = await loadServer(args.sb, args.userId, args.serverId);
  const sessionId = await initialise(server, args.options);
  const response = await postRpc({
    server,
    method: "tools/list",
    params: {},
    sessionId,
    requestId: 2,
    options: args.options,
  });
  const result = response.envelope.result as Record<string, unknown> | undefined;
  const discovered = Array.isArray(result?.["tools"])
    ? (result!["tools"] as unknown[]).map(normaliseTool).filter((tool): tool is ExternalMcpTool => Boolean(tool)).slice(0, MAX_TOOL_COUNT)
    : [];
  const allow = new Set((server.allowed_tool_names ?? []).filter(Boolean));
  const tools = allow.size ? discovered.filter((tool) => allow.has(tool.name)) : discovered;
  await args.sb
    .from("external_mcp_servers")
    .update({
      cached_tools: tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema })),
      last_discovered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", server.id)
    .eq("user_id", args.userId);
  return {
    server: { id: server.id, name: server.name, slug: server.slug, requires_approval: server.requires_approval },
    tools,
  };
}

export async function callExternalMcpTool(args: {
  sb: Db;
  userId: string;
  serverId: string;
  toolName: string;
  input: Record<string, unknown>;
  approved?: boolean;
  options?: RuntimeOptions;
}): Promise<unknown> {
  const server = await loadServer(args.sb, args.userId, args.serverId);
  if (server.requires_approval && !args.approved) {
    throw new Error("This external MCP server requires explicit operator approval before tool execution.");
  }
  const allowed = server.allowed_tool_names ?? [];
  if (allowed.length && !allowed.includes(args.toolName)) throw new Error("That MCP tool is not allowed for this server.");
  const sessionId = await initialise(server, args.options);
  const response = await postRpc({
    server,
    method: "tools/call",
    params: { name: args.toolName.slice(0, 160), arguments: args.input },
    sessionId,
    requestId: 2,
    options: args.options,
  });
  return response.envelope.result ?? null;
}
