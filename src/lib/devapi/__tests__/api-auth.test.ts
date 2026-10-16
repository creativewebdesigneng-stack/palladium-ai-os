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

const { authenticateApiRequest, ApiError, withApiAuth } = await import("../api-auth.server");

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
  it.each([[], null, "agents:read", ["tasks:read"]])("never grants access for missing or malformed scopes %j", async scopes => {
    await seed({scopes});
    await expect(authenticateApiRequest(request(), {scope:"agents:read"})).rejects.toMatchObject({status:403,code:"insufficient_scope"});
  });
  it("rejects malformed expiry evidence",async()=>{
    await seed({expires_at:"invalid"});
    await expect(authenticateApiRequest(request(),{scope:"agents:read"})).rejects.toMatchObject({code:"expired_api_key"});
  });
  it.each(["api_keys","subscriptions","api_request_logs"])("fails closed when %s is unavailable",async table=>{
    await seed();const from=state.db.from;
    state.db.from=(name:string)=>{
      if(name!==table)return from(name);
      const q:any=new Proxy({}, {get:(_,key)=>key==="then"?(resolve:any)=>Promise.resolve({data:null,count:null,error:{message:"Invalid API key"}}).then(resolve):()=>q});return q;
    };
    await expect(authenticateApiRequest(request(),{scope:"agents:read"})).rejects.toMatchObject({status:503,code:"api_backend_unavailable"});
  });
  it("does not execute a handler when quota reservation fails",async()=>{
    await seed();state.db.rpc=vi.fn(async()=>({error:{message:"unavailable"}}));
    const handler=vi.fn();const response=await withApiAuth({scope:"agents:read",path:"/agents"},handler)({request:request()});
    expect(response.status).toBe(503);expect(handler).not.toHaveBeenCalled();expect(state.db.tables.api_request_logs).toHaveLength(0);
  });
  it("honours the atomic quota decision after initial checks pass",async()=>{
    await seed();state.db.rpc=vi.fn(async()=>({data:{error:"rate_limit_exceeded"},error:null}));
    const handler=vi.fn();const response=await withApiAuth({scope:"agents:read",path:"/agents"},handler)({request:request()});
    expect(response.status).toBe(429);expect(handler).not.toHaveBeenCalled();
  });
  it("keeps a completed POST successful when completion telemetry fails",async()=>{
    await seed();state.db.rpc=vi.fn(async()=>({data:{id:"log-reserved"},error:null}));
    const from=state.db.from;state.db.from=(name:string)=>{
      const q=from(name);if(name==="api_request_logs")q.update=()=>{const failed:any={eq:()=>failed,then:(resolve:any)=>Promise.resolve({error:{message:"offline"}}).then(resolve)};return failed;};return q;
    };
    const handler=vi.fn(async()=>({done:true}));const post=new Request("https://app.test/api/public/v1/agents",{method:"POST",headers:{authorization:`Bearer ${KEY}`}});
    const response=await withApiAuth({scope:"agents:read",path:"/agents"},handler)({request:post});
    expect(response.status).toBe(201);expect(handler).toHaveBeenCalledTimes(1);
    expect(state.db.rpc.mock.calls[0][1]).toMatchObject({p_user_id:"user-1",p_key_id:"key-1",p_scope:"agents:read",p_execution:false});
  });
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
