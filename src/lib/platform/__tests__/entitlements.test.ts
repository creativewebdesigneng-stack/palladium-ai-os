/**
 * Entitlement engine tests. The browser is never trusted for plan, usage or
 * organisation scope, so these cover exactly those boundaries.
 */
import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/lib/runtime/__tests__/fake-supabase";
import {
  assertWithinLimit,
  EntitlementError,
  getEntitlements,
  UNLIMITED,
} from "../entitlements.server";

const USER = "user-1";
const OTHER_ORG = "org-attacker-target";

const PLANS = [
  {
    code: "explorer",
    name: "Explorer",
    limits: { agents: 3, tasks_per_month: 200, seats: 1, storage_mb: 200 },
    features: [],
  },
  {
    code: "business",
    name: "Business",
    limits: { agents: UNLIMITED, tasks_per_month: 50_000, seats: 25, storage_mb: 100_000 },
    features: ["workforces"],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    limits: { agents: UNLIMITED, tasks_per_month: UNLIMITED, seats: UNLIMITED, storage_mb: UNLIMITED },
    features: ["orchestrator", "advanced_models"],
  },
];

function db(seed: Record<string, any[]> = {}) {
  return createFakeSupabase({
    plans: PLANS,
    subscriptions: [],
    organisation_members: [],
    personal_agents: [],
    agent_tasks: [],
    ...seed,
  }) as any;
}

function adminDb(seed: Record<string, any[]> = {}) {
  const fake = db(seed);
  fake.rpc = async (fn: string, args?: Record<string, unknown>) => ({
    data: fn === "has_role" && args?._user_id === USER && args?._role === "admin",
    error: null,
  });
  return fake;
}

describe("entitlements", () => {
  it("falls back to the free plan when there is no subscription", async () => {
    const ent = await getEntitlements(db(), USER);
    expect(ent.planCode).toBe("explorer");
    expect(ent.limits.agents).toBe(3);
    expect(ent.isPlatformAdmin).toBe(false);
  });

  it("reads the plan from the subscriptions table, not from the client", async () => {
    const ent = await getEntitlements(
      db({
        subscriptions: [
          {
            user_id: USER,
            org_id: null,
            plan_code: "business",
            status: "active",
            updated_at: "2026-01-01",
          },
        ],
      }),
      USER,
    );
    expect(ent.planCode).toBe("business");
    expect(ent.planName).toBe("Business");
  });

  it("ignores another user's subscription row", async () => {
    const ent = await getEntitlements(
      db({
        subscriptions: [
          {
            user_id: "user-2",
            org_id: null,
            plan_code: "enterprise",
            status: "active",
            updated_at: "2026-01-01",
          },
        ],
      }),
      USER,
    );
    expect(ent.planCode).toBe("explorer");
  });

  it("refuses an organisation id the caller does not belong to", async () => {
    await expect(getEntitlements(db(), USER, OTHER_ORG)).rejects.toBeInstanceOf(EntitlementError);
  });

  it("still enforces organisation membership for a platform admin", async () => {
    await expect(getEntitlements(adminDb(), USER, OTHER_ORG)).rejects.toBeInstanceOf(
      EntitlementError,
    );
  });

  it("counts usage in the caller's own organisation once membership is proven", async () => {
    const ent = await getEntitlements(
      db({
        organisation_members: [{ org_id: OTHER_ORG, user_id: USER }],
        personal_agents: [
          { id: "a1", org_id_fk: OTHER_ORG },
          { id: "a2", org_id_fk: OTHER_ORG },
        ],
      }),
      USER,
      OTHER_ORG,
    );
    expect(ent.usage.agents).toBe(2);
  });

  it("blocks an action once the plan allowance is exhausted", async () => {
    const ent = await getEntitlements(
      db({
        personal_agents: [
          { id: "a1", user_id: USER },
          { id: "a2", user_id: USER },
          { id: "a3", user_id: USER },
        ],
      }),
      USER,
    );
    expect(() => assertWithinLimit(ent, "agents")).toThrow(/Explorer plan allows 3/);
  });

  it("allows unlimited metrics through", async () => {
    const ent = await getEntitlements(
      db({
        subscriptions: [
          {
            user_id: USER,
            org_id: null,
            plan_code: "business",
            status: "active",
            updated_at: "2026-01-01",
          },
        ],
        personal_agents: Array.from({ length: 40 }, (_, i) => ({ id: `a${i}`, user_id: USER })),
      }),
      USER,
    );
    expect(() => assertWithinLimit(ent, "agents")).not.toThrow();
  });

  it("grants platform admins all configured features and unlimited limits without a subscription", async () => {
    const ent = await getEntitlements(
      adminDb({
        personal_agents: Array.from({ length: 25 }, (_, i) => ({ id: `a${i}`, user_id: USER })),
      }),
      USER,
    );

    expect(ent.isPlatformAdmin).toBe(true);
    expect(ent.planName).toBe("Platform Admin");
    expect(ent.status).toBe("internal");
    expect(ent.currentPeriodEnd).toBeNull();
    expect(ent.limits).toEqual({
      agents: UNLIMITED,
      tasks_per_month: UNLIMITED,
      seats: UNLIMITED,
      storage_mb: UNLIMITED,
    });
    expect(ent.features).toEqual(expect.arrayContaining(["workforces", "orchestrator", "advanced_models"]));
    expect(() => assertWithinLimit(ent, "agents")).not.toThrow();
  });

  it("does not grant the platform-admin override when has_role is false", async () => {
    const ent = await getEntitlements(db(), USER);
    expect(ent.isPlatformAdmin).toBe(false);
    expect(ent.planName).not.toBe("Platform Admin");
    expect(ent.limits.agents).toBe(3);
  });
});
