import { createSign } from "node:crypto";

const GITHUB_API = "https://api.github.com";
const GITHUB_OAUTH = "https://github.com/login/oauth/access_token";
const API_VERSION = "2026-03-10";
const MAX_INSTALLATION_ID = Number.MAX_SAFE_INTEGER;
const MAX_PAGE_SIZE = 100;
const MAX_FILE_BYTES = 512_000;

type FetchLike = typeof fetch;

type GitHubUserInstallation = {
  id: number;
  accountLogin: string | null;
};

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

export type GitHubBranch = {
  name: string;
  sha: string;
  protected: boolean;
};

export type GitHubCommit = {
  sha: string;
  message: string;
  authorName: string;
  authorDate: string | null;
  htmlUrl: string;
};

export type GitHubPathEntry = {
  type: "file" | "dir";
  name: string;
  path: string;
  sha: string;
  size: number;
  htmlUrl: string;
};

function requiredEnv(name: "GITHUB_APP_ID" | "GITHUB_APP_PRIVATE_KEY" | "GITHUB_APP_SLUG" | "GITHUB_APP_CLIENT_ID" | "GITHUB_APP_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function githubAppConfigured(): boolean {
  return Boolean(process.env["GITHUB_APP_ID"]?.trim() && process.env["GITHUB_APP_PRIVATE_KEY"]?.trim());
}

export function githubConnectionConfigured(): boolean {
  return githubAppConfigured()
    && Boolean(process.env["GITHUB_APP_SLUG"]?.trim())
    && Boolean(process.env["GITHUB_APP_CLIENT_ID"]?.trim())
    && Boolean(process.env["GITHUB_APP_CLIENT_SECRET"]?.trim());
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
  let value = requiredEnv("GITHUB_APP_PRIVATE_KEY")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim();
  }

  const formats = [
    { begin: "-----BEGIN RSA PRIVATE KEY-----", end: "-----END RSA PRIVATE KEY-----" },
    { begin: "-----BEGIN PRIVATE KEY-----", end: "-----END PRIVATE KEY-----" },
  ];
  const format = formats.find(({ begin, end }) => value.includes(begin) && value.includes(end));
  if (!format) throw new Error("GITHUB_APP_PRIVATE_KEY is not a valid PEM private key.");

  const start = value.indexOf(format.begin) + format.begin.length;
  const finish = value.indexOf(format.end, start);
  if (finish < start) throw new Error("GITHUB_APP_PRIVATE_KEY is not a valid PEM private key.");

  const body = value.slice(start, finish).replace(/\s+/g, "");
  if (!body || !/^[A-Za-z0-9+/=]+$/.test(body)) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not a valid PEM private key.");
  }
  const lines = body.match(/.{1,64}/g) ?? [];
  return `${format.begin}\n${lines.join("\n")}\n${format.end}\n`;
}

/** GitHub App JWTs are deliberately short lived and are never sent to the browser. */
export function createGitHubAppJwt(now = Math.floor(Date.now() / 1000)): string {
  const appId = requiredEnv("GITHUB_APP_ID");
  if (!/^\d+$/.test(appId)) throw new Error("GITHUB_APP_ID must be numeric.");

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: now - 30, exp: now + 8 * 60, iss: appId }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${base64url(signer.sign(privateKey()))}`;
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

/** Build the GitHub App install URL with PalladiumAI's signed state attached. */
export function buildGitHubInstallUrl(state: string): string {
  const slug = requiredEnv("GITHUB_APP_SLUG").toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) throw new Error("GITHUB_APP_SLUG is invalid.");
  if (!state || state.length > 2000) throw new Error("Invalid GitHub installation state.");
  const url = new URL(`https://github.com/apps/${slug}/installations/new`);
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Exchange the short-lived callback code for a GitHub App user access token.
 * This token is used only to bind the installation to the consenting GitHub
 * user and is never persisted by PalladiumAI.
 */
export async function exchangeGitHubUserCode(
  code: string,
  redirectUri: string,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  if (!code.trim() || code.length > 1000) throw new Error("Invalid GitHub authorization code.");
  const redirect = new URL(redirectUri);
  if (redirect.protocol !== "https:" && redirect.hostname !== "localhost" && redirect.hostname !== "127.0.0.1") {
    throw new Error("Invalid GitHub callback URL.");
  }
  const body = new URLSearchParams({
    client_id: requiredEnv("GITHUB_APP_CLIENT_ID"),
    client_secret: requiredEnv("GITHUB_APP_CLIENT_SECRET"),
    code,
    redirect_uri: redirect.toString(),
  });
  const payload = await githubJson<any>(GITHUB_OAUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }, fetchImpl);
  if (typeof payload?.access_token !== "string" || !payload.access_token) {
    throw new Error(typeof payload?.error_description === "string" ? payload.error_description : "GitHub did not return a user access token.");
  }
  return payload.access_token;
}

async function listUserInstallations(userAccessToken: string, fetchImpl: FetchLike): Promise<GitHubUserInstallation[]> {
  const payload = await githubJson<any>(`${GITHUB_API}/user/installations?per_page=100`, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  }, fetchImpl);
  const rows = Array.isArray(payload?.installations) ? payload.installations : [];
  return rows.flatMap((installation: any) => {
    if (!Number.isSafeInteger(installation?.id) || installation.id <= 0) return [];
    return [{
      id: installation.id,
      accountLogin: typeof installation?.account?.login === "string" ? installation.account.login.slice(0, 120) : null,
    }];
  });
}

/**
 * Proves that a callback installation is accessible to the GitHub user who
 * just authorized this GitHub App. If GitHub does not send installation_id,
 * an unambiguous single installation may be selected; multiple candidates are
 * rejected rather than guessed.
 */
export async function resolveVerifiedUserInstallation(
  userAccessToken: string,
  suggestedInstallationId: unknown,
  fetchImpl: FetchLike = fetch,
): Promise<GitHubUserInstallation> {
  if (!userAccessToken) throw new Error("GitHub user authorization is missing.");
  const installations = await listUserInstallations(userAccessToken, fetchImpl);
  if (!installations.length) throw new Error("No PalladiumAI GitHub App installation is available for this GitHub user.");

  if (suggestedInstallationId !== null && suggestedInstallationId !== undefined && suggestedInstallationId !== "") {
    const id = normaliseInstallationId(suggestedInstallationId);
    const match = installations.find((installation) => installation.id === id);
    if (!match) throw new Error("The GitHub App installation is not accessible to the authorized GitHub user.");
    return match;
  }

  if (installations.length !== 1) {
    throw new Error("Multiple PalladiumAI GitHub installations are available. Reconnect from the specific installation so it can be verified safely.");
  }
  return installations[0]!;
}

/**
 * Verifies that an installation id actually belongs to this GitHub App.
 * Never trust an installation_id copied from a browser callback/setup URL.
 */
export async function verifyGitHubInstallation(
  installationId: unknown,
  fetchImpl: FetchLike = fetch,
): Promise<{
  id: number;
  accountLogin: string | null;
  repositorySelection: "all" | "selected" | string;
}> {
  const id = normaliseInstallationId(installationId);
  const payload = await githubJson<any>(`${GITHUB_API}/app/installations/${id}`, {
    headers: { Authorization: `Bearer ${createGitHubAppJwt()}` },
  }, fetchImpl);
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
export async function createGitHubInstallationToken(
  installationId: unknown,
  fetchImpl: FetchLike = fetch,
): Promise<GitHubInstallationToken> {
  const installation = await verifyGitHubInstallation(installationId, fetchImpl);
  const payload = await githubJson<any>(`${GITHUB_API}/app/installations/${installation.id}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${createGitHubAppJwt()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ permissions: { contents: "read", metadata: "read" } }),
  }, fetchImpl);
  if (typeof payload?.token !== "string" || typeof payload?.expires_at !== "string") {
    throw new Error("GitHub did not return a usable installation token.");
  }
  return { token: payload.token, expiresAt: payload.expires_at };
}

export async function listGitHubRepositories(
  installationId: unknown,
  fetchImpl: FetchLike = fetch,
): Promise<GitHubRepository[]> {
  const { token } = await createGitHubInstallationToken(installationId, fetchImpl);
  const payload = await githubJson<any>(`${GITHUB_API}/installation/repositories?per_page=100`, {
    headers: { Authorization: `Bearer ${token}` },
  }, fetchImpl);
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

function safeRepoPart(value: string, label: string): string {
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(trimmed)) throw new Error(`Invalid GitHub ${label}.`);
  return trimmed;
}

function safePath(value: string | undefined): string {
  const path = (value ?? "").trim().replace(/^\/+/, "");
  if (!path) return "";
  if (path.length > 1000 || path.includes("\\") || path.split("/").some((part) => part === "..")) {
    throw new Error("Invalid repository path.");
  }
  return path.split("/").map(encodeURIComponent).join("/");
}

function safeRef(value: string | undefined): string | undefined {
  const ref = value?.trim();
  if (!ref) return undefined;
  if (ref.length > 250 || /[\u0000-\u001f\u007f]/.test(ref)) throw new Error("Invalid Git ref.");
  return ref;
}

async function repositoryGet(args: {
  installationId: unknown;
  owner: string;
  repo: string;
  path: string;
  query?: Record<string, string | number | undefined>;
  fetchImpl?: FetchLike;
}): Promise<any> {
  const fetchImpl = args.fetchImpl ?? fetch;
  const owner = safeRepoPart(args.owner, "owner");
  const repo = safeRepoPart(args.repo, "repository");
  const { token } = await createGitHubInstallationToken(args.installationId, fetchImpl);
  const url = new URL(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${args.path}`);
  for (const [key, value] of Object.entries(args.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return githubJson<any>(url, { headers: { Authorization: `Bearer ${token}` } }, fetchImpl);
}

export async function listGitHubBranches(args: {
  installationId: unknown;
  owner: string;
  repo: string;
  perPage?: number;
  fetchImpl?: FetchLike;
}): Promise<GitHubBranch[]> {
  const perPage = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(args.perPage ?? 50)));
  const payload = await repositoryGet({ ...args, path: "/branches", query: { per_page: perPage } });
  return (Array.isArray(payload) ? payload : []).map((branch: any) => ({
    name: String(branch.name ?? "").slice(0, 250),
    sha: String(branch.commit?.sha ?? "").slice(0, 80),
    protected: Boolean(branch.protected),
  }));
}

export async function listGitHubCommits(args: {
  installationId: unknown;
  owner: string;
  repo: string;
  ref?: string;
  perPage?: number;
  fetchImpl?: FetchLike;
}): Promise<GitHubCommit[]> {
  const perPage = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(args.perPage ?? 30)));
  const payload = await repositoryGet({
    ...args,
    path: "/commits",
    query: { per_page: perPage, sha: safeRef(args.ref) },
  });
  return (Array.isArray(payload) ? payload : []).map((commit: any) => ({
    sha: String(commit.sha ?? "").slice(0, 80),
    message: String(commit.commit?.message ?? "").slice(0, 4000),
    authorName: String(commit.commit?.author?.name ?? "").slice(0, 200),
    authorDate: commit.commit?.author?.date ? String(commit.commit.author.date) : null,
    htmlUrl: String(commit.html_url ?? ""),
  }));
}

export async function listGitHubPath(args: {
  installationId: unknown;
  owner: string;
  repo: string;
  path?: string;
  ref?: string;
  fetchImpl?: FetchLike;
}): Promise<GitHubPathEntry[]> {
  const encodedPath = safePath(args.path);
  const payload = await repositoryGet({
    ...args,
    path: `/contents${encodedPath ? `/${encodedPath}` : ""}`,
    query: { ref: safeRef(args.ref) },
  });
  const rows = Array.isArray(payload) ? payload : [payload];
  return rows.slice(0, 500).map((item: any) => ({
    type: item.type === "dir" ? "dir" : "file",
    name: String(item.name ?? "").slice(0, 300),
    path: String(item.path ?? "").slice(0, 1000),
    sha: String(item.sha ?? "").slice(0, 80),
    size: Number(item.size ?? 0),
    htmlUrl: String(item.html_url ?? ""),
  }));
}

export async function readGitHubFile(args: {
  installationId: unknown;
  owner: string;
  repo: string;
  path: string;
  ref?: string;
  fetchImpl?: FetchLike;
}): Promise<{ path: string; sha: string; size: number; content: string; encoding: "utf-8" }> {
  const encodedPath = safePath(args.path);
  if (!encodedPath) throw new Error("A file path is required.");
  const payload = await repositoryGet({
    ...args,
    path: `/contents/${encodedPath}`,
    query: { ref: safeRef(args.ref) },
  });
  if (payload?.type !== "file" || typeof payload?.content !== "string") {
    throw new Error("The requested GitHub path is not a readable file.");
  }
  const declaredSize = Number(payload.size ?? 0);
  if (!Number.isFinite(declaredSize) || declaredSize < 0 || declaredSize > MAX_FILE_BYTES) {
    throw new Error(`File exceeds the ${MAX_FILE_BYTES}-byte read limit.`);
  }
  if (payload.encoding !== "base64") throw new Error("Unsupported GitHub file encoding.");
  const bytes = Buffer.from(payload.content.replace(/\s+/g, ""), "base64");
  if (bytes.length > MAX_FILE_BYTES) throw new Error(`File exceeds the ${MAX_FILE_BYTES}-byte read limit.`);
  return {
    path: String(payload.path ?? args.path).slice(0, 1000),
    sha: String(payload.sha ?? "").slice(0, 80),
    size: bytes.length,
    content: bytes.toString("utf8"),
    encoding: "utf-8",
  };
}
