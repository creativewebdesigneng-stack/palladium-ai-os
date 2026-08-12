/**
 * Public developer API authentication tests: key validity, revocation, expiry,
 * scopes, plan gating, quotas and organisation isolation.
 */
import { describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "@/lib/runtime/__tests__/fake-supabase";
import { sha256Hex } from "../keys.server";

const state: { db: any } = { db: createFakeSupabase() };

vi.mock("@/integrations/supabase/client.server", () => ({
  get supabaseAdmin() {
    return state.db;
  },
}));

const { authenticateApiRequest, ApiError } = await import("../api-auth.server");

const KEY = "pk_test_live_abcdef123456";

async function seed(overrides: Record<string, any> = {}, extra: Record<string, any[]> = {}) {
  state.db = createFakeSupabase({
    api_keys: [
      {
        id: "key-1",
        user_id: "user-1",
        org_id: null,
        name: "CI key",
        scopes: ["agents:read", "agents:run"],
        revoked_at: null,
        expires_at: null,
        environment: "live",
        key_hash: await sha256Hex(KEY),
        ...overrides,
      },
    ],
    subscriptions: [],
    api_request_logs: [],
    ...extra,
  });
}

function request(key = KEY) {
  return new Request("https://app.test/api/public/v1/agents", {
    headers: { authorization: `Bearer ${key}` },
  });
}

describe("api key authentication", () => {
  it("accepts a valid key and resolves the free plan by default", async () => {
    await seed();
    const ctx = await authenticateApiRequest(request(), { scope: "agents:read" });
    expect(ctx.userId).toBe("user-1");
    expect(ctx.planCode).toBe("explorer");
    expect(ctx.limits.requestsPerMinute).toBe(20);
  });

  it("rejects a request with no key", async () => {
    await seed();
    await expect(
      authenticateApiRequest(new Request("https://app.test/api/public/v1/agents"), {
        scope: "agents:read",
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects an unknown key", async () => {
    await seed();
    await expect(
      authenticateApiRequest(request("pk_not_a_real_key"), { scope: "agents:read" }),
    ).rejects.toThrow(/not recognised/);
  });

  it("rejects a revoked key", async () => {
    await seed({ revoked_at: new Date().toISOString() });
    await expect(authenticateApiRequest(request(), { scope: "agents:read" })).rejects.toThrow(
      /revoked/,
    );
  });

  it("rejects an expired key", async () => {
    await seed({ expires_at: new Date(Date.now() - 86_400_000).toISOString() });
    await expect(authenticateApiRequest(request(), { scope: "agents:read" })).rejects.toThrow(
      /expired/,
    );
  });

  it("rejects a key that lacks the required scope", async () => {
    await seed({ scopes: ["tasks:read"] });
    await expect(authenticateApiRequest(request(), { scope: "agents:read" })).rejects.toThrow(
      /missing the `agents:read` scope/,
    );
  });

  it("stores only the hash, never the presented key", async () => {
    await seed();
    const row = state.db.tables.api_keys[0];
    expect(row.key_hash).not.toContain(KEY);
    expect(row.key_hash).toHaveLength(64);
  });

  it("blocks execution endpoints on the free plan", async () => {
    await seed();
    await expect(
      authenticateApiRequest(request(), { scope: "agents:run", execution: true }),
    ).rejects.toThrow(/does not include the execution API/);
  });

  it("allows execution on a paid plan", async () => {
    await seed(
      {},
      {
        subscriptions: [
          {
            user_id: "user-1",
            org_id: null,
            plan_code: "builder",
            status: "active",
            updated_at: "2026-01-01",
          },
        ],
      },
    );
    const ctx = await authenticateApiRequest(request(), { scope: "agents:run", execution: true });
    expect(ctx.planCode).toBe("builder");
  });

  it("enforces the per-minute rate limit from real request logs", async () => {
    const now = new Date().toISOString();
    await seed(
      {},
      {
        api_request_logs: Array.from({ length: 20 }, (_, i) => ({
          id: `log-${i}`,
          user_id: "user-1",
          created_at: now,
          path: "/api/public/v1/agents",
        })),
      },
    );
    await expect(authenticateApiRequest(request(), { scope: "agents:read" })).rejects.toThrow(
      /Rate limit of 20 requests\/minute/,
    );
  });

  it("does not count another user's traffic against the caller", async () => {
    const now = new Date().toISOString();
    await seed(
      {},
      {
        api_request_logs: Array.from({ length: 50 }, (_, i) => ({
          id: `log-${i}`,
          user_id: "user-2",
          created_at: now,
          path: "/api/public/v1/agents",
        })),
      },
    );
    const ctx = await authenticateApiRequest(request(), { scope: "agents:read" });
    expect(ctx.userId).toBe("user-1");
  });

  it("scopes an organisation key to that organisation's subscription", async () => {
    await seed(
      { org_id: "org-1" },
      {
        subscriptions: [
          {
            user_id: "someone-else",
            org_id: "org-1",
            plan_code: "business",
            status: "active",
            updated_at: "2026-01-01",
          },
          {
            user_id: "user-1",
            org_id: null,
            plan_code: "explorer",
            status: "active",
            updated_at: "2026-02-01",
          },
        ],
      },
    );
    const ctx = await authenticateApiRequest(request(), { scope: "agents:read" });
    expect(ctx.orgId).toBe("org-1");
    expect(ctx.planCode).toBe("business");
  });
});
