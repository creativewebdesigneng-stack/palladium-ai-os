/**
 * Shopping spend-limit tests. Agents can never commit money: the ceilings here
 * are the authoritative gate used at approval time and again at checkout.
 */
import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/lib/runtime/__tests__/fake-supabase";
import { checkAgainstLimits, resolveSpendLimits, assertWithinLimits } from "../limits.server";

const USER = "user-1";
const AGENT = "agent-1";

const base = {
  currency: "GBP",
  perTransaction: null as number | null,
  userMonthlyCap: null as number | null,
  agentMonthlyCap: null as number | null,
  userMonthSpend: 0,
  agentMonthSpend: 0,
};

function db(seed: Record<string, any[]> = {}) {
  return createFakeSupabase({
    spend_limits: [],
    personal_agents: [],
    purchase_requests: [],
    approval_requests: [],
    ...seed,
  }) as any;
}

describe("spend limit checks", () => {
  it("allows a purchase when no limits are configured", () => {
    expect(checkAgainstLimits(999, { ...base }).ok).toBe(true);
  });

  it("blocks a purchase above the per-transaction ceiling", () => {
    const verdict = checkAgainstLimits(250, { ...base, perTransaction: 200 });
    expect(verdict.ok).toBe(false);
    expect(!verdict.ok && verdict.reason).toMatch(/per-transaction limit/);
  });

  it("blocks a purchase that would exceed the agent's monthly budget", () => {
    const verdict = checkAgainstLimits(60, {
      ...base,
      agentMonthlyCap: 100,
      agentMonthSpend: 50,
    });
    expect(verdict.ok).toBe(false);
    expect(!verdict.ok && verdict.reason).toMatch(/monthly budget/);
  });

  it("blocks a purchase that would exceed the account monthly cap", () => {
    const verdict = checkAgainstLimits(10, { ...base, userMonthlyCap: 100, userMonthSpend: 95 });
    expect(verdict.ok).toBe(false);
    expect(!verdict.ok && verdict.reason).toMatch(/monthly spend cap/);
  });

  it("allows spend that lands exactly on the cap", () => {
    expect(checkAgainstLimits(5, { ...base, userMonthlyCap: 100, userMonthSpend: 95 }).ok).toBe(
      true,
    );
  });
});

describe("resolving limits from the database", () => {
  it("uses the tightest configured per-transaction ceiling", async () => {
    const limits = await resolveSpendLimits(
      db({
        spend_limits: [
          { user_id: USER, agent_id: null, per_transaction_limit: 500, monthly_cap: 2000 },
          { user_id: USER, agent_id: AGENT, per_transaction_limit: 100, monthly_cap: 300 },
        ],
      }),
      USER,
      AGENT,
    );
    expect(limits.perTransaction).toBe(100);
    expect(limits.agentMonthlyCap).toBe(300);
    expect(limits.userMonthlyCap).toBe(2000);
  });

  it("counts only committed purchases towards the monthly spend", async () => {
    const now = new Date().toISOString();
    const limits = await resolveSpendLimits(
      db({
        purchase_requests: [
          { user_id: USER, total: 40, status: "approved", created_at: now },
          { user_id: USER, total: 100, status: "awaiting_approval", created_at: now },
          { user_id: USER, total: 10, status: "rejected", created_at: now },
        ],
      }),
      USER,
    );
    expect(limits.userMonthSpend).toBe(40);
  });

  it("throws with a human-readable reason when a purchase breaches a cap", async () => {
    const sb = db({
      spend_limits: [{ user_id: USER, agent_id: null, per_transaction_limit: 50 }],
    });
    await expect(assertWithinLimits(sb, USER, null, 120)).rejects.toThrow(
      /exceeds your per-transaction limit/,
    );
  });

  it("passes a purchase that sits inside every ceiling", async () => {
    const sb = db({
      spend_limits: [
        { user_id: USER, agent_id: null, per_transaction_limit: 500, monthly_cap: 1000 },
      ],
    });
    await expect(assertWithinLimits(sb, USER, null, 120)).resolves.toBeTruthy();
  });
});
