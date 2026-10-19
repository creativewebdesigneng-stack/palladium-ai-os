import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

const integrationMocks = vi.hoisted(() => ({
  prepareIntegrationAction: vi.fn(),
  executeIntegrationAction: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: createFakeSupabase() }));
const connectedMocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/integrations/connected-service.server", () => ({
  CONNECTED_SERVICE_ACTIONS: { google: ["calendar_upcoming"], microsoft: ["calendar_upcoming"] },
  readConnectedService: connectedMocks.read,
}));
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
    connectedMocks.read.mockReset();
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

  it("blocks input beyond inspection bounds before provider preparation or approval", async () => {
    let nested: Record<string,unknown> = { api_key: "deep-secret" };
    for(let i=0;i<10;i++) nested={child:nested};
    const db=sb();
    const result=await executeTool("integration_action",{provider:"shopify",input:nested},ctx(db),grants(["integration_action",{}]));
    expect(result.output).toMatchObject({policy_code:"input_inspection_limit"});
    expect(integrationMocks.prepareIntegrationAction).not.toHaveBeenCalled();
    expect(integrationMocks.executeIntegrationAction).not.toHaveBeenCalled();
    expect(db.tables.approval_requests).toHaveLength(0);
    expect(JSON.stringify(db.tables.tool_executions)).not.toContain("deep-secret");
  });

  it.each(["web_fetch", "html_studio"])("blocks credential-bearing URLs without persisting them in %s execution logs",async tool=>{
    const db=sb();
    const result=await executeTool(tool,{url:"https://user:private-secret@example.com/path"},ctx(db),grants([tool,{allowedDomains:["example.com"]}]));
    expect(result.output).toMatchObject({policy_code:"invalid_domain_scope"});
    expect(db.tables.approval_requests).toHaveLength(0);
    expect(db.tables.tool_executions).toHaveLength(1);
    expect(db.tables.tool_executions[0].input).toEqual({redacted:true});
    expect(JSON.stringify(db.tables.tool_executions)).not.toContain("private-secret");
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

  it.each(["connected_service", "integration_capabilities", "nango_capabilities"])(
    "%s blocks unassigned provider before connector access or approval",
    async tool => {
      const db = sb();
      const result = await executeTool(
        tool, tool === "connected_service"
          ? { provider: "microsoft", action: "calendar_upcoming" }
          : { provider: "microsoft" },
        { ...ctx(db), allowedProviders: ["google"] },
        grants([tool, { requiresApproval: true }]),
      );
      expect(result.ok).toBe(false);
      expect(result.output).toMatchObject({ error: expect.stringContaining("not assigned") });
      expect(db.tables.approval_requests).toHaveLength(0);
      expect(connectedMocks.read).not.toHaveBeenCalled();
    },
  );

  it("uses only the authenticated user's assigned provider for a granted read-only connector", async () => {
    const db = sb();
    connectedMocks.read.mockResolvedValue({ items: [{ id: "owned-calendar-item" }] });
    const output = await executeTool(
      "connected_service",
      { provider: "google", action: "calendar_upcoming", limit: 4 },
      { ...ctx(db), allowedProviders: ["google"] },
      grants(["connected_service", { requiresApproval: false }]),
    );
    expect(output).toMatchObject({ ok: true, output: { items: [{ id: "owned-calendar-item" }] } });
    expect(connectedMocks.read).toHaveBeenCalledTimes(1);
    expect(connectedMocks.read).toHaveBeenCalledWith("user-1", expect.objectContaining({
      provider: "google", action: "calendar_upcoming", limit: 4,
    }), undefined);
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
