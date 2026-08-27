import { describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: createFakeSupabase() }));

import { executeTool, resolveGrantedTools } from "../tools.server";

function db() {
  return createFakeSupabase({
    tool_permissions: [],
    tools: [],
    tool_executions: [],
    approval_requests: [],
  }) as any;
}

const ctx = (sb: any) => ({
  sb,
  userId: "user-1",
  orgId: null,
  agentId: "agent-1",
  taskId: "task-1",
  spendCap: null,
}) as any;

describe("browser task runtime contract", () => {
  it("exposes browser_task as a first-class runtime tool", async () => {
    const { defs, grants } = await resolveGrantedTools(
      db(),
      { id: "agent-1", allowed_tools: ["browser_task"] },
      "enterprise",
    );

    const def = defs.find((tool) => tool.name === "browser_task");
    expect(def).toBeTruthy();
    expect((def?.parameters as any)?.properties?.steps?.items?.properties?.action?.enum).toEqual(
      expect.arrayContaining(["navigate", "click", "extract", "validate"]),
    );
    expect(grants.get("browser_task")?.requiresApproval).toBe(false);
  });

  it("runs a bounded browser task through executeTool with the normal audit boundary", async () => {
    const sb = db();
    const grants = new Map([
      [
        "browser_task",
        {
          slug: "browser_task",
          requiresApproval: false,
          allowedDomains: ["example.com"],
          spendCap: null,
        },
      ],
    ]);

    const result = await executeTool(
      "browser_task",
      {
        url: "https://example.com",
        max_steps: 2,
        steps: [{ action: "read" }, { action: "validate", expected_text: "simulated" }],
      },
      ctx(sb),
      grants as any,
    );

    expect(result.ok).toBe(true);
    expect(result.output).toMatchObject({
      simulated: true,
      result: { ok: true, completed_steps: 2 },
    });
    expect(sb.tables.tool_executions).toHaveLength(1);
    expect(sb.tables.tool_executions[0]).toMatchObject({ tool: "browser_task", status: "succeeded" });
  });

  it("denies a browser task starting outside the resolved domain allow-list before provider work", async () => {
    const sb = db();
    const grants = new Map([
      [
        "browser_task",
        {
          slug: "browser_task",
          requiresApproval: false,
          allowedDomains: ["example.com"],
          spendCap: null,
        },
      ],
    ]);

    const result = await executeTool(
      "browser_task",
      { url: "https://blocked.test", steps: [{ action: "read" }] },
      ctx(sb),
      grants as any,
    );

    expect(result.ok).toBe(false);
    expect(result.output).toMatchObject({ policy_code: "domain_outside_allowlist" });
  });
});
