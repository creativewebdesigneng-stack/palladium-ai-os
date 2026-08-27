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

    await executeApprovedAgentMcpAction({
      sb,
      userId: "user-1",
      details: {
        server_id: "server-1",
        tool_name: "orders_update",
        input: { order_id: "123", status: "fulfilled" },
      },
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

    await expect(
      executeApprovedAgentMcpAction({
        sb,
        userId: "user-1",
        details: { server_id: "server-1", input: {} },
      }),
    ).rejects.toThrow("Approved MCP tool is missing.");

    expect(executeAgentExternalMcpCapability).not.toHaveBeenCalled();
  });
});
