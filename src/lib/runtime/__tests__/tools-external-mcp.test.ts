import { beforeEach, describe, expect, it, vi } from "vitest";

const integrationRuntime = vi.hoisted(() => ({
  listIntegrationCapabilities: vi.fn(),
  prepareIntegrationAction: vi.fn(),
  executeIntegrationAction: vi.fn(),
  normalizeIntegrationProvider: vi.fn((value: unknown) =>
    typeof value === "string" ? value.trim().toLowerCase().replace(/^nango_/, "") : "",
  ),
}));

const mcpBridge = vi.hoisted(() => ({
  listAgentMcpIntegrationCapabilities: vi.fn(),
  prepareAgentMcpIntegrationAction: vi.fn(),
}));

vi.mock("@/lib/integrations/agent-integration-runtime.server", () => integrationRuntime);
vi.mock("@/lib/mcp/agent-mcp-integration-bridge.server", () => mcpBridge);
vi.mock("@/lib/memory/memory.server", () => ({ searchMemory: vi.fn(), storeMemory: vi.fn() }));
vi.mock("@/lib/integrations/connected-service.server", () => ({
  readConnectedService: vi.fn(),
  CONNECTED_SERVICE_ACTIONS: {},
}));
vi.mock("../github-write-tool.server", () => ({
  GITHUB_WRITE_TOOL_DEF: {
    name: "github_write",
    description: "GitHub write",
    parameters: { type: "object", properties: {}, required: [] },
  },
  runGitHubWriteTool: vi.fn(),
}));
vi.mock("@/lib/mission/browser-agent", () => ({
  createBrowserTool: vi.fn(),
  isDomainAllowed: vi.fn(() => true),
  resolveBrowserProvider: vi.fn(),
}));

import { executeTool, type ToolGrant } from "../tools.server";

function grant(slug: string): Map<string, ToolGrant> {
  return new Map([
    [slug, { slug, requiresApproval: false, allowedDomains: [], spendCap: null }],
  ]);
}

function fakeSb() {
  const approvalRows: Record<string, unknown>[] = [];
  const executionRows: Record<string, unknown>[] = [];

  return {
    approvalRows,
    executionRows,
    from(table: string) {
      const chain: any = {
        insert(row: Record<string, unknown>) {
          if (table === "approval_requests") approvalRows.push(row);
          if (table === "tool_executions") executionRows.push(row);
          return chain;
        },
        select() {
          return chain;
        },
        maybeSingle() {
          return Promise.resolve({ data: { id: "approval-mcp-1" }, error: null });
        },
      };
      return chain;
    },
  };
}

function context(sb: ReturnType<typeof fakeSb>, allowedProviders?: string[]) {
  return {
    userId: "user-1",
    orgId: "org-1",
    agentId: "agent-1",
    taskId: "task-1",
    sb,
    ...(allowedProviders ? { allowedProviders } : {}),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  integrationRuntime.listIntegrationCapabilities.mockResolvedValue([]);
  integrationRuntime.executeIntegrationAction.mockResolvedValue({
    ok: true,
    provider: "slack",
    result: { ok: true },
    attempts: [],
  });
  mcpBridge.listAgentMcpIntegrationCapabilities.mockResolvedValue([]);
});

describe("agent tool registry external MCP wiring", () => {
  it("discovers MCP tools through the authenticated request-scoped bridge", async () => {
    const sb = fakeSb();
    mcpBridge.listAgentMcpIntegrationCapabilities.mockResolvedValue([
      {
        provider: "mcp",
        action: "external_mcp:server-1:orders_update",
        description: "Update an order",
        risk: "high",
        requiresApproval: true,
        deployed: true,
        inputSchema: { type: "object" },
        transport: "external_mcp",
        lane: "connector_transport",
      },
    ]);

    const result = await executeTool(
      "integration_capabilities",
      { provider: "mcp" },
      context(sb, ["mcp"]),
      grant("integration_capabilities"),
    );

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({ count: 1, autonomous: 0, approvalRequired: 1 });
    expect(mcpBridge.listAgentMcpIntegrationCapabilities).toHaveBeenCalledWith({
      sb,
      userId: "user-1",
    });
    expect(integrationRuntime.listIntegrationCapabilities).not.toHaveBeenCalled();
  });

  it("queues the immutable MCP server/tool/input for explicit approval", async () => {
    const sb = fakeSb();
    mcpBridge.prepareAgentMcpIntegrationAction.mockResolvedValue({
      provider: "mcp",
      action: "external_mcp:server-1:orders_update",
      description: "Update an order",
      risk: "high",
      requiresApproval: true,
      deployed: true,
      inputSchema: { type: "object" },
      transport: "external_mcp",
      lane: "connector_transport",
      input: { order_id: "123", status: "fulfilled" },
      serverId: "server-1",
      toolName: "orders_update",
      approvalDetails: {
        provider: "mcp",
        server_id: "server-1",
        tool_name: "orders_update",
        input: { order_id: "123", status: "fulfilled" },
        transport: "external_mcp",
      },
    });

    const result = await executeTool(
      "integration_action",
      {
        provider: "mcp",
        action: "external_mcp:server-1:orders_update",
        input: { order_id: "123", status: "fulfilled" },
      },
      context(sb, ["mcp"]),
      grant("integration_action"),
    );

    expect(result).toEqual({
      ok: true,
      output: expect.objectContaining({
        queued: true,
        approval_request_id: "approval-mcp-1",
        provider: "mcp",
        risk: "high",
      }),
    });
    expect(mcpBridge.prepareAgentMcpIntegrationAction).toHaveBeenCalledWith({
      sb,
      userId: "user-1",
      action: "external_mcp:server-1:orders_update",
      actionInput: { order_id: "123", status: "fulfilled" },
    });
    expect(sb.approvalRows).toEqual([
      expect.objectContaining({
        user_id: "user-1",
        org_id: "org-1",
        agent_id: "agent-1",
        task_id: "task-1",
        action_type: "external_mcp_action",
        risk_level: "high",
        status: "pending",
        details: {
          provider: "mcp",
          server_id: "server-1",
          tool_name: "orders_update",
          input: { order_id: "123", status: "fulfilled" },
          transport: "external_mcp",
        },
      }),
    ]);
    expect(integrationRuntime.prepareIntegrationAction).not.toHaveBeenCalled();
    expect(integrationRuntime.executeIntegrationAction).not.toHaveBeenCalled();
  });

  it("blocks MCP before discovery or execution when the provider is not assigned to the agent", async () => {
    const sb = fakeSb();

    const result = await executeTool(
      "integration_action",
      { provider: "mcp", action: "external_mcp:server-1:orders_update", input: {} },
      context(sb, ["github"]),
      grant("integration_action"),
    );

    expect(result.ok).toBe(false);
    expect(result.output).toEqual({ error: 'Provider "mcp" is not assigned to this agent.' });
    expect(mcpBridge.prepareAgentMcpIntegrationAction).not.toHaveBeenCalled();
    expect(sb.approvalRows).toHaveLength(0);
  });

  it("leaves the existing provider-neutral execution path unchanged for non-MCP providers", async () => {
    const sb = fakeSb();
    integrationRuntime.prepareIntegrationAction.mockResolvedValue({
      provider: "slack",
      action: "channels_list",
      description: "List channels",
      risk: "low",
      requiresApproval: false,
      input: {},
      transport: "nango",
      lane: "connector_transport",
    });

    const result = await executeTool(
      "integration_action",
      { provider: "slack", action: "channels_list", input: {} },
      context(sb, ["slack"]),
      grant("integration_action"),
    );

    expect(result.ok).toBe(true);
    expect(integrationRuntime.prepareIntegrationAction).toHaveBeenCalled();
    expect(integrationRuntime.executeIntegrationAction).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "slack", action: "channels_list", transport: "nango" }),
    );
    expect(mcpBridge.prepareAgentMcpIntegrationAction).not.toHaveBeenCalled();
  });
});
