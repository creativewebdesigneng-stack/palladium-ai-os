import { queueGitHubWriteApproval } from "@/lib/integrations/github-write-approval.server";
import type { ToolDef } from "./model-gateway.server";

export type GitHubWriteToolContext = {
  userId: string;
  orgId: string | null;
  agentId: string;
  taskId: string | null;
  sb: { from: (table: string) => any };
};

export const GITHUB_WRITE_TOOL_DEF: ToolDef = {
  name: "github_write",
  description:
    "Prepare a GitHub branch or file change for explicit operator approval. This tool never mutates GitHub directly; it only queues the exact immutable payload for approval.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["github_branch_create", "github_file_create", "github_file_update"],
      },
      repository: {
        type: "string",
        description: "GitHub repository in owner/name format.",
      },
      branch: { type: "string" },
      base_sha: {
        type: "string",
        description: "Required for branch creation; the exact commit SHA the new branch must start from.",
      },
      path: { type: "string" },
      content: { type: "string" },
      message: { type: "string" },
      sha: {
        type: "string",
        description: "Required for file updates; the current blob SHA used for optimistic concurrency.",
      },
    },
    required: ["action", "repository", "branch"],
  },
};

export async function runGitHubWriteTool(
  input: Record<string, unknown>,
  ctx: GitHubWriteToolContext,
): Promise<unknown> {
  const action = String(input["action"] ?? "").trim();
  if (!["github_branch_create", "github_file_create", "github_file_update"].includes(action)) {
    return { error: "That GitHub write action is not supported." };
  }

  try {
    const queued = await queueGitHubWriteApproval({
      sb: ctx.sb,
      userId: ctx.userId,
      orgId: ctx.orgId,
      agentId: ctx.agentId,
      taskId: ctx.taskId,
      action: {
        actionType: action as "github_branch_create" | "github_file_create" | "github_file_update",
        details: {
          repository: input["repository"],
          branch: input["branch"],
          base_sha: input["base_sha"],
          path: input["path"],
          content: input["content"],
          message: input["message"],
          sha: input["sha"],
        },
      },
    });

    return {
      queued: true,
      approval_request_id: queued.approvalRequestId,
      status: "pending",
      provider: "github",
      action,
      risk_level: "high",
      note: "No GitHub mutation has occurred. Awaiting explicit operator approval.",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not queue the GitHub write for approval.",
    };
  }
}
