import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/integrations/github-write-approval.server", () => ({
  queueGitHubWriteApproval: vi.fn(async () => ({ approvalRequestId: "approval-1" })),
}));

import { queueGitHubWriteApproval } from "@/lib/integrations/github-write-approval.server";
import { GITHUB_WRITE_TOOL_DEF, runGitHubWriteTool } from "../github-write-tool.server";

const ctx = {
  userId: "user-1",
  orgId: null,
  agentId: "agent-1",
  taskId: "task-1",
  sb: { from: vi.fn() },
};

describe("github approval-only runtime tool", () => {
  it("advertises only the bounded GitHub write actions", () => {
    expect(GITHUB_WRITE_TOOL_DEF.name).toBe("github_write");
    expect(GITHUB_WRITE_TOOL_DEF.parameters.properties.action.enum).toEqual([
      "github_branch_create",
      "github_file_create",
      "github_file_update",
    ]);
  });

  it("queues an immutable write approval instead of executing GitHub", async () => {
    const result = await runGitHubWriteTool(
      {
        action: "github_file_update",
        repository: "owner/repo",
        branch: "agent/change",
        path: "src/app.ts",
        content: "export const ok = true;\n",
        message: "Update app",
        sha: "a".repeat(40),
      },
      ctx,
    );

    expect(result).toMatchObject({
      queued: true,
      approval_request_id: "approval-1",
      provider: "github",
      action: "github_file_update",
      risk_level: "high",
    });
    expect(queueGitHubWriteApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        agentId: "agent-1",
        taskId: "task-1",
        action: expect.objectContaining({
          actionType: "github_file_update",
          details: expect.objectContaining({
            repository: "owner/repo",
            path: "src/app.ts",
            sha: "a".repeat(40),
          }),
        }),
      }),
    );
  });

  it("rejects action names outside the GitHub write allow-list", async () => {
    const result = await runGitHubWriteTool(
      { action: "github_repo_delete", repository: "owner/repo", branch: "main" },
      ctx,
    );
    expect(result).toMatchObject({ error: expect.stringContaining("not supported") });
  });
});
