import { beforeEach, describe, expect, it, vi } from "vitest";

const executeAgentExternalMcpCapability = vi.hoisted(() => vi.fn());

vi.mock("../agent-mcp-runtime.server", () => ({
  executeAgentExternalMcpCapability,
}));

import { executeApprovedAgentMcpAction } from "../approved-agent-mcp-action.server";

beforeEach(() => {
  executeAgentExternalMcpCapability.mockReset();
  executeAgentExternalMcpCapability.mockResolvedValue({ content: [{ type: "text", text: "done" }] });
});

describe("approved external MCP execution", () => {
  it("re-resolves and executes the immutable approved server/tool with approval asserted", async () => {
    const sb = { from: vi.fn() };

    const result = await executeApprovedAgentMcpAction({
      sb,
      userId: "user-1",
      details: {
        server_id: "server-1",
        tool_name: "orders_update",
        input: { order_id: "123", status: "fulfilled" },
      },
    });

    expect(result).toEqual({
      ok: true,
      provider: "mcp",
      result: { mcp_result: { content: [{ type: "text", text: "done" }] } },
    });
    expect(executeAgentExternalMcpCapability).toHaveBeenCalledWith({
      sb,
      userId: "user-1",
      serverId: "server-1",
      toolName: "orders_update",
      input: { order_id: "123", status: "fulfilled" },
      approved: true,
    });
  });

  it("rejects malformed approval payloads before MCP dispatch", async () => {
    const sb = { from: vi.fn() };

    const result = await executeApprovedAgentMcpAction({
      sb,
      userId: "user-1",
      details: { server_id: "server-1", input: {} },
    });

    expect(result).toEqual({ ok: false, provider: "mcp", error: "Approved MCP tool is missing." });
    expect(executeAgentExternalMcpCapability).not.toHaveBeenCalled();
  });

  it("normalizes live MCP failures so approval execution can be finalized", async () => {
    const sb = { from: vi.fn() };
    executeAgentExternalMcpCapability.mockRejectedValue(new Error("MCP endpoint is offline"));

    const result = await executeApprovedAgentMcpAction({
      sb,
      userId: "user-1",
      details: { server_id: "server-1", tool_name: "orders_update", input: {} },
    });

    expect(result).toEqual({ ok: false, provider: "mcp", error: "MCP endpoint is offline" });
  });
});
