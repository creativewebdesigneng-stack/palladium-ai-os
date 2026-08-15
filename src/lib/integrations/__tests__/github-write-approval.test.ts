import { describe, expect, it } from "vitest";
import { buildGitHubWriteApproval } from "../github-write-approval.server";

const SHA = "a".repeat(40);

describe("GitHub write approval payloads", () => {
  it("normalises branch creation into a high-risk immutable approval", () => {
    expect(buildGitHubWriteApproval({
      action: "github_branch_create",
      repository: "owner/repo",
      branch: "agent/change",
      base_sha: SHA,
    })).toMatchObject({
      action_type: "github_branch_create",
      risk_level: "high",
      details: {
        repository: "owner/repo",
        branch: "agent/change",
        base_sha: SHA,
      },
    });
  });

  it("preserves the exact expected blob sha for file updates", () => {
    const request = buildGitHubWriteApproval({
      action: "github_file_update",
      repository: "owner/repo",
      branch: "agent/change",
      path: "src/example.ts",
      content: "export const value = 2;\n",
      message: "fix: update example",
      sha: SHA,
    });
    expect(request).toMatchObject({
      action_type: "github_file_update",
      risk_level: "high",
      details: {
        repository: "owner/repo",
        branch: "agent/change",
        path: "src/example.ts",
        sha: SHA,
      },
    });
  });

  it("rejects an update approval without optimistic concurrency state", () => {
    expect(() => buildGitHubWriteApproval({
      action: "github_file_update",
      repository: "owner/repo",
      branch: "agent/change",
      path: "src/example.ts",
      content: "changed",
      message: "fix: update example",
    })).toThrow(/file sha/i);
  });

  it("rejects unsafe repository paths before an approval is created", () => {
    expect(() => buildGitHubWriteApproval({
      action: "github_file_create",
      repository: "owner/repo",
      branch: "agent/change",
      path: "../secrets.txt",
      content: "nope",
      message: "chore: unsafe",
    })).toThrow(/file path/i);
  });
});
