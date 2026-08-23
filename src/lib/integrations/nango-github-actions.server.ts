import type { ConnectedServiceInput, RequestSpec } from "./connected-service.server";

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const limit = (value: unknown) => Math.max(1, Math.min(25, Math.trunc(Number(value ?? 10)) || 10));
function repository(input: ConnectedServiceInput) {
  const value = clean(input.repository ?? input.resource_id, 200);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value))
    throw new Error(`Action "${input.action}" requires repository as owner/name.`);
  return value;
}

export function buildNangoGitHubRequest(input: ConnectedServiceInput): RequestSpec {
  const action = clean(input.action, 80).toLowerCase();
  const headers = { "X-GitHub-Api-Version": "2022-11-28" };
  if (action === "repositories_list")
    return {
      url: `https://api.github.com/user/repos?per_page=${limit(input.limit)}&sort=updated`,
      headers,
    };
  const repo = repository(input);
  if (action === "repository_overview")
    return { url: `https://api.github.com/repos/${repo}`, headers };
  if (action === "branches_list")
    return {
      url: `https://api.github.com/repos/${repo}/branches?per_page=${limit(input.limit)}`,
      headers,
    };
  if (action === "commits_list") {
    const url = new URL(`https://api.github.com/repos/${repo}/commits`);
    url.searchParams.set("per_page", String(limit(input.limit)));
    const ref = clean(input.ref ?? input.query, 160);
    if (ref) url.searchParams.set("sha", ref);
    return { url: url.toString(), headers };
  }
  if (action === "path_list" || action === "file_read") {
    const path = clean(input.path ?? input.query, 500)
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    const url = new URL(`https://api.github.com/repos/${repo}/contents/${path}`);
    const ref = clean(input.ref, 160);
    if (ref) url.searchParams.set("ref", ref);
    return {
      url: url.toString(),
      headers: {
        ...headers,
        Accept:
          action === "file_read"
            ? "application/vnd.github.raw+json"
            : "application/vnd.github+json",
      },
    };
  }
  throw new Error(`Action "${action}" is not available for connected provider "github".`);
}
