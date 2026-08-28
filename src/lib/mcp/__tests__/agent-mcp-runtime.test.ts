import { beforeEach, describe, expect, it, vi } from "vitest";

const listExternalMcpTools = vi.hoisted(() => vi.fn());
const callExternalMcpTool = vi.hoisted(() => vi.fn());

vi.mock("../external-mcp.server", () => ({
  listExternalMcpTools,
  callExternalMcpTool,
}));

import {
  executeAgentExternalMcpCapability,
  listAgentExternalMcpCapabilities,
} from "../agent-mcp-runtime.server";

function serversDb(rows: Array<Record<string, unknown>>) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data: rows, error: null })),
  };
  return { from: vi.fn(() => query) };
}

beforeEach(() => {
  listExternalMcpTools.mockReset();
  callExternalMcpTool.mockReset();
});

describe("agent external MCP capability adapter", () => {
  it("discovers enabled server tools as bounded approval-required agent capabilities", async () => {
    const sb = serversDb([
      { id: "server-1", name: "Store MCP", slug: "store", requires_approval: false },
    ]);
    listExternalMcpTools.mockResolvedValue({
      server: { id: "server-1", name: "Store MCP", slug: "store", requires_approval: false },
      tools: [
        {
          name: "orders_update",
          description: "Update an order",
          inputSchema: { type: "object", properties: { order_id: { type: "string" } } },
        },
      ],
    });

    const capabilities = await listAgentExternalMcpCapabilities({ sb, userId: "user-1" });

    expect(capabilities).toEqual([
      expect.objectContaining({
        key: "external_mcp:server-1:orders_update",
        serverId: "server-1",
        toolName: "orders_update",
        approval: "confirm",
        mutates: true,
      }),
    ]);
    expect(listExternalMcpTools).toHaveBeenCalledWith({
      sb,
      userId: "user-1",
      serverId: "server-1",
    });
  });

  it("isolates discovery failure on one MCP server from healthy servers", async () => {
    const sb = serversDb([
      { id: "bad", name: "Bad", slug: "bad", requires_approval: false },
      { id: "good", name: "Good", slug: "good", requires_approval: false },
    ]);
    listExternalMcpTools.mockImplementation(async ({ serverId }: { serverId: string }) => {
      if (serverId === "bad") throw new Error("offline");
      return {
        server: { id: "good", name: "Good", slug: "good", requires_approval: false },
        tools: [{ name: "search", description: "Search", inputSchema: { type: "object" } }],
      };
    });

    const capabilities = await listAgentExternalMcpCapabilities({ sb, userId: "user-1" });

    expect(capabilities).toHaveLength(1);
    expect(capabilities[0]?.serverId).toBe("good");
    expect(capabilities[0]?.approval).toBe("confirm");
  });

  it("rejects agent MCP execution before discovery when approval has not been granted", async () => {
    const sb = { from: vi.fn() };

    await expect(
      executeAgentExternalMcpCapability({
        sb,
        userId: "user-1",
        serverId: "server-1",
        toolName: "orders_update",
        input: { order_id: "123" },
        approved: false,
      }),
    ).rejects.toThrow("require explicit operator approval");

    expect(listExternalMcpTools).not.toHaveBeenCalled();
    expect(callExternalMcpTool).not.toHaveBeenCalled();
  });

  it("re-resolves the live tool before approved execution", async () => {
    const sb = { from: vi.fn() };
    listExternalMcpTools.mockResolvedValue({
      server: { id: "server-1", name: "Store MCP", slug: "store", requires_approval: false },
      tools: [{ name: "orders_update", description: "Update", inputSchema: { type: "object" } }],
    });
    callExternalMcpTool.mockResolvedValue({ ok: true });

    await executeAgentExternalMcpCapability({
      sb,
      userId: "user-1",
      serverId: "server-1",
      toolName: "orders_update",
      input: { order_id: "123" },
      approved: true,
    });

    expect(callExternalMcpTool).toHaveBeenCalledWith({
      sb,
      userId: "user-1",
      serverId: "server-1",
      toolName: "orders_update",
      input: { order_id: "123" },
      approved: true,
    });
  });
});
