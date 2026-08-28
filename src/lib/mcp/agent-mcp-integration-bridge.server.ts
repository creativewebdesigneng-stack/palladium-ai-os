import {
  findAgentExternalMcpCapability,
  listAgentExternalMcpCapabilities,
} from "./agent-mcp-runtime.server";

type Db = { from: (table: string) => any };

const MCP_PROVIDER = "mcp" as const;
const MCP_TRANSPORT = "external_mcp" as const;
const MCP_LANE = "connector_transport" as const;
const MAX_MCP_INPUT_BYTES = 100_000;

export type AgentMcpIntegrationCapability = {
  provider: typeof MCP_PROVIDER;
  action: string;
  description: string;
  risk: "high";
  requiresApproval: true;
  deployed: true;
  inputSchema: Record<string, unknown>;
  transport: typeof MCP_TRANSPORT;
  lane: typeof MCP_LANE;
};

export type PreparedAgentMcpIntegrationAction = AgentMcpIntegrationCapability & {
  input: Record<string, unknown>;
  serverId: string;
  toolName: string;
  approvalDetails: {
    provider: typeof MCP_PROVIDER;
    server_id: string;
    tool_name: string;
    input: Record<string, unknown>;
    transport: typeof MCP_TRANSPORT;
  };
};

function asInput(value: Record<string, unknown>): Record<string, unknown> {
  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw new Error("MCP action input must be JSON serialisable.");
  }
  if (Buffer.byteLength(encoded, "utf8") > MAX_MCP_INPUT_BYTES) {
    throw new Error("MCP action input exceeds the allowed size.");
  }
  return value;
}

function parseCapabilityKey(action: string): { serverId: string; toolName: string } | null {
  const value = action.trim();
  if (!value.startsWith("external_mcp:")) return null;
  const remainder = value.slice("external_mcp:".length);
  const separator = remainder.indexOf(":");
  if (separator <= 0 || separator === remainder.length - 1) return null;
  const serverId = remainder.slice(0, separator).trim();
  const toolName = remainder.slice(separator + 1).trim();
  if (!serverId || serverId.length > 128 || !toolName || toolName.length > 160) return null;
  return { serverId, toolName };
}

function inputSchema(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { type: "object", properties: {} };
}

export async function listAgentMcpIntegrationCapabilities(args: {
  sb: Db;
  userId: string;
}): Promise<AgentMcpIntegrationCapability[]> {
  const capabilities = await listAgentExternalMcpCapabilities(args);
  return capabilities.map((capability) => ({
    provider: MCP_PROVIDER,
    action: capability.key,
    description: capability.description,
    risk: "high",
    requiresApproval: true,
    deployed: true,
    inputSchema: inputSchema(capability.inputSchema),
    transport: MCP_TRANSPORT,
    lane: MCP_LANE,
  }));
}

/**
 * Re-resolve an MCP capability immediately before an approval request is
 * created. This prevents a model from fabricating server/tool identifiers and
 * gives the approval record an immutable, bounded payload.
 */
export async function prepareAgentMcpIntegrationAction(args: {
  sb: Db;
  userId: string;
  action: string;
  actionInput: Record<string, unknown>;
}): Promise<PreparedAgentMcpIntegrationAction> {
  const parsed = parseCapabilityKey(args.action);
  if (!parsed) throw new Error("The MCP action identifier is invalid.");

  const capability = await findAgentExternalMcpCapability({
    sb: args.sb,
    userId: args.userId,
    serverId: parsed.serverId,
    toolName: parsed.toolName,
  });
  if (!capability || capability.key !== args.action.trim()) {
    throw new Error("That external MCP capability is no longer available.");
  }

  const input = asInput(args.actionInput);
  return {
    provider: MCP_PROVIDER,
    action: capability.key,
    description: capability.description,
    risk: "high",
    requiresApproval: true,
    deployed: true,
    inputSchema: inputSchema(capability.inputSchema),
    transport: MCP_TRANSPORT,
    lane: MCP_LANE,
    input,
    serverId: capability.serverId,
    toolName: capability.toolName,
    approvalDetails: {
      provider: MCP_PROVIDER,
      server_id: capability.serverId,
      tool_name: capability.toolName,
      input,
      transport: MCP_TRANSPORT,
    },
  };
}
