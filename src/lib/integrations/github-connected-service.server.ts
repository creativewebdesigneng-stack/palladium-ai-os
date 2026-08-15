import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  listGitHubBranches,
  listGitHubCommits,
  listGitHubPath,
  listGitHubRepositories,
  readGitHubFile,
} from "./github-app.server";

export type GitHubConnectedServiceInput = {
  action: string;
  repository?: string;
  path?: string;
  ref?: string;
  limit?: number;
};

export const GITHUB_CONNECTED_SERVICE_ACTIONS = [
  "repositories_list",
  "branches_list",
  "commits_list",
  "path_list",
  "file_read",
] as const;

const MAX_RESPONSE_CHARS = 18_000;

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function boundedLimit(value: unknown): number {
  const parsed = Number(value ?? 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.max(1, Math.min(25, Math.trunc(parsed)));
}

export function splitGitHubRepository(value: unknown): { owner: string; repo: string } {
  const repository = clean(value, 220);
  const parts = repository.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("GitHub repository must use owner/name format.");
  }
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(parts[0]) || !/^[A-Za-z0-9_.-]{1,100}$/.test(parts[1])) {
    throw new Error("Invalid GitHub repository name.");
  }
  return { owner: parts[0], repo: parts[1] };
}

function installationIdFromConfig(config: unknown): number {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("GitHub is not connected.");
  const value = (config as Record<string, unknown>)["installation_id"];
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("GitHub connection is missing a valid installation.");
  return parsed;
}

export async function getUserGitHubInstallationId(userId: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("status,config")
    .eq("user_id", userId)
    .eq("provider", "github")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.status !== "connected") return null;
  return installationIdFromConfig(data.config);
}

function truncate(value: unknown): unknown {
  const text = JSON.stringify(value ?? null);
  if (text.length <= MAX_RESPONSE_CHARS) return value;
  return { truncated: true, preview: text.slice(0, MAX_RESPONSE_CHARS) };
}

export async function executeGitHubConnectedService(
  installationId: number,
  input: GitHubConnectedServiceInput,
): Promise<unknown> {
  const action = clean(input.action, 80).toLowerCase();
  if (!(GITHUB_CONNECTED_SERVICE_ACTIONS as readonly string[]).includes(action)) {
    throw new Error(`Action "${action}" is not available for connected provider "github".`);
  }

  const limit = boundedLimit(input.limit);
  const ref = clean(input.ref, 250);
  const path = clean(input.path, 1000);

  if (action === "repositories_list") {
    return truncate((await listGitHubRepositories(installationId)).slice(0, limit));
  }

  const { owner, repo } = splitGitHubRepository(input.repository);

  if (action === "branches_list") {
    return truncate(await listGitHubBranches({ installationId, owner, repo, perPage: limit }));
  }
  if (action === "commits_list") {
    return truncate(await listGitHubCommits({
      installationId,
      owner,
      repo,
      perPage: limit,
      ...(ref ? { ref } : {}),
    }));
  }
  if (action === "path_list") {
    return truncate(await listGitHubPath({
      installationId,
      owner,
      repo,
      ...(path ? { path } : {}),
      ...(ref ? { ref } : {}),
    }));
  }
  if (!path) throw new Error('Action "file_read" requires path.');
  return truncate(await readGitHubFile({
    installationId,
    owner,
    repo,
    path,
    ...(ref ? { ref } : {}),
  }));
}

export async function readConnectedGitHubService(userId: string, input: GitHubConnectedServiceInput): Promise<unknown> {
  const installationId = await getUserGitHubInstallationId(userId);
  if (!installationId) return { error: "GitHub is not connected. Connect a GitHub App installation first." };
  try {
    const data = await executeGitHubConnectedService(installationId, input);
    return { provider: "github", action: clean(input.action, 80).toLowerCase(), read_only: true, data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "GitHub repository read failed." };
  }
}
