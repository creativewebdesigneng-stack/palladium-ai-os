import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IntegrationAdapter } from "../integration-adapters.server";

const state = vi.hoisted(() => ({ adapters: [] as IntegrationAdapter[] }));

vi.mock("../integration-adapters.server", async () => {
  return {
    integrationAdapters: () => state.adapters,
    integrationAdapterById: (id: string) => state.adapters.find((adapter) => adapter.id === id),
  };
});

import {
  executeIntegrationAction,
  listIntegrationCapabilities,
  normalizeIntegrationProvider,
  prepareIntegrationAction,
} from "../agent-integration-runtime.server";

function adapter(input: {
  id: "direct_oauth" | "nango";
  lane: "direct_api" | "connector_transport";
  available?: boolean;
  risk?: "low" | "medium" | "high";
  requiresApproval?: boolean;
  execute?: IntegrationAdapter["execute"];
}): IntegrationAdapter {
  return {
    id: input.id,
    lane: input.lane,
    supportsProvider: () => true,
    async listCapabilities(_userId, provider) {
      return [
        {
          provider: provider ?? "shopify",
          action: "orders_list",
          description: `${input.id} orders`,
          risk: input.risk ?? "low",
          requiresApproval: input.requiresApproval ?? false,
          deployed: true,
          inputSchema: { type: "object" },
        },
      ];
    },
    async isAvailable() {
      return input.available ?? true;
    },
    async prepare({ provider, action, actionInput }) {
      return {
        provider,
        action,
        description: `${input.id} prepared`,
        risk: input.risk ?? "low",
        requiresApproval: input.requiresApproval ?? false,
        input: actionInput,
      };
    },
    execute:
      input.execute ??
      (async () => ({ ok: true as const, result: { through: input.id } })),
  };
}

beforeEach(() => {
  state.adapters = [];
});

describe("provider-neutral agent integration runtime", () => {
  it("normalizes legacy Nango-prefixed product provider IDs", () => {
    expect(normalizeIntegrationProvider(" NANGO_Shopify ")).toBe("shopify");
  });

  it("prefers a genuinely available direct API over connector transport", async () => {
    state.adapters = [
      adapter({ id: "direct_oauth", lane: "direct_api" }),
      adapter({ id: "nango", lane: "connector_transport" }),
    ];
    const prepared = await prepareIntegrationAction({
      userId: "u1",
      provider: "shopify",
      action: "orders_list",
      actionInput: {},
    });
    expect(prepared.transport).toBe("direct_oauth");
    expect(prepared.lane).toBe("direct_api");
  });

  it("advertises a logical action only once and prefers its direct implementation", async () => {
    state.adapters = [
      adapter({ id: "direct_oauth", lane: "direct_api" }),
      adapter({ id: "nango", lane: "connector_transport" }),
    ];
    const capabilities = await listIntegrationCapabilities("u1", "shopify");
    expect(capabilities).toHaveLength(1);
    expect(capabilities[0]?.transport).toBe("direct_oauth");
  });

  it("falls back to Nango when a safe direct read failure occurs", async () => {
    state.adapters = [
      adapter({
        id: "direct_oauth",
        lane: "direct_api",
        execute: async () => ({
          ok: false,
          error: "native API unavailable",
          failurePhase: "post_dispatch",
          safeToFailover: true,
        }),
      }),
      adapter({ id: "nango", lane: "connector_transport" }),
    ];
    const result = await executeIntegrationAction({
      userId: "u1",
      provider: "shopify",
      action: "orders_list",
      actionInput: {},
    });
    expect(result.ok).toBe(true);
    expect(result.transport).toBe("nango");
    expect(result.attempts.map((attempt) => attempt.transport)).toEqual(["direct_oauth", "nango"]);
  });

  it("does not replay an ambiguous action through another transport", async () => {
    state.adapters = [
      adapter({
        id: "direct_oauth",
        lane: "direct_api",
        execute: async () => ({
          ok: false,
          error: "connection dropped after dispatch",
          failurePhase: "ambiguous",
          safeToFailover: false,
        }),
      }),
      adapter({ id: "nango", lane: "connector_transport" }),
    ];
    const result = await executeIntegrationAction({
      userId: "u1",
      provider: "shopify",
      action: "order_update",
      actionInput: {},
    });
    expect(result.ok).toBe(false);
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0]?.transport).toBe("direct_oauth");
  });

  it("pins approved/replayed execution to the recorded transport", async () => {
    state.adapters = [
      adapter({ id: "direct_oauth", lane: "direct_api" }),
      adapter({ id: "nango", lane: "connector_transport" }),
    ];
    const result = await executeIntegrationAction({
      userId: "u1",
      provider: "shopify",
      action: "orders_list",
      actionInput: {},
      transport: "nango",
    });
    expect(result.ok).toBe(true);
    expect(result.transport).toBe("nango");
    expect(result.attempts).toHaveLength(1);
  });

  it("keeps adapter risk and approval classification authoritative", async () => {
    state.adapters = [
      adapter({
        id: "nango",
        lane: "connector_transport",
        risk: "high",
        requiresApproval: true,
      }),
    ];
    const prepared = await prepareIntegrationAction({
      userId: "u1",
      provider: "shopify",
      action: "refund_create",
      actionInput: {},
    });
    expect(prepared.risk).toBe("high");
    expect(prepared.requiresApproval).toBe(true);
  });

  it("returns a clean unavailable result for a provider with no live lane", async () => {
    state.adapters = [adapter({ id: "nango", lane: "connector_transport", available: false })];
    const result = await executeIntegrationAction({
      userId: "u1",
      provider: "etsy",
      action: "orders_list",
      actionInput: {},
    });
    expect(result.ok).toBe(false);
    expect(result.attempts).toEqual([]);
    expect(result.error).toContain("does not have a live execution lane");
  });
});
