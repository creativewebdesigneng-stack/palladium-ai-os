import {
  executeIntegrationAction,
  prepareIntegrationAction,
} from "@/lib/integrations/agent-integration-runtime.server";
import {
  listAgentMcpIntegrationCapabilities,
  prepareAgentMcpIntegrationAction,
} from "@/lib/mcp/agent-mcp-integration-bridge.server";
import {
  assertPublicMcpEndpoint,
  validateExternalMcpEndpoint,
} from "@/lib/mcp/external-mcp.server";

type Sb = { from: (table: string) => any };
const MAX_RESULT_BYTES = 1_000_000;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_RESULT_BYTES) throw new Error("Datasource response exceeded the 1 MB limit.");
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    bytes += next.value.byteLength;
    if (bytes > MAX_RESULT_BYTES) {
      await reader.cancel();
      throw new Error("Datasource response exceeded the 1 MB limit.");
    }
    chunks.push(next.value);
  }
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  const text = new TextDecoder().decode(merged);
  try { return JSON.parse(text); } catch { return { text: text.slice(0, MAX_RESULT_BYTES) }; }
}

async function loadQuery(sb: Sb, userId: string, queryId: string) {
  const query = await sb.from("app_studio_queries").select("*").eq("id", queryId).eq("user_id", userId).maybeSingle();
  if (query.error) throw new Error(query.error.message);
  if (!query.data) throw new Error("App Studio query not found.");
  const source = await sb.from("app_studio_datasources").select("*").eq("id", query.data.datasource_id).eq("app_id", query.data.app_id).eq("user_id", userId).eq("enabled", true).maybeSingle();
  if (source.error) throw new Error(source.error.message);
  if (!source.data) throw new Error("App Studio datasource is unavailable.");
  return { query: query.data, source: source.data };
}

async function queueApproval(sb: Sb, userId: string, row: Record<string, unknown>) {
  const result = await sb.from("approval_requests").insert({ user_id: userId, org_id: null, agent_id: null, task_id: null, status: "pending", ...row }).select("id").maybeSingle();
  if (result.error || !result.data) throw new Error("Could not queue the App Studio query for approval.");
  return { status: "awaiting_approval" as const, approvalRequestId: String(result.data.id) };
}

async function executePublicQuery(source: any, query: any, input: Record<string, unknown>) {
  const config = record(source.config);
  const queryConfig = record(query.configuration);
  const rawUrl = String(queryConfig["url"] ?? config["baseUrl"] ?? "");
  const url = validateExternalMcpEndpoint(rawUrl);
  await assertPublicMcpEndpoint(url);
  const operation = String(query.operation).toLowerCase();
  if (source.provider === "rest" && operation !== "get") {
    throw new Error("Direct REST datasources are read-only. Use a connected integration or MCP tool for writes so PalladiumAI approval controls apply.");
  }
  const method = source.provider === "graphql" ? "POST" : "GET";
  if (method === "GET") {
    for (const [key, value] of Object.entries(input)) {
      if (["string","number","boolean"].includes(typeof value)) url.searchParams.set(key, String(value));
    }
  }
  const response = await fetch(url, {
    method,
    redirect: "manual",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "PalladiumAI-AppStudio/1.0" },
    ...(method === "POST" ? { body: JSON.stringify({ query: String(queryConfig["document"] ?? ""), variables: input }) } : {}),
    signal: AbortSignal.timeout(Math.min(60_000, Number(query.timeout_ms) || 15_000)),
  });
  if (response.status >= 300 && response.status < 400) throw new Error("Datasource redirects are not followed for network safety.");
  if (!response.ok) throw new Error(`Datasource request failed (${response.status}).`);
  return readBoundedJson(response);
}

export async function executeStudioQuery(args: {
  sb: Sb;
  userId: string;
  queryId: string;
  input?: Record<string, unknown>;
}): Promise<unknown> {
  const { query, source } = await loadQuery(args.sb, args.userId, args.queryId);
  const input = args.input ?? {};

  if (source.provider === "mcp") {
    const serverId = String(source.connection_ref ?? "").replace(/^mcp:/, "");
    const capabilities = await listAgentMcpIntegrationCapabilities({ sb: args.sb, userId: args.userId });
    const capability = capabilities.find((item) => item.serverId === serverId && item.toolName === query.operation);
    if (!capability) throw new Error("The configured MCP capability is no longer available.");
    const prepared = await prepareAgentMcpIntegrationAction({ sb: args.sb, userId: args.userId, action: capability.key, actionInput: { ...record(query.configuration), ...input } });
    return queueApproval(args.sb, args.userId, {
      action_type: "external_mcp_action",
      title: `${query.name}: MCP`.slice(0, 180),
      summary: "Approve this App Studio MCP query. The server, tool and exact input are immutable.",
      details: { ...prepared.approvalDetails, app_studio_query_id: query.id },
      risk_level: "high",
    });
  }

  if (source.provider === "integration") {
    const provider = String(source.connection_ref ?? "").replace(/^integration:/, "");
    const prepared = await prepareIntegrationAction({ userId: args.userId, provider, action: String(query.operation), actionInput: { ...record(query.configuration), ...input } });
    if (prepared.requiresApproval || query.requires_approval) {
      return queueApproval(args.sb, args.userId, {
        action_type: "nango_dynamic_action",
        title: `${query.name}: ${prepared.provider}`.slice(0, 180),
        summary: "Approve this App Studio connected action. Provider, action, transport and exact input are immutable.",
        details: { provider: prepared.provider, action: prepared.action, input: prepared.input, transport: prepared.transport, app_studio_query_id: query.id },
        risk_level: prepared.risk === "low" ? "medium" : prepared.risk,
      });
    }
    return executeIntegrationAction({ userId: args.userId, provider: prepared.provider, action: prepared.action, actionInput: prepared.input, transport: prepared.transport });
  }

  if (source.provider === "rest" || source.provider === "graphql") {
    if (query.requires_approval) throw new Error("Approval-gated HTTP writes must use an integration or MCP datasource.");
    return executePublicQuery(source, query, input);
  }

  throw new Error("This datasource must be connected through PalladiumAI integrations before it can execute.");
}
