import { describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: createFakeSupabase() }));

import { executeTool, resolveGrantedTools } from "../tools.server";

function sb(seed: Record<string, any[]> = {}) {
  return createFakeSupabase({
    tool_permissions: [],
    tools: [],
    tool_executions: [],
    approval_requests: [],
    ...seed,
  }) as any;
}

const ctx = (db: any) => ({
  sb: db,
  userId: "user-1",
  orgId: null,
  agentId: "agent-1",
  taskId: "task-1",
  spendCap: null,
}) as any;

describe("agent connected-service contract", () => {
  it("exposes explicit GitHub repository, path and ref inputs to the model", async () => {
    const { defs } = await resolveGrantedTools(
      sb(),
      { id: "agent-1", allowed_tools: ["connected_service"] },
      "enterprise",
    );
    const def = defs.find((tool) => tool.name === "connected_service");
    const properties = (def?.parameters as any)?.properties ?? {};
    expect(properties.repository).toBeTruthy();
    expect(properties.path).toBeTruthy();
    expect(properties.ref).toBeTruthy();
  });

  it("upgrades existing connected-service agents with dynamic Nango capabilities", async () => {
    const { defs, grants } = await resolveGrantedTools(
      sb(),
      { id: "agent-1", allowed_tools: ["connected_service"] },
      "enterprise",
    );
    expect(defs.map((tool) => tool.name)).toEqual(
      expect.arrayContaining(["connected_service", "nango_capabilities", "nango_action"]),
    );
    expect(grants.get("nango_capabilities")?.requiresApproval).toBe(false);
  });

  it("lets dynamic Nango actions self-classify reads while writes remain approval-gated", async () => {
    const { grants } = await resolveGrantedTools(
      sb(),
      {
        id: "agent-1",
        allowed_tools: ["connected_service"],
        requires_approval: true,
      },
      "enterprise",
    );
    expect(grants.get("connected_service")?.requiresApproval).toBe(false);
    expect(grants.get("nango_capabilities")?.requiresApproval).toBe(false);
    expect(grants.get("nango_action")?.requiresApproval).toBe(false);
  });

  it("exposes separate approval-gated draft and send tools", async () => {
    const { defs, grants } = await resolveGrantedTools(
      sb(),
      { id: "agent-1", allowed_tools: ["email_draft", "email_send"] },
      "enterprise",
    );
    expect(defs.map((tool) => tool.name).sort()).toEqual(["email_draft", "email_send"]);
    expect(grants.get("email_draft")?.requiresApproval).toBe(true);
    expect(grants.get("email_send")?.requiresApproval).toBe(true);
  });

  it("queues email_draft with an immutable draft action instead of delivery", async () => {
    const db = sb();
    const grants = new Map([
      ["email_draft", { slug: "email_draft", requiresApproval: true, allowedDomains: [], spendCap: null }],
    ]);
    const result = await executeTool(
      "email_draft",
      { to: "person@example.com", subject: "Draft subject", body: "Draft body", provider: "google" },
      ctx(db),
      grants as any,
    );
    expect(result.ok).toBe(true);
    expect(db.tables.approval_requests[0]).toMatchObject({
      action_type: "email_draft",
      status: "pending",
      details: { provider: "google", to: "person@example.com" },
    });
  });

  it("queues email_send as delivery after approval and labels it accordingly", async () => {
    const db = sb();
    const grants = new Map([
      ["email_send", { slug: "email_send", requiresApproval: true, allowedDomains: [], spendCap: null }],
    ]);
    const result = await executeTool(
      "email_send",
      { to: "person@example.com", subject: "Send subject", body: "Send body", provider: "microsoft" },
      ctx(db),
      grants as any,
    );
    expect(result.ok).toBe(true);
    expect(db.tables.approval_requests[0]).toMatchObject({
      action_type: "email_send",
      title: "Send email: Send subject",
      status: "pending",
      details: { provider: "microsoft", to: "person@example.com" },
    });
  });
});
