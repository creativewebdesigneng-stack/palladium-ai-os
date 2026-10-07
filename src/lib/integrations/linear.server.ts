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


function linearId(value: unknown, label: string): string {
  const id = String(value ?? "").trim();
  if (!/^[0-9a-fA-F-]{32,36}$/.test(id)) throw new LinearIntegrationError(`A valid Linear ${label} ID is required.`);
  return id;
}

function boundedIssueText(value: unknown, label: string, max: number, required = false): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new LinearIntegrationError(`Linear ${label} is required.`);
    return undefined;
  }
  const text = String(value).replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  if (required && !text) throw new LinearIntegrationError(`Linear ${label} is required.`);
  return text;
}

const ISSUE_CREATE_MUTATION = `
  mutation BlackstarIssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { id identifier title url }
    }
  }
`;

const ISSUE_UPDATE_MUTATION = `
  mutation BlackstarIssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue { id identifier title url }
    }
  }
`;

export async function createLinearIssue(args: {
  userId: string;
  teamId: string;
  title: string;
  description?: string;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}) {
  const teamId = linearId(args.teamId, "team");
  const title = boundedIssueText(args.title, "issue title", 500, true)!;
  const description = boundedIssueText(args.description, "issue description", 10_000);
  const data = await linearQuery<any>({
    userId: args.userId,
    query: ISSUE_CREATE_MUTATION,
    variables: {
      input: {
        teamId,
        title,
        ...(description !== undefined ? { description } : {}),
      },
    },
    ...(args.signal ? { signal: args.signal } : {}),
    ...(args.fetchImpl ? { fetchImpl: args.fetchImpl } : {}),
  });
  if (data?.issueCreate?.success !== true || !data?.issueCreate?.issue?.id) {
    throw new LinearIntegrationError("Linear did not confirm issue creation.");
  }
  return {
    id: String(data.issueCreate.issue.id).slice(0, 100),
    identifier: data.issueCreate.issue.identifier ? String(data.issueCreate.issue.identifier).slice(0, 100) : null,
    title: String(data.issueCreate.issue.title ?? title).slice(0, 500),
    url: data.issueCreate.issue.url ? String(data.issueCreate.issue.url).slice(0, 2000) : null,
  };
}

export async function updateLinearIssue(args: {
  userId: string;
  issueId: string;
  title?: string;
  description?: string;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}) {
  const issueId = linearId(args.issueId, "issue");
  const title = boundedIssueText(args.title, "issue title", 500);
  const description = boundedIssueText(args.description, "issue description", 10_000);
  const input = {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
  };
  if (!Object.keys(input).length) throw new LinearIntegrationError("At least one Linear issue field is required.");
  const data = await linearQuery<any>({
    userId: args.userId,
    query: ISSUE_UPDATE_MUTATION,
    variables: { id: issueId, input },
    ...(args.signal ? { signal: args.signal } : {}),
    ...(args.fetchImpl ? { fetchImpl: args.fetchImpl } : {}),
  });
  if (data?.issueUpdate?.success !== true || !data?.issueUpdate?.issue?.id) {
    throw new LinearIntegrationError("Linear did not confirm issue update.");
  }
  return {
    id: String(data.issueUpdate.issue.id).slice(0, 100),
    identifier: data.issueUpdate.issue.identifier ? String(data.issueUpdate.issue.identifier).slice(0, 100) : null,
    title: String(data.issueUpdate.issue.title ?? title ?? "").slice(0, 500),
    url: data.issueUpdate.issue.url ? String(data.issueUpdate.issue.url).slice(0, 2000) : null,
  };
}
