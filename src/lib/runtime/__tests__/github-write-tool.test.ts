import { describe, expect, it, vi } from "vitest";
import { createFakeSupabase } from "./fake-supabase";

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: createFakeSupabase() }));

import { GITHUB_WRITE_TOOL_DEF, runGitHubWriteTool } from "../github-write-tool.server";

describe("github_write approval-only runtime tool", () => {
  it("exposes only the bounded approval-gated GitHub mutations", () => {
    expect(GITHUB_WRITE_TOOL_DEF.name).toBe("github_write");
    expect(GITHUB_WRITE_TOOL_DEF.parameters.properties.action.enum).toEqual([
      "github_branch_create",
      "github_file_create",
      "github_file_update",
    ]);
  });

  it("queues an immutable high-risk approval rather than executing GitHub", async () => {
    const db = createFakeSupabase({ approval_requests: [] }) as any;
    const result = await runGitHubWriteTool(
      {
        action: "github_file_update",
        repository: "acme/widgets",
        branch: "agent/change-copy",
        path: "src/copy.ts",
        content: "export const copy = 'approved';\n",
        message: "Update copy",
        sha: "a".repeat(40),
      },
      {
        sb: db,
        userId: "user-1",
        orgId: null,
        agentId: "agent-1",
        taskId: "task-1",
      } as any,
    );

    expect(result).toMatchObject({
      queued: true,
      status: "pending",
      provider: "github",
      action: "github_file_update",
      risk_level: "high",
      mutation_executed: false,
    });
    expect(db.tables.approval_requests).toHaveLength(1);
    expect(db.tables.approval_requests[0]).toMatchObject({
      action_type: "github_file_update",
      status: "pending",
      risk_level: "high",
      details: {
        repository: "acme/widgets",
        branch: "agent/change-copy",
        path: "src/copy.ts",
        sha: "a".repeat(40),
      },
    });
  });

  it("rejects actions outside the explicit GitHub write allow-list", async () => {
    const db = createFakeSupabase({ approval_requests: [] }) as any;
    const result = await runGitHubWriteTool(
      {
        action: "github_repository_delete",
        repository: "acme/widgets",
        branch: "main",
      },
      { sb: db, userId: "user-1", orgId: null, agentId: "agent-1", taskId: null } as any,
    );

    expect(result).toMatchObject({ error: expect.stringContaining("not supported") });
    expect(db.tables.approval_requests).toHaveLength(0);
  });

  it("never exposes a direct-execution function through the agent tool contract", () => {
    expect(Object.keys(GITHUB_WRITE_TOOL_DEF)).toEqual(expect.arrayContaining(["name", "description", "parameters"]));
    expect((GITHUB_WRITE_TOOL_DEF as any).run).toBeUndefined();
    expect(JSON.stringify(GITHUB_WRITE_TOOL_DEF)).not.toContain("token");
  });
});
