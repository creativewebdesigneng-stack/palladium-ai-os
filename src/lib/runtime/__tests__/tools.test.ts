/** Tool permission and safety-gate tests. */
import { describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: createFakeSupabase() }));

import { executeTool, resolveGrantedTools } from "../tools.server";

const AGENT = { id: "agent-1", allowed_tools: ["web_search", "browser_task"] };

function sb(seed: Record<string, any[]> = {}) {
  return createFakeSupabase({
    tool_permissions: [],
    tools: [],
    tool_executions: [],
    ...seed,
  }) as any;
}

describe("tool grants", () => {
  it("grants nothing when the agent declares no tools", async () => {
    const { defs, grants } = await resolveGrantedTools(sb(), { id: "a", allowed_tools: [] });
    expect(defs).toHaveLength(0);
    expect(grants.size).toBe(0);
  });

  it("ignores unknown tool slugs the frontend may inject", async () => {
    const { grants } = await resolveGrantedTools(sb(), {
      id: "a",
      allowed_tools: ["web_search", "rm_-rf_prod"],
    });
    expect(grants.has("web_search")).toBe(true);
    expect(grants.has("rm_-rf_prod")).toBe(false);
  });

  it("withholds a tool whose minimum plan is above the caller's plan", async () => {
    const db = sb({
      tools: [{ slug: "browser_task", is_active: true, min_plan: "business", requires_approval: true }],
    });
    const explorer = await resolveGrantedTools(db, AGENT, "explorer");
    expect(explorer.grants.has("browser_task")).toBe(false);

    const business = await resolveGrantedTools(sb({
      tools: [{ slug: "browser_task", is_active: true, min_plan: "business", requires_approval: true }],
    }), AGENT, "business");
    expect(business.grants.has("browser_task")).toBe(true);
  });

  it("respects a disabled account-wide permission row", async () => {
    const db = sb({
      tool_permissions: [{ tool: "web_search", enabled: false, agent_id: null, allowed_domains: [] }],
    });
    const { grants } = await resolveGrantedTools(db, AGENT, "business");
    expect(grants.has("web_search")).toBe(false);
  });

  it("marks sensitive tools as requiring human approval", async () => {
    const { grants } = await resolveGrantedTools(sb(), { id: "a", allowed_tools: ["shopping_purchase"] }, "enterprise");
    if (grants.has("shopping_purchase")) {
      expect(grants.get("shopping_purchase")!.requiresApproval).toBe(true);
    }
  });
});

describe("tool execution guards", () => {
  const ctx = (db: any) => ({
    sb: db,
    userId: "user-1",
    orgId: null,
    agentId: "agent-1",
    taskId: "task-1",
    spendCap: null,
  }) as any;

  it("refuses a tool that was never granted, and logs the attempt", async () => {
    const db = sb();
    const result = await executeTool("web_search", { query: "x" }, ctx(db), new Map());
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.output)).toContain("not enabled");
    expect(db.tables["tool_executions"][0]).toMatchObject({ status: "failed", tool: "web_search" });
  });

  it("blocks a URL outside the agent's domain allow-list", async () => {
    const db = sb();
    const grants = new Map([
      [
        "browser_task",
        { slug: "browser_task", requiresApproval: false, allowedDomains: ["example.com"], spendCap: null },
      ],
    ]);
    const result = await executeTool(
      "browser_task",
      { url: "https://evil.test/checkout" },
      ctx(db),
      grants as any,
    );
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.output)).toContain("allow-list");
  });
});
