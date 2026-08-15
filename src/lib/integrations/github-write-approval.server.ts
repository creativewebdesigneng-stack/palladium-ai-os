import {
  normaliseApprovedGitHubAction,
  type ApprovedGitHubActionType,
} from "./github-approved-action.server";

type Sb = { from: (table: string) => any };

export type GitHubWriteApprovalContext = {
  sb: Sb;
  userId: string;
  orgId?: string | null;
  agentId?: string | null;
  taskId?: string | null;
};

export type GitHubWriteApprovalInput = {
  action: ApprovedGitHubActionType;
  repository: string;
  branch: string;
  base_sha?: string;
  path?: string;
  content?: string;
  message?: string;
  sha?: string;
};

function approvalTitle(action: ApprovedGitHubActionType, repository: string, path?: string, branch?: string): string {
  if (action === "github_branch_create") return `Create GitHub branch: ${branch ?? repository}`.slice(0, 200);
  const verb = action === "github_file_create" ? "Create" : "Update";
  return `${verb} GitHub file: ${repository}/${path ?? ""}`.slice(0, 200);
}

/**
 * Normalises the exact GitHub mutation before storing it for human approval.
 * The approved executor later consumes only this persisted payload; clients do
 * not get to replace details at decision or retry time.
 */
export function buildGitHubWriteApproval(input: GitHubWriteApprovalInput) {
  const details: Record<string, unknown> = {
    repository: input.repository,
    branch: input.branch,
    ...(input.base_sha === undefined ? {} : { base_sha: input.base_sha }),
    ...(input.path === undefined ? {} : { path: input.path }),
    ...(input.content === undefined ? {} : { content: input.content }),
    ...(input.message === undefined ? {} : { message: input.message }),
    ...(input.sha === undefined ? {} : { sha: input.sha }),
  };

  const normalised = normaliseApprovedGitHubAction({ actionType: input.action, details });
  const repository = `${normalised.owner}/${normalised.repo}`;

  if (normalised.actionType === "github_branch_create") {
    return {
      action_type: normalised.actionType,
      title: approvalTitle(normalised.actionType, repository, undefined, normalised.branch),
      summary: `Approve creating branch ${normalised.branch} in ${repository} from ${normalised.baseSha.slice(0, 12)}.`,
      details: {
        repository,
        branch: normalised.branch,
        base_sha: normalised.baseSha,
      },
      risk_level: "high" as const,
    };
  }

  return {
    action_type: normalised.actionType,
    title: approvalTitle(normalised.actionType, repository, normalised.path, normalised.branch),
    summary: `Approve ${normalised.actionType === "github_file_create" ? "creating" : "updating"} ${normalised.path} on ${normalised.branch} in ${repository}.`,
    details: {
      repository,
      branch: normalised.branch,
      path: normalised.path,
      content: normalised.content,
      message: normalised.message,
      ...(normalised.actionType === "github_file_update" ? { sha: normalised.sha } : {}),
    },
    risk_level: "high" as const,
  };
}

export async function queueGitHubWriteApproval(ctx: GitHubWriteApprovalContext, input: GitHubWriteApprovalInput) {
  const request = buildGitHubWriteApproval(input);
  const { data, error } = await ctx.sb
    .from("approval_requests")
    .insert({
      user_id: ctx.userId,
      org_id: ctx.orgId ?? null,
      agent_id: ctx.agentId ?? null,
      task_id: ctx.taskId ?? null,
      ...request,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) throw new Error("Could not queue the GitHub write for approval.");
  return {
    queued: true as const,
    approval_request_id: data?.id ?? null,
    status: "pending" as const,
    provider: "github" as const,
    action: request.action_type,
  };
}
