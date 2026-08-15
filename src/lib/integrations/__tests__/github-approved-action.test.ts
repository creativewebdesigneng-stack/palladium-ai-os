import { describe, expect, it } from "vitest";
import { normaliseApprovedGitHubAction } from "../github-approved-action.server";

describe("approved GitHub action validation", () => {
  it("normalises a branch creation request", () => {
    expect(normaliseApprovedGitHubAction({
      actionType: "github_branch_create",
      details: {
        repository: "openai/example",
        branch: "agent/fix-123",
        base_sha: "a".repeat(40),
      },
    })).toEqual({
      actionType: "github_branch_create",
      owner: "openai",
      repo: "example",
      branch: "agent/fix-123",
      baseSha: "a".repeat(40),
    });
  });

  it("requires optimistic concurrency for file updates", () => {
    expect(() => normaliseApprovedGitHubAction({
      actionType: "github_file_update",
      details: {
        repository: "openai/example",
        branch: "agent/fix-123",
        path: "src/index.ts",
        content: "export {};",
        message: "fix: update index",
      },
    })).toThrow("GitHub file sha is invalid");
  });

  it("rejects traversal paths", () => {
    expect(() => normaliseApprovedGitHubAction({
      actionType: "github_file_create",
      details: {
        repository: "openai/example",
        branch: "agent/fix-123",
        path: "../secret.txt",
        content: "nope",
        message: "test",
      },
    })).toThrow("Invalid GitHub file path");
  });

  it("rejects malformed branch names", () => {
    expect(() => normaliseApprovedGitHubAction({
      actionType: "github_branch_create",
      details: {
        repository: "openai/example",
        branch: "../main",
        base_sha: "b".repeat(40),
      },
    })).toThrow("Invalid GitHub branch name");
  });

  it("bounds file content before any provider request", () => {
    expect(() => normaliseApprovedGitHubAction({
      actionType: "github_file_create",
      details: {
        repository: "openai/example",
        branch: "agent/fix-123",
        path: "large.txt",
        content: "x".repeat(128_001),
        message: "test: large",
      },
    })).toThrow("GitHub file content exceeds 128000 bytes");
  });
});
