import { beforeEach, describe, expect, it, vi } from "vitest";

const executeIntegrationAction = vi.hoisted(() => vi.fn());

vi.mock("../agent-integration-runtime.server", () => ({
  executeIntegrationAction,
  normalizeIntegrationProvider: (value: unknown) =>
    typeof value === "string" ? value.trim().toLowerCase().replace(/^nango_/, "") : "",
}));

import { executeApprovedIntegrationAction } from "../approved-integration-action.server";

beforeEach(() => {
  executeIntegrationAction.mockReset();
  executeIntegrationAction.mockResolvedValue({
    ok: true,
    provider: "shopify",
    transport: "nango",
    lane: "connector_transport",
    result: { done: true },
    attempts: [],
  });
});

describe("approved dynamic integration execution", () => {
  it("forwards the transport recorded before approval", async () => {
    await executeApprovedIntegrationAction("user-1", {
      provider: "nango_shopify",
      action: "order_update",
      input: { order_id: "123" },
      transport: "nango",
    });

    expect(executeIntegrationAction).toHaveBeenCalledWith({
      userId: "user-1",
      provider: "shopify",
      action: "order_update",
      actionInput: { order_id: "123" },
      transport: "nango",
    });
  });

  it("keeps legacy approvals executable through normal routing", async () => {
    await executeApprovedIntegrationAction("user-1", {
      provider: "shopify",
      action: "orders_list",
      input: {},
    });

    expect(executeIntegrationAction).toHaveBeenCalledWith({
      userId: "user-1",
      provider: "shopify",
      action: "orders_list",
      actionInput: {},
    });
  });

  it("rejects malformed immutable approval payloads before dispatch", async () => {
    const result = await executeApprovedIntegrationAction("user-1", {
      provider: "shopify",
      input: {},
      transport: "nango",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("action is missing");
    expect(executeIntegrationAction).not.toHaveBeenCalled();
  });
});
