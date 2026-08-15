/**
 * Linear provider executor. Server-only and read-only.
 *
 * Only fixed GraphQL query documents are exposed. Caller/model supplied GraphQL
 * is never accepted, and this module contains no mutations.
 */
import { getIntegrationAccessToken } from "./oauth.server";

const LINEAR_GRAPHQL = "https://api.linear.app/graphql";
const MAX_RESULTS = 50;

type FetchLike = typeof fetch;

export class LinearIntegrationError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "LinearIntegrationError";
  }
}

async function linearQuery<T>(args: {
  userId: string;
  query: string;
  variables?: Record<string, unknown>;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<T> {
  const token = await getIntegrationAccessToken(args.userId, "linear");
  if (!token) {
    throw new LinearIntegrationError(
      "Linear is not connected, or the connection needs to be renewed.",
      401,
    );
  }
  const response = await (args.fetchImpl ?? fetch)(LINEAR_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: args.query, variables: args.variables ?? {} }),
    signal: args.signal ?? AbortSignal.timeout(20_000),
  });

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    throw new LinearIntegrationError(`Linear returned an unreadable response (${response.status}).`, response.status);
  }

  if (!response.ok || (Array.isArray(payload?.errors) && payload.errors.length)) {
    const message = Array.isArray(payload?.errors) ? payload.errors[0]?.message : null;
    throw new LinearIntegrationError(
      String(message ?? `Linear request failed (${response.status}).`).slice(0, 300),
      response.status,
    );
  }
  return payload?.data as T;
}

function boundedText(value: string, requiredMessage: string): string {
  const text = String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!text) throw new LinearIntegrationError(requiredMessage);
  return text;
}

export type LinearTeam = { id: string; name: string };

const TEAMS_QUERY = `
  query PalladiumTeams($first: Int!) {
    teams(first: $first) {
      nodes { id name }
    }
  }
`;

export async function listLinearTeams(args: {
  userId: string;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<LinearTeam[]> {
  const first = Math.min(Math.max(Number(args.limit ?? 25) || 25, 1), MAX_RESULTS);
  const data = await linearQuery<{ teams?: { nodes?: any[] } }>({
    userId: args.userId,
    query: TEAMS_QUERY,
    variables: { first },
    ...(args.signal ? { signal: args.signal } : {}),
    ...(args.fetchImpl ? { fetchImpl: args.fetchImpl } : {}),
  });
  const rows = Array.isArray(data?.teams?.nodes) ? data.teams!.nodes! : [];
  return rows.slice(0, first).map((row: any) => ({
    id: String(row?.id ?? "").slice(0, 100),
    name: String(row?.name ?? "Untitled team").slice(0, 300),
  }));
}

export type LinearIssue = {
  id: string;
  title: string;
  description: string | null;
  assigneeName: string | null;
  createdAt: string | null;
  archivedAt: string | null;
};

const ISSUES_QUERY = `
  query PalladiumIssues($first: Int!, $filter: IssueFilter) {
    issues(first: $first, filter: $filter) {
      nodes {
        id
        title
        description
        assignee { name }
        createdAt
        archivedAt
      }
    }
  }
`;

export async function searchLinearIssues(args: {
  userId: string;
  query: string;
  teamId?: string;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<LinearIssue[]> {
  const query = boundedText(args.query, "A Linear issue search query is required.");
  const first = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), MAX_RESULTS);
  const filter: Record<string, unknown> = {
    title: { containsIgnoreCase: query },
  };
  if (args.teamId) {
    const teamId = String(args.teamId).trim();
    if (!/^[0-9a-fA-F-]{32,36}$/.test(teamId)) {
      throw new LinearIntegrationError("A valid Linear team ID is required.");
    }
    filter["team"] = { id: { eq: teamId } };
  }

  const data = await linearQuery<{ issues?: { nodes?: any[] } }>({
    userId: args.userId,
    query: ISSUES_QUERY,
    variables: { first, filter },
    ...(args.signal ? { signal: args.signal } : {}),
    ...(args.fetchImpl ? { fetchImpl: args.fetchImpl } : {}),
  });
  const rows = Array.isArray(data?.issues?.nodes) ? data.issues!.nodes! : [];
  return rows.slice(0, first).map((row: any) => ({
    id: String(row?.id ?? "").slice(0, 100),
    title: String(row?.title ?? "Untitled issue").slice(0, 500),
    description: row?.description ? String(row.description).slice(0, 10_000) : null,
    assigneeName: row?.assignee?.name ? String(row.assignee.name).slice(0, 300) : null,
    createdAt: row?.createdAt ? String(row.createdAt).slice(0, 100) : null,
    archivedAt: row?.archivedAt ? String(row.archivedAt).slice(0, 100) : null,
  }));
}
