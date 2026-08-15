import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listRepositories: vi.fn(),
  listBranches: vi.fn(),
  listCommits: vi.fn(),
  listPath: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("./github-app.server", () => ({
  listGitHubRepositories: mocks.listRepositories,
  listGitHubBranches: mocks.listBranches,
  listGitHubCommits: mocks.listCommits,
  listGitHubPath: mocks.listPath,
  readGitHubFile: mocks.readFile,
}));

import {
  executeGitHubConnectedService,
  GITHUB_CONNECTED_SERVICE_ACTIONS,
  splitGitHubRepository,
} from "./github-connected-service.server";

describe("GitHub connected-service agent adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes only the bounded read actions", () => {
    expect([...GITHUB_CONNECTED_SERVICE_ACTIONS]).toEqual([
      "repositories_list",
      "repository_overview",
      "branches_list",
      "commits_list",
      "path_list",
      "file_read",
    ]);
    expect(GITHUB_CONNECTED_SERVICE_ACTIONS.some((action) => /write|create|update|delete|push|merge|commit_create|pr_create/.test(action))).toBe(false);
  });

  it("rejects malformed repository identifiers", () => {
    expect(() => splitGitHubRepository("acme/app")).not.toThrow();
    expect(() => splitGitHubRepository("acme/app/extra")).toThrow("owner/name");
    expect(() => splitGitHubRepository("../secrets/app")).toThrow();
    expect(() => splitGitHubRepository("acme/../../secrets")).toThrow();
  });

  it("lists repositories and applies the agent result limit", async () => {
    mocks.listRepositories.mockResolvedValue([
      { id: 1, fullName: "acme/one" },
      { id: 2, fullName: "acme/two" },
      { id: 3, fullName: "acme/three" },
    ]);

    const result = await executeGitHubConnectedService(42, {
      action: "repositories_list",
      limit: 2,
    });

    expect(result).toEqual([
      { id: 1, fullName: "acme/one" },
      { id: 2, fullName: "acme/two" },
    ]);
    expect(mocks.listRepositories).toHaveBeenCalledWith(42);
  });

  it("builds a bounded read-only repository overview", async () => {
    mocks.listBranches.mockResolvedValue([{ name: "main" }, { name: "dev" }]);
    mocks.listPath.mockResolvedValue([{ type: "dir", name: "src", path: "src" }, { type: "file", name: "README.md", path: "README.md" }]);
    mocks.listCommits.mockResolvedValue([{ sha: "abc", message: "Ship overview" }]);

    const result = await executeGitHubConnectedService(42, {
      action: "repository_overview",
      repository: "acme/app",
      ref: "main",
      limit: 99,
    });

    expect(result).toEqual({
      repository: "acme/app",
      ref: "main",
      branches: [{ name: "main" }, { name: "dev" }],
      root: [{ type: "dir", name: "src", path: "src" }, { type: "file", name: "README.md", path: "README.md" }],
      recentCommits: [{ sha: "abc", message: "Ship overview" }],
      readOnly: true,
    });
    expect(mocks.listBranches).toHaveBeenCalledWith({ installationId: 42, owner: "acme", repo: "app", perPage: 10 });
    expect(mocks.listPath).toHaveBeenCalledWith({ installationId: 42, owner: "acme", repo: "app", ref: "main" });
    expect(mocks.listCommits).toHaveBeenCalledWith({ installationId: 42, owner: "acme", repo: "app", perPage: 10, ref: "main" });
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it("passes only validated repository/ref data into commit reads", async () => {
    mocks.listCommits.mockResolvedValue([{ sha: "abc", message: "Fix auth" }]);

    const result = await executeGitHubConnectedService(42, {
      action: "commits_list",
      repository: "acme/app",
      ref: "main",
      limit: 999,
    });

    expect(result).toEqual([{ sha: "abc", message: "Fix auth" }]);
    expect(mocks.listCommits).toHaveBeenCalledWith({
      installationId: 42,
      owner: "acme",
      repo: "app",
      ref: "main",
      perPage: 25,
    });
  });

  it("requires an explicit path for file reads", async () => {
    await expect(executeGitHubConnectedService(42, {
      action: "file_read",
      repository: "acme/app",
    })).rejects.toThrow('requires path');
    expect(mocks.readFile).not.toHaveBeenCalled();
  });

  it("does not invent or expose a write action", async () => {
    await expect(executeGitHubConnectedService(42, {
      action: "file_write",
      repository: "acme/app",
      path: "src/index.ts",
    })).rejects.toThrow('not available');
    expect(mocks.readFile).not.toHaveBeenCalled();
    expect(mocks.listPath).not.toHaveBeenCalled();
    expect(mocks.listBranches).not.toHaveBeenCalled();
  });
});
