import { beforeEach, describe, expect, it, vi } from "vitest";

const listAgentExternalMcpCapabilities = vi.hoisted(() => vi.fn());
const findAgentExternalMcpCapability = vi.hoisted(() => vi.fn());

vi.mock("../agent-mcp-runtime.server", () => ({
  listAgentExternalMcpCapabilities,
  findAgentExternalMcpCapability,
}));

import {
  listAgentMcpIntegrationCapabilities,
  prepareAgentMcpIntegrationAction,
} from "../agent-mcp-integration-bridge.server";

beforeEach(() => {
  listAgentExternalMcpCapabilities.mockReset();
  findAgentExternalMcpCapability.mockReset();
});

describe("agent MCP integration bridge", () => {
  it("projects MCP tools into the provider-neutral integration capability shape", async () => {
    const sb = { from: vi.fn() };
    listAgentExternalMcpCapabilities.mockResolvedValue([
      {
        key: "external_mcp:server-1:orders_update",
        serverId: "server-1",
        serverName: "Store MCP",
        serverSlug: "store",
        toolName: "orders_update",
        displayName: "Store MCP: orders update",
        description: "Update an order",
        inputSchema: { type: "object", properties: { order_id: { type: "string" } } },
        approval: "confirm",
        mutates: true,
      },
    ]);

    const capabilities = await listAgentMcpIntegrationCapabilities({ sb, userId: "user-1" });

    expect(capabilities).toEqual([
      expect.objectContaining({
        provider: "mcp",
        action: "external_mcp:server-1:orders_update",
        transport: "external_mcp",
        lane: "connector_transport",
        risk: "high",
        requiresApproval: true,
      }),
    ]);
  });

  it("re-resolves the selected MCP capability and creates immutable approval details", async () => {
    const sb = { from: vi.fn() };
    findAgentExternalMcpCapability.mockResolvedValue({
      key: "external_mcp:server-1:orders_update",
      serverId: "server-1",
      serverName: "Store MCP",
      serverSlug: "store",
      toolName: "orders_update",
      displayName: "Store MCP: orders update",
      description: "Update an order",
      inputSchema: { type: "object" },
      approval: "confirm",
      mutates: true,
    });

    const prepared = await prepareAgentMcpIntegrationAction({
      sb,
      userId: "user-1",
      action: "external_mcp:server-1:orders_update",
      actionInput: { order_id: "123" },
    });

    expect(prepared.approvalDetails).toEqual({
      provider: "mcp",
      server_id: "server-1",
      tool_name: "orders_update",
      input: { order_id: "123" },
      transport: "external_mcp",
    });
    expect(findAgentExternalMcpCapability).toHaveBeenCalledWith({
      sb,
      userId: "user-1",
      serverId: "server-1",
      toolName: "orders_update",
    });
  });

  it("rejects fabricated MCP action identifiers before capability lookup", async () => {
    const sb = { from: vi.fn() };

    await expect(
      prepareAgentMcpIntegrationAction({
        sb,
        userId: "user-1",
        action: "external_mcp:missing-tool",
        actionInput: {},
      }),
    ).rejects.toThrow("identifier is invalid");

    expect(findAgentExternalMcpCapability).not.toHaveBeenCalled();
  });
});
