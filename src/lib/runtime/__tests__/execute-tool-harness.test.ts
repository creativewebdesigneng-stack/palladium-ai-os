import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

const integrationMocks = vi.hoisted(() => ({
  prepareIntegrationAction: vi.fn(),
  executeIntegrationAction: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: createFakeSupabase() }));
vi.mock("@/lib/integrations/agent-integration-runtime.server", () => ({
  normalizeIntegrationProvider: (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "",
  listIntegrationCapabilities: vi.fn(async () => []),
  prepareIntegrationAction: integrationMocks.prepareIntegrationAction,
  executeIntegrationAction: integrationMocks.executeIntegrationAction,
}));

import { executeTool, type ToolGrant } from "../tools.server";

function sb(seed: Record<string, any[]> = {}) {
  return createFakeSupabase({
    tool_permissions: [],
    tools: [],
    tool_executions: [],
    approval_requests: [],
    ...seed,
  }) as any;
}

function ctx(db: any) {
  return {
    sb: db,
    userId: "user-1",
    orgId: null,
    agentId: "agent-1",
    taskId: "task-1",
    spendCap: null,
  } as any;
}

function grants(...entries: Array<[string, Partial<ToolGrant>]>) {
  return new Map(entries.map(([slug, grant]) => [
    slug,
    {
      slug,
      requiresApproval: false,
      allowedDomains: [],
      spendCap: null,
      ...grant,
    },
  ])) as Map<string, ToolGrant>;
}

describe("executeTool harness enforcement", () => {
  beforeEach(() => {
    integrationMocks.prepareIntegrationAction.mockReset();
    integrationMocks.executeIntegrationAction.mockReset();
  });

  it("denies credential-bearing input before any tool side effect", async () => {
    const db = sb();
    const result = await executeTool(
      "email_draft",
      {
        to: "person@example.com",
        subject: "Blocked",
        body: "Do not queue this",
        provider: "google",
        metadata: { api_key: "model-controlled-secret" },
      },
      ctx(db),
      grants(["email_draft", { requiresApproval: true }]),
    );

    expect(result.ok).toBe(false);
    expect(result.output).toMatchObject({ policy_code: "credential_input_blocked" });
    expect(db.tables.approval_requests).toHaveLength(0);
    expect(db.tables.tool_executions).toHaveLength(1);
  });

  it("leaves ordinary safe reads unchanged", async () => {
    const db = sb();
    const result = await executeTool(
      "calculator",
      { expression: "20 + 22" },
      ctx(db),
      grants(["calculator", {}]),
    );

    expect(result).toEqual({ ok: true, output: { expression: "20 + 22", value: 42 } });
  });

  it("denies privileged sandbox requests before execution", async () => {
    const db = sb();
    const result = await executeTool(
      "code_exec",
      { expression: "1 + 1", sandbox_profile: "privileged" },
      ctx(db),
      grants(["code_exec", { requiresApproval: true }]),
    );

    expect(result.ok).toBe(false);
    expect(result.output).toMatchObject({ policy_code: "privileged_sandbox_blocked" });
  });

  it("enforces domain allow-lists at the execution choke point", async () => {
    const db = sb();
    const result = await executeTool(
      "web_fetch",
      { url: "https://evil.test/private" },
      ctx(db),
      grants(["web_fetch", { allowedDomains: ["example.com"] }]),
    );

    expect(result.ok).toBe(false);
    expect(result.output).toMatchObject({ policy_code: "domain_outside_allowlist" });
  });

  it("preserves integration_action self-queuing through the existing approval system", async () => {
    integrationMocks.prepareIntegrationAction.mockResolvedValue({
      provider: "shopify",
      action: "shopify_product_update",
      input: { product_id: "123", title: "Approved title" },
      transport: "nango",
      risk: "medium",
      requiresApproval: true,
    });
    const db = sb();
    const result = await executeTool(
      "integration_action",
      {
        provider: "shopify",
        action: "shopify_product_update",
        input: { product_id: "123", title: "Approved title" },
      },
      ctx(db),
      grants(["integration_action", {}]),
    );

    expect(result.ok).toBe(true);
    expect(integrationMocks.executeIntegrationAction).not.toHaveBeenCalled();
    expect(db.tables.approval_requests).toHaveLength(1);
    expect(db.tables.approval_requests[0]).toMatchObject({
      action_type: "nango_dynamic_action",
      status: "pending",
      details: {
        provider: "shopify",
        action: "shopify_product_update",
        input: { product_id: "123", title: "Approved title" },
        transport: "nango",
      },
    });
  });
});
