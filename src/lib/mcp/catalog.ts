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
    description:
      "Create a new Mission Control task (mission) for the signed-in user, optionally assigned to an agent.",
    area: "Mission Control",
    access: "write",
  },
  {
    name: "list_approvals",
    title: "List approval requests",
    description:
      "List Approval Centre requests awaiting the signed-in user's decision, including estimated cost and risk.",
    area: "Approvals",
    access: "read",
  },
  {
    name: "decide_approval",
    title: "Reject a request or direct the user to Approval Centre",
    description:
      "Reject a pending approval request. Approval must be confirmed in PalladiumAI's Approval Centre so spend limits, workflow resume and external-action execution gates cannot be bypassed.",
    area: "Approvals",
    access: "approval",
  },
  {
    name: "list_memories",
    title: "List personal memory",
    description:
      "List entries from the signed-in user's PalladiumAI personal memory vault (preferences and facts agents use).",
    area: "Memory",
    access: "read",
  },
  {
    name: "remember",
    title: "Save personal memory",
    description:
      "Save a preference or fact to the signed-in user's personal memory vault so agents can use it later.",
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
