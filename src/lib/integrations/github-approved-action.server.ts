import { createGitHubAppJwt, normaliseInstallationId, verifyGitHubInstallation } from "./github-app.server";
import { getUserGitHubInstallationId, splitGitHubRepository } from "./github-connected-service.server";

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2026-03-10";
const MAX_FILE_BYTES = 128_000;
const MAX_COMMIT_MESSAGE = 500;

type FetchLike = typeof fetch;

export type ApprovedGitHubActionType =
  | "github_branch_create"
  | "github_file_create"
  | "github_file_update";

export type ApprovedGitHubAction = {
  actionType: ApprovedGitHubActionType;
  details: Record<string, unknown>;
};

type NormalisedApprovedGitHubAction =
  | {
      actionType: "github_branch_create";
      owner: string;
      repo: string;
      branch: string;
      baseSha: string;
    }
  | {
      actionType: "github_file_create";
      owner: string;
      repo: string;
      branch: string;
      path: string;
      content: string;
      message: string;
    }
  | {
      actionType: "github_file_update";
      owner: string;
      repo: string;
      branch: string;
      path: string;
      content: string;
      message: string;
      sha: string;
    };

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeBranch(value: unknown): string {
  const branch = str(value, 250);
  const invalidSpecial = /[~^:?*\[\\\s]/.test(branch);
  const invalidControl = /[\u0000-\u001f\u007f]/.test(branch);
  if (
    !branch
    || branch.startsWith("/")
    || branch.endsWith("/")
    || branch.startsWith(".")
    || branch.endsWith(".")
    || branch.includes("..")
    || branch.includes("//")
    || branch.endsWith(".lock")
    || invalidSpecial
    || invalidControl
  ) {
    throw new Error("Invalid GitHub branch name.");
  }
  return branch;
}

function safeSha(value: unknown, label = "GitHub object sha"): string {
  const sha = str(value, 80);
  if (!/^[0-9a-f]{40,64}$/i.test(sha)) throw new Error(`${label} is invalid.`);
  return sha;
}

function safePath(value: unknown): string {
  const path = str(value, 1000).replace(/^\/+/, "");
  if (!path || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid GitHub file path.");
  }
  if (/[\u0000-\u001f\u007f]/.test(path)) throw new Error("Invalid GitHub file path.");
  return path;
}

function safeContent(value: unknown): string {
  if (typeof value !== "string") throw new Error("GitHub file content is required.");
  const bytes = Buffer.byteLength(value, "utf8");
  if (bytes > MAX_FILE_BYTES) throw new Error(`GitHub file content exceeds ${MAX_FILE_BYTES} bytes.`);
  return value;
}

function safeCommitMessage(value: unknown): string {
  const message = str(value, MAX_COMMIT_MESSAGE);
  if (!message) throw new Error("A GitHub commit message is required.");
  if (/[\u0000\u000b\u000c]/.test(message)) throw new Error("Invalid GitHub commit message.");
  return message;
}

export function normaliseApprovedGitHubAction(action: ApprovedGitHubAction): NormalisedApprovedGitHubAction {
  const { owner, repo } = splitGitHubRepository(action.details["repository"]);

  if (action.actionType === "github_branch_create") {
    return {
      actionType: action.actionType,
      owner,
      repo,
      branch: safeBranch(action.details["branch"]),
      baseSha: safeSha(action.details["base_sha"], "GitHub base sha"),
    };
  }

  if (action.actionType === "github_file_update") {
    return {
      actionType: "github_file_update",
      owner,
      repo,
      branch: safeBranch(action.details["branch"]),
      path: safePath(action.details["path"]),
      content: safeContent(action.details["content"]),
      message: safeCommitMessage(action.details["message"]),
      sha: safeSha(action.details["sha"], "GitHub file sha"),
    };
  }

  if (action.actionType === "github_file_create") {
    return {
      actionType: "github_file_create",
      owner,
      repo,
      branch: safeBranch(action.details["branch"]),
      path: safePath(action.details["path"]),
      content: safeContent(action.details["content"]),
      message: safeCommitMessage(action.details["message"]),
    };
  }

  throw new Error(`Approved GitHub action "${String((action as { actionType?: unknown }).actionType ?? "")}" is not executable.`);
}

async function githubJson<T>(url: string | URL, init: RequestInit, fetchImpl: FetchLike): Promise<T> {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": "PalladiumAI",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { /* handled below */ }
  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : `GitHub API request failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as T;
}

/**
 * Mint a short-lived installation token with repository-content write scope.
 * This function is intentionally separate from the read-only token path and
 * must only be called after an owner approval has been atomically claimed.
 */
export async function createApprovedGitHubWriteToken(
  installationId: unknown,
  fetchImpl: FetchLike = fetch,
): Promise<{ token: string; expiresAt: string }> {
  const id = normaliseInstallationId(installationId);
  await verifyGitHubInstallation(id, fetchImpl);
  const payload = await githubJson<any>(`${GITHUB_API}/app/installations/${id}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${createGitHubAppJwt()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ permissions: { contents: "write", metadata: "read" } }),
  }, fetchImpl);
  if (typeof payload?.token !== "string" || !payload.token || typeof payload?.expires_at !== "string") {
    throw new Error("GitHub did not return a usable write installation token.");
  }
  return { token: payload.token, expiresAt: payload.expires_at };
}

function repoUrl(owner: string, repo: string, suffix: string): string {
  return `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${suffix}`;
}

export async function executeApprovedGitHubAction(
  userId: string,
  action: ApprovedGitHubAction,
  signal?: AbortSignal,
  fetchImpl: FetchLike = fetch,
): Promise<{ ok: boolean; provider: "github"; result?: Record<string, unknown>; error?: string }> {
  let normalised: NormalisedApprovedGitHubAction;
  try {
    normalised = normaliseApprovedGitHubAction(action);
  } catch (error) {
    return { ok: false, provider: "github", error: (error as Error).message.slice(0, 500) };
  }

  const installationId = await getUserGitHubInstallationId(userId);
  if (!installationId) {
    return { ok: false, provider: "github", error: "GitHub is not connected. Connect a GitHub App installation first." };
  }

  try {
    const { token } = await createApprovedGitHubWriteToken(installationId, fetchImpl);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const requestSignal = signal ?? AbortSignal.timeout(20_000);

    if (normalised.actionType === "github_branch_create") {
      const payload = await githubJson<any>(
        repoUrl(normalised.owner, normalised.repo, "/git/refs"),
        {
          method: "POST",
          headers,
          body: JSON.stringify({ ref: `refs/heads/${normalised.branch}`, sha: normalised.baseSha }),
          signal: requestSignal,
        },
        fetchImpl,
      );
      return {
        ok: true,
        provider: "github",
        result: {
          repository: `${normalised.owner}/${normalised.repo}`,
          branch: normalised.branch,
          sha: typeof payload?.object?.sha === "string" ? payload.object.sha : normalised.baseSha,
        },
      };
    }

    const encodedPath = normalised.path.split("/").map(encodeURIComponent).join("/");
    const payload = await githubJson<any>(
      repoUrl(normalised.owner, normalised.repo, `/contents/${encodedPath}`),
      {
        method: "PUT",
        headers,
        body: JSON.stringify({
          message: normalised.message,
          content: Buffer.from(normalised.content, "utf8").toString("base64"),
          branch: normalised.branch,
          ...(normalised.actionType === "github_file_update" ? { sha: normalised.sha } : {}),
        }),
        signal: requestSignal,
      },
      fetchImpl,
    );
    return {
      ok: true,
      provider: "github",
      result: {
        repository: `${normalised.owner}/${normalised.repo}`,
        branch: normalised.branch,
        path: normalised.path,
        commit_sha: typeof payload?.commit?.sha === "string" ? payload.commit.sha : null,
        content_sha: typeof payload?.content?.sha === "string" ? payload.content.sha : null,
        html_url: typeof payload?.content?.html_url === "string" ? payload.content.html_url : null,
      },
    };
  } catch (error) {
    return {
      ok: false,
      provider: "github",
      error: ((error as Error).name === "AbortError" ? "Approved GitHub action was cancelled." : (error as Error).message).slice(0, 500),
    };
  }
}
