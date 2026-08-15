export type McpToolAccess = "read" | "write" | "approval";

export type McpToolCatalogItem = {
  name: string;
  title: string;
  description: string;
  area: "Agents" | "Mission Control" | "Approvals" | "Memory";
  access: McpToolAccess;
};

/**
 * Public metadata for the tools bundled into the PalladiumAI MCP server.
 * Keep this list aligned with src/lib/mcp/index.ts; it contains no credentials
 * and is safe to render in the authenticated product UI.
 */
export const PALLADIUM_MCP_TOOLS: McpToolCatalogItem[] = [
  {
    name: "list_agents",
    title: "List AI agents",
    description:
      "List the signed-in user's PalladiumAI personal agents with their category, autonomy level and status.",
    area: "Agents",
    access: "read",
  },
  {
    name: "create_agent",
    title: "Create AI agent",
    description: "Create a new PalladiumAI personal agent for the signed-in user.",
    area: "Agents",
    access: "write",
  },
  {
    name: "list_tasks",
    title: "List missions",
    description: "List the signed-in user's PalladiumAI Mission Control tasks, newest first.",
    area: "Mission Control",
    access: "read",
  },
  {
    name: "create_task",
    title: "Create mission",
    description: "Create a new Mission Control task for the signed-in user.",
    area: "Mission Control",
    access: "write",
  },
  {
    name: "list_approvals",
    title: "List approvals",
    description: "List approval requests belonging to the signed-in user.",
    area: "Approvals",
    access: "read",
  },
  {
    name: "decide_approval",
    title: "Decide approval",
    description:
      "Approve or reject one of the signed-in user's pending approval requests. Approval may authorise a consequential action and should only follow explicit user confirmation.",
    area: "Approvals",
    access: "approval",
  },
  {
    name: "list_memories",
    title: "List memories",
    description: "List saved memory-vault items for the signed-in user.",
    area: "Memory",
    access: "read",
  },
  {
    name: "remember",
    title: "Remember",
    description: "Store a new item in the signed-in user's PalladiumAI memory vault.",
    area: "Memory",
    access: "write",
  },
];

export const PALLADIUM_MCP_SERVER = {
  name: "palladiumai",
  title: "PalladiumAI",
  version: "0.1.0",
  resourcePath: "/mcp",
  listToolsPath: "/.mcp/list-tools",
  auth: "Supabase OAuth",
} as const;
