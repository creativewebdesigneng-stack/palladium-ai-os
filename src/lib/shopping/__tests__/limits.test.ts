/**
 * Shopping spend-limit tests. Agents can never commit money: the ceilings here
 * are the authoritative gate used at approval time and again at checkout.
 */
import { describe, expect, it, vi } from "vitest";
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
  it('requires the purchase currency to match its controls', () => {
    expect(checkAgainstLimits(5,{...base,perTransaction:100},'USD').ok).toBe(false);
    expect(checkAgainstLimits(5,{...base,perTransaction:100},'gbp').ok).toBe(true);
    expect(checkAgainstLimits(5,{...base,perTransaction:100},'').ok).toBe(false);
  });
  it.each([NaN,Infinity,-Infinity,-1])('rejects invalid purchase amount %s', total => {
    expect(checkAgainstLimits(total,{...base,perTransaction:100}).ok).toBe(false);
  });
  it.each(['perTransaction','userMonthlyCap','agentMonthlyCap','userMonthSpend','agentMonthSpend'] as const)(
    'rejects invalid persisted %s', field => {
      for (const value of [NaN,Infinity,-1]) expect(checkAgainstLimits(10,{...base,perTransaction:100,[field]:value}).ok).toBe(false);
    },
  );
  it("blocks monetary actions until at least one spend control is configured", () => {
    const verdict = checkAgainstLimits(999, { ...base });
    expect(verdict.ok).toBe(false);
    expect(!verdict.ok && verdict.reason).toMatch(/Set a spend limit/);
    expect(!verdict.ok && verdict.reason).toMatch(/search and comparison remain available/i);
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
  it('does not sum committed purchases across unconverted currencies', async () => {
    await expect(resolveSpendLimits(db({purchase_requests:[{user_id:USER,total:5,status:'approved',currency:'USD',created_at:new Date().toISOString()}]}),USER))
      .rejects.toThrow(/different currencies/);
  });
  it('does not compare agent and account ceilings across unconverted currencies', async () => {
    await expect(resolveSpendLimits(db({spend_limits:[{user_id:USER,currency:'GBP',monthly_cap:100}],
      personal_agents:[{id:AGENT,user_id:USER,budget_limit:100,currency:'USD'}]}),USER,AGENT))
      .rejects.toThrow(/different currencies/);
  });
  it('retains valid same-currency controls and committed history', async () => {
    const sb=db({spend_limits:[{user_id:USER,currency:'USD',monthly_cap:100}],purchase_requests:[
      {user_id:USER,total:20,status:'approved',currency:'USD',created_at:new Date().toISOString()}]});
    await expect(assertWithinLimits(sb,USER,null,5,'USD')).resolves.toMatchObject({currency:'USD',userMonthSpend:20});
  });
  it.each(['spend_limits','personal_agents','purchase_requests','approval_requests'])(
    'fails closed when %s cannot be read', async failedTable => {
      const sb = { from: vi.fn((table: string) => {
        const result = table === failedTable ? { data:null,error:{message:'private database detail'} }
          : { data:table === 'personal_agents' ? {id:AGENT,user_id:USER,budget_limit:100} : [],error:null };
        const q: any = { select:()=>q,eq:()=>q,gte:()=>q,maybeSingle:async()=>result,
          then:(resolve: (value: unknown)=>unknown)=>Promise.resolve(result).then(resolve) };
        return q;
      }) };
      await expect(assertWithinLimits(sb,USER,AGENT,5)).rejects.toThrow(/could not be verified/);
    },
  );
  it('does not treat an unavailable owned agent as having no budget restrictions', async () => {
    await expect(resolveSpendLimits(db(),USER,AGENT)).rejects.toThrow(/owned shopping agent/);
  });
  it("uses the tightest configured per-transaction ceiling", async () => {
    const limits = await resolveSpendLimits(
      db({
        personal_agents: [{ id: AGENT, user_id: USER }],
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

  it("fails closed when the account has no configured spend controls", async () => {
    await expect(assertWithinLimits(db(), USER, null, 25)).rejects.toThrow(/Set a spend limit/);
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
