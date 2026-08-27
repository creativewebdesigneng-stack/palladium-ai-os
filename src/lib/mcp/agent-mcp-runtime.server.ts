import {
  callExternalMcpTool,
  listExternalMcpTools,
  type JsonObject,
} from "@/lib/mcp/external-mcp.server";

export type AgentExternalMcpCapability = {
  key: string;
  serverId: string;
  serverName: string;
  serverSlug: string;
  toolName: string;
  displayName: string;
  description: string;
  inputSchema: JsonObject;
  approval: "confirm";
  mutates: true;
};

type Db = { from: (table: string) => any };

type EnabledServer = {
  id: string;
  name: string;
  slug: string;
  requires_approval: boolean;
};

const MAX_AGENT_MCP_SERVERS = 20;
const MAX_AGENT_MCP_CAPABILITIES = 400;

function capabilityKey(serverId: string, toolName: string): string {
  return `external_mcp:${serverId}:${toolName}`;
}

function displayName(serverName: string, toolName: string): string {
  return `${serverName}: ${toolName.replace(/[_-]+/g, " ")}`.slice(0, 200);
}

async function listEnabledServers(sb: Db, userId: string): Promise<EnabledServer[]> {
  const { data, error } = await sb
    .from("external_mcp_servers")
    .select("id,name,slug,requires_approval")
    .eq("user_id", userId)
    .eq("enabled", true)
    .order("updated_at", { ascending: false })
    .limit(MAX_AGENT_MCP_SERVERS);

  if (error) throw new Error("External MCP servers could not be loaded for this agent.");
  return (data ?? []) as EnabledServer[];
}

export async function listAgentExternalMcpCapabilities(args: {
  sb: Db;
  userId: string;
}): Promise<AgentExternalMcpCapability[]> {
  const servers = await listEnabledServers(args.sb, args.userId);
  const results = await Promise.allSettled(
    servers.map(async (server) => {
      const discovered = await listExternalMcpTools({
        sb: args.sb,
        userId: args.userId,
        serverId: server.id,
      });
      return discovered.tools.map<AgentExternalMcpCapability>((tool) => ({
        key: capabilityKey(server.id, tool.name),
        serverId: server.id,
        serverName: server.name,
        serverSlug: server.slug,
        toolName: tool.name,
        displayName: displayName(server.name, tool.name),
        description: tool.description || `Run ${tool.name} on ${server.name}.`,
        inputSchema: tool.inputSchema,
        // External MCP metadata does not provide a trustworthy read/write
        // classification. Agent-side execution is therefore fail-closed: every
        // external MCP tool is treated as mutating and requires approval.
        approval: "confirm",
        mutates: true,
      }));
    }),
  );

  const capabilities: AgentExternalMcpCapability[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const capability of result.value) {
      capabilities.push(capability);
      if (capabilities.length >= MAX_AGENT_MCP_CAPABILITIES) return capabilities;
    }
  }
  return capabilities;
}

export async function findAgentExternalMcpCapability(args: {
  sb: Db;
  userId: string;
  serverId: string;
  toolName: string;
}): Promise<AgentExternalMcpCapability | null> {
  const discovered = await listExternalMcpTools({
    sb: args.sb,
    userId: args.userId,
    serverId: args.serverId,
  });
  const tool = discovered.tools.find((candidate) => candidate.name === args.toolName);
  if (!tool) return null;
  return {
    key: capabilityKey(discovered.server.id, tool.name),
    serverId: discovered.server.id,
    serverName: discovered.server.name,
    serverSlug: discovered.server.slug,
    toolName: tool.name,
    displayName: displayName(discovered.server.name, tool.name),
    description: tool.description || `Run ${tool.name} on ${discovered.server.name}.`,
    inputSchema: tool.inputSchema,
    approval: "confirm",
    mutates: true,
  };
}

export async function executeAgentExternalMcpCapability(args: {
  sb: Db;
  userId: string;
  serverId: string;
  toolName: string;
  input: Record<string, unknown>;
  approved: boolean;
}): Promise<unknown> {
  if (!args.approved) {
    throw new Error("External MCP agent actions require explicit operator approval before execution.");
  }

  const capability = await findAgentExternalMcpCapability({
    sb: args.sb,
    userId: args.userId,
    serverId: args.serverId,
    toolName: args.toolName,
  });
  if (!capability) throw new Error("That external MCP capability is no longer available.");

  return callExternalMcpTool({
    sb: args.sb,
    userId: args.userId,
    serverId: capability.serverId,
    toolName: capability.toolName,
    input: args.input,
    approved: true,
  });
}
