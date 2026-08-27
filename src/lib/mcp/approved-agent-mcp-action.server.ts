import { executeAgentExternalMcpCapability } from "./agent-mcp-runtime.server";

type Db = { from: (table: string) => any };

export type ApprovedAgentMcpExecutionResult =
  | { ok: true; provider: "mcp"; result: Record<string, unknown>; error?: undefined }
  | { ok: false; provider: "mcp"; error: string; result?: undefined };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function boundedString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Execute an already-approved external MCP action from its immutable approval
 * payload. The MCP adapter deliberately re-resolves the server and tool before
 * dispatch so disabling a server, removing an allow-listed tool, or changing
 * ownership after approval prevents execution instead of replaying stale state.
 *
 * The supplied database client must be the authenticated user's request-scoped
 * client. RLS therefore remains part of the authorization boundary even after
 * the operator has approved the action.
 */
export async function executeApprovedAgentMcpAction(args: {
  sb: Db;
  userId: string;
  details: Record<string, unknown>;
}): Promise<ApprovedAgentMcpExecutionResult> {
  const serverId = boundedString(args.details["server_id"], 128);
  const toolName = boundedString(args.details["tool_name"], 160);
  const input = record(args.details["input"]);

  if (!serverId) return { ok: false, provider: "mcp", error: "Approved MCP server is missing." };
  if (!toolName) return { ok: false, provider: "mcp", error: "Approved MCP tool is missing." };

  try {
    const result = await executeAgentExternalMcpCapability({
      sb: args.sb,
      userId: args.userId,
      serverId,
      toolName,
      input,
      approved: true,
    });
    return { ok: true, provider: "mcp", result: { mcp_result: result } };
  } catch (error) {
    return {
      ok: false,
      provider: "mcp",
      error: error instanceof Error ? error.message.slice(0, 1000) : "External MCP action failed.",
    };
  }
}
