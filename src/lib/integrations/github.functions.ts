import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };

const startInput = z.object({
  origin: z.string().trim().url().max(300).optional(),
});

const repoInput = z.object({
  repository: z.string().trim().min(3).max(220),
});

const branchesInput = repoInput.extend({
  perPage: z.number().int().min(1).max(100).optional(),
});

const commitsInput = repoInput.extend({
  ref: z.string().trim().max(250).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

const pathInput = repoInput.extend({
  path: z.string().max(1000).optional(),
  ref: z.string().trim().max(250).optional(),
});

const fileInput = repoInput.extend({
  path: z.string().trim().min(1).max(1000),
  ref: z.string().trim().max(250).optional(),
});

function splitRepository(repository: string): { owner: string; repo: string } {
  const parts = repository.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("Repository must use owner/name format.");
  return { owner: parts[0], repo: parts[1] };
}

async function publicGitHubAppClientId(): Promise<string> {
  const slug = process.env["GITHUB_APP_SLUG"]?.trim().toLowerCase();
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) {
    throw new Error("GitHub App slug is not configured correctly.");
  }
  const response = await fetch(`https://api.github.com/apps/${encodeURIComponent(slug)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
      "User-Agent": "PalladiumAI",
    },
  });
  if (!response.ok) throw new Error(`Could not resolve the GitHub App OAuth client (${response.status}).`);
  const payload = await response.json() as { client_id?: unknown };
  if (typeof payload.client_id !== "string" || !payload.client_id.trim()) {
    throw new Error("GitHub did not return an OAuth client id for this App.");
  }
  return payload.client_id.trim();
}

export function installationIdFromConfig(config: unknown): number {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("GitHub is not connected.");
  }
  const value = (config as Record<string, unknown>)["installation_id"];
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error("GitHub connection is missing a valid installation.");
  return parsed;
}

async function githubConnection(sb: Sb, userId: string): Promise<{ installationId: number; accountLabel: string | null }> {
  const { data, error } = await sb
    .from("integrations")
    .select("status,account_label,config")
    .eq("user_id", userId)
    .eq("provider", "github")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.status !== "connected") throw new Error("GitHub is not connected.");
  return {
    installationId: installationIdFromConfig(data.config),
    accountLabel: typeof data.account_label === "string" ? data.account_label : null,
  };
}

export const getGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { githubConnectionConfigured } = await import("./github-app.server");
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("integrations")
      .select("status,account_label,config,connected_at,last_error")
      .eq("user_id", context.userId)
      .eq("provider", "github")
      .maybeSingle();
    if (error) throw new Error(error.message);
    let installationId: number | null = null;
    if (data?.status === "connected") {
      try { installationId = installationIdFromConfig(data.config); } catch { installationId = null; }
    }
    return {
      configured: githubConnectionConfigured(),
      connected: data?.status === "connected" && installationId !== null,
      installationId,
      accountLabel: typeof data?.account_label === "string" ? data.account_label : null,
      connectedAt: typeof data?.connected_at === "string" ? data.connected_at : null,
      lastError: typeof data?.last_error === "string" ? data.last_error : null,
    };
  });

/** Starts GitHub user authorization first so existing App installations can be discovered reliably. */
export const startGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startInput.parse(input))
  .handler(async ({ data, context }) => {
    const { safeOrigin, createState } = await import("./oauth.server");
    const { githubConnectionConfigured } = await import("./github-app.server");
    if (!githubConnectionConfigured()) {
      throw new Error("GitHub App connection is not configured. Add the GitHub App ID, private key, slug, client ID and client secret to the deployment.");
    }
    const clientId = await publicGitHubAppClientId();

    const origin = safeOrigin(data.origin);
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("integrations").upsert(
      {
        user_id: context.userId,
        org_id: null,
        provider: "github",
        name: "GitHub",
        integration_type: "github_app",
        status: "pending",
        scopes: ["metadata:read", "contents:read"],
        granted_scopes: [],
        config: {},
        last_error: null,
      },
      { onConflict: "user_id,provider" },
    );
    if (error) throw new Error(error.message);

    const state = createState({ userId: context.userId, provider: "github", origin });
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("state", state);
    return { installUrl: authorizeUrl.toString() };
  });

export const listConnectedGitHubRepositories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const connection = await githubConnection(sb, context.userId);
    const { listGitHubRepositories } = await import("./github-app.server");
    return {
      repositories: await listGitHubRepositories(connection.installationId),
      accountLabel: connection.accountLabel,
    };
  });

export const listConnectedGitHubBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => branchesInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const connection = await githubConnection(sb, context.userId);
    const { owner, repo } = splitRepository(data.repository);
    const { listGitHubBranches } = await import("./github-app.server");
    return listGitHubBranches({
      installationId: connection.installationId,
      owner,
      repo,
      ...(data.perPage === undefined ? {} : { perPage: data.perPage }),
    });
  });

export const listConnectedGitHubCommits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => commitsInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const connection = await githubConnection(sb, context.userId);
    const { owner, repo } = splitRepository(data.repository);
    const { listGitHubCommits } = await import("./github-app.server");
    return listGitHubCommits({
      installationId: connection.installationId,
      owner,
      repo,
      ...(data.ref === undefined ? {} : { ref: data.ref }),
      ...(data.perPage === undefined ? {} : { perPage: data.perPage }),
    });
  });

export const listConnectedGitHubPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pathInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const connection = await githubConnection(sb, context.userId);
    const { owner, repo } = splitRepository(data.repository);
    const { listGitHubPath } = await import("./github-app.server");
    return listGitHubPath({
      installationId: connection.installationId,
      owner,
      repo,
      ...(data.path === undefined ? {} : { path: data.path }),
      ...(data.ref === undefined ? {} : { ref: data.ref }),
    });
  });

export const readConnectedGitHubFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => fileInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const connection = await githubConnection(sb, context.userId);
    const { owner, repo } = splitRepository(data.repository);
    const { readGitHubFile } = await import("./github-app.server");
    return readGitHubFile({
      installationId: connection.installationId,
      owner,
      repo,
      path: data.path,
      ...(data.ref === undefined ? {} : { ref: data.ref }),
    });
  });
