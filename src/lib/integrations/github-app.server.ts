import { createSign } from "node:crypto";

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2026-03-10";
const MAX_INSTALLATION_ID = Number.MAX_SAFE_INTEGER;

export type GitHubInstallationToken = {
  token: string;
  expiresAt: string;
};

export type GitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
};

function requiredEnv(name: "GITHUB_APP_ID" | "GITHUB_APP_PRIVATE_KEY"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function githubAppConfigured(): boolean {
  return Boolean(process.env["GITHUB_APP_ID"]?.trim() && process.env["GITHUB_APP_PRIVATE_KEY"]?.trim());
}

export function normaliseInstallationId(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > MAX_INSTALLATION_ID) {
    throw new Error("Invalid GitHub App installation id.");
  }
  return parsed;
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function privateKey(): string {
  return requiredEnv("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
}

/** GitHub App JWTs are deliberately short lived and are never sent to the browser. */
export function createGitHubAppJwt(now = Math.floor(Date.now() / 1000)): string {
  const appId = requiredEnv("GITHUB_APP_ID");
  if (!/^\d+$/.test(appId)) throw new Error("GITHUB_APP_ID must be numeric.");

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  // Backdate slightly for clock skew; GitHub allows at most ten minutes.
  const payload = base64url(JSON.stringify({ iat: now - 30, exp: now + 8 * 60, iss: appId }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${base64url(signer.sign(privateKey()))}`;
}

async function githubJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
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
 * Verifies that an installation id actually belongs to this GitHub App.
 * Never trust an installation_id copied from a browser callback/setup URL.
 */
export async function verifyGitHubInstallation(installationId: unknown): Promise<{
  id: number;
  accountLogin: string | null;
  repositorySelection: "all" | "selected" | string;
}> {
  const id = normaliseInstallationId(installationId);
  const payload = await githubJson<any>(`${GITHUB_API}/app/installations/${id}`, {
    headers: { Authorization: `Bearer ${createGitHubAppJwt()}` },
  });
  if (Number(payload?.id) !== id) throw new Error("GitHub installation verification failed.");
  if (payload?.suspended_at) throw new Error("This GitHub App installation is suspended.");
  const contents = payload?.permissions?.contents;
  if (contents !== "read" && contents !== "write") {
    throw new Error("The GitHub App installation does not grant repository contents access.");
  }
  return {
    id,
    accountLogin: typeof payload?.account?.login === "string" ? payload.account.login.slice(0, 120) : null,
    repositorySelection: typeof payload?.repository_selection === "string" ? payload.repository_selection : "selected",
  };
}

/**
 * Mints a one-hour installation token narrowed back down to read-only contents.
 * We do not persist this token; callers mint it on demand from the verified installation id.
 */
export async function createGitHubInstallationToken(installationId: unknown): Promise<GitHubInstallationToken> {
  const installation = await verifyGitHubInstallation(installationId);
  const payload = await githubJson<any>(`${GITHUB_API}/app/installations/${installation.id}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${createGitHubAppJwt()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ permissions: { contents: "read", metadata: "read" } }),
  });
  if (typeof payload?.token !== "string" || typeof payload?.expires_at !== "string") {
    throw new Error("GitHub did not return a usable installation token.");
  }
  return { token: payload.token, expiresAt: payload.expires_at };
}

export async function listGitHubRepositories(installationId: unknown): Promise<GitHubRepository[]> {
  const { token } = await createGitHubInstallationToken(installationId);
  const payload = await githubJson<any>(`${GITHUB_API}/installation/repositories?per_page=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const rows = Array.isArray(payload?.repositories) ? payload.repositories : [];
  return rows.slice(0, 100).flatMap((repo: any) => {
    if (!Number.isSafeInteger(repo?.id) || typeof repo?.name !== "string" || typeof repo?.full_name !== "string") return [];
    return [{
      id: repo.id,
      name: repo.name.slice(0, 200),
      fullName: repo.full_name.slice(0, 300),
      private: Boolean(repo.private),
      defaultBranch: typeof repo.default_branch === "string" ? repo.default_branch.slice(0, 200) : "main",
      htmlUrl: typeof repo.html_url === "string" ? repo.html_url : "",
    }];
  });
}
