/**
 * Asana provider executor. Server-only and read-only.
 *
 * Uses explicit read scopes only. To work for free and paid Asana plans alike,
 * project/task filtering is performed locally over bounded list endpoints rather
 * than depending on premium workspace search APIs.
 */
import { getIntegrationAccessToken } from "./oauth.server";

const ASANA_API = "https://app.asana.com/api/1.0";
const MAX_PAGE = 100;

type FetchLike = typeof fetch;

export class AsanaIntegrationError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "AsanaIntegrationError";
  }
}

async function asanaFetch(
  userId: string,
  path: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  const token = await getIntegrationAccessToken(userId, "asana");
  if (!token) {
    throw new AsanaIntegrationError(
      "Asana is not connected, or the connection needs to be renewed.",
      401,
    );
  }
  const response = await fetchImpl(`${ASANA_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
  if (response.ok) return response;

  let reason = "Asana request failed.";
  try {
    const payload = (await response.json()) as any;
    const message = Array.isArray(payload?.errors) ? payload.errors[0]?.message : null;
    reason = String(message ?? payload?.message ?? reason);
  } catch {
    /* provider error body is optional */
  }
  throw new AsanaIntegrationError(reason.slice(0, 300), response.status);
}

function gid(value: string, label: string): string {
  const id = String(value ?? "").trim();
  if (!/^\d{1,30}$/.test(id)) throw new AsanaIntegrationError(`A valid Asana ${label} GID is required.`);
  return id;
}

function queryText(value: string): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
}

function nextOffset(payload: any): string | null {
  const offset = payload?.next_page?.offset;
  return typeof offset === "string" && offset ? offset.slice(0, 500) : null;
}

export type AsanaWorkspace = { gid: string; name: string; resourceType: string | null };

export async function listAsanaWorkspaces(args: {
  userId: string;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<{ workspaces: AsanaWorkspace[]; nextOffset: string | null }> {
  const limit = Math.min(Math.max(Number(args.limit ?? 50) || 50, 1), MAX_PAGE);
  const params = new URLSearchParams({ limit: String(limit), opt_fields: "name,resource_type" });
  const response = await asanaFetch(
    args.userId,
    `/workspaces?${params.toString()}`,
    { method: "GET", ...(args.signal ? { signal: args.signal } : {}) },
    args.fetchImpl ?? fetch,
  );
  const payload = (await response.json()) as any;
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return {
    workspaces: rows.slice(0, limit).map((row: any) => ({
      gid: String(row?.gid ?? "").slice(0, 50),
      name: String(row?.name ?? "Untitled workspace").slice(0, 300),
      resourceType: row?.resource_type ? String(row.resource_type).slice(0, 100) : null,
    })),
    nextOffset: nextOffset(payload),
  };
}

export type AsanaProject = {
  gid: string;
  name: string;
  archived: boolean;
  notes: string | null;
  color: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
  permalinkUrl: string | null;
};

async function projectsForWorkspace(args: {
  userId: string;
  workspaceId: string;
  signal?: AbortSignal;
  fetchImpl: FetchLike;
}): Promise<AsanaProject[]> {
  const params = new URLSearchParams({
    workspace: gid(args.workspaceId, "workspace"),
    archived: "false",
    limit: String(MAX_PAGE),
    opt_fields: "name,archived,notes,color,created_at,modified_at,permalink_url",
  });
  const response = await asanaFetch(
    args.userId,
    `/projects?${params.toString()}`,
    { method: "GET", ...(args.signal ? { signal: args.signal } : {}) },
    args.fetchImpl,
  );
  const payload = (await response.json()) as any;
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows.slice(0, MAX_PAGE).map((row: any) => ({
    gid: String(row?.gid ?? "").slice(0, 50),
    name: String(row?.name ?? "Untitled project").slice(0, 300),
    archived: row?.archived === true,
    notes: row?.notes ? String(row.notes).slice(0, 5000) : null,
    color: row?.color ? String(row.color).slice(0, 100) : null,
    createdAt: row?.created_at ? String(row.created_at).slice(0, 100) : null,
    modifiedAt: row?.modified_at ? String(row.modified_at).slice(0, 100) : null,
    permalinkUrl: row?.permalink_url ? String(row.permalink_url).slice(0, 2000) : null,
  }));
}

export async function searchAsanaProjects(args: {
  userId: string;
  query: string;
  workspaceId?: string;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<AsanaProject[]> {
  const query = queryText(args.query).toLocaleLowerCase();
  if (!query) throw new AsanaIntegrationError("An Asana project search query is required.");
  const limit = Math.min(Math.max(Number(args.limit ?? 20) || 20, 1), 50);
  const fetchImpl = args.fetchImpl ?? fetch;

  const workspaceIds = args.workspaceId
    ? [gid(args.workspaceId, "workspace")]
    : (await listAsanaWorkspaces({ userId: args.userId, limit: 10, ...(args.signal ? { signal: args.signal } : {}), fetchImpl })).workspaces
        .map((workspace) => workspace.gid)
        .filter((id) => /^\d{1,30}$/.test(id))
        .slice(0, 10);

  const matches: AsanaProject[] = [];
  for (const workspaceId of workspaceIds) {
    const projects = await projectsForWorkspace({
      userId: args.userId,
      workspaceId,
      ...(args.signal ? { signal: args.signal } : {}),
      fetchImpl,
    });
    for (const project of projects) {
      if (
        project.name.toLocaleLowerCase().includes(query) ||
        (project.notes ?? "").toLocaleLowerCase().includes(query)
      ) {
        matches.push(project);
        if (matches.length >= limit) return matches;
      }
    }
  }
  return matches.slice(0, limit);
}

export type AsanaTask = {
  gid: string;
  name: string;
  completed: boolean;
  notes: string | null;
  dueOn: string | null;
  dueAt: string | null;
  createdAt: string | null;
  modifiedAt: string | null;
  permalinkUrl: string | null;
  assigneeName: string | null;
};

export async function searchAsanaProjectTasks(args: {
  userId: string;
  projectId: string;
  query?: string;
  limit?: number;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}): Promise<AsanaTask[]> {
  const projectId = gid(args.projectId, "project");
  const query = queryText(args.query ?? "").toLocaleLowerCase();
  const limit = Math.min(Math.max(Number(args.limit ?? 50) || 50, 1), MAX_PAGE);
  const params = new URLSearchParams({
    limit: String(MAX_PAGE),
    opt_fields: "name,completed,notes,due_on,due_at,created_at,modified_at,permalink_url,assignee.name",
  });
  const response = await asanaFetch(
    args.userId,
    `/projects/${encodeURIComponent(projectId)}/tasks?${params.toString()}`,
    { method: "GET", ...(args.signal ? { signal: args.signal } : {}) },
    args.fetchImpl ?? fetch,
  );
  const payload = (await response.json()) as any;
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return rows
    .map((row: any): AsanaTask => ({
      gid: String(row?.gid ?? "").slice(0, 50),
      name: String(row?.name ?? "Untitled task").slice(0, 500),
      completed: row?.completed === true,
      notes: row?.notes ? String(row.notes).slice(0, 5000) : null,
      dueOn: row?.due_on ? String(row.due_on).slice(0, 100) : null,
      dueAt: row?.due_at ? String(row.due_at).slice(0, 100) : null,
      createdAt: row?.created_at ? String(row.created_at).slice(0, 100) : null,
      modifiedAt: row?.modified_at ? String(row.modified_at).slice(0, 100) : null,
      permalinkUrl: row?.permalink_url ? String(row.permalink_url).slice(0, 2000) : null,
      assigneeName: row?.assignee?.name ? String(row.assignee.name).slice(0, 300) : null,
    }))
    .filter((task: AsanaTask) =>
      query
        ? task.name.toLocaleLowerCase().includes(query) || (task.notes ?? "").toLocaleLowerCase().includes(query)
        : true,
    )
    .slice(0, limit);
}


function dueDate(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const date = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new AsanaIntegrationError("Asana due_on must use YYYY-MM-DD.");
  }
  return date;
}

function boundedTaskText(value: unknown, label: string, max: number, required = false): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new AsanaIntegrationError(`Asana ${label} is required.`);
    return undefined;
  }
  const text = String(value).replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  if (required && !text) throw new AsanaIntegrationError(`Asana ${label} is required.`);
  return text;
}

export async function createAsanaTask(args: {
  userId: string;
  workspaceId: string;
  name: string;
  projectId?: string;
  notes?: string;
  dueOn?: string;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}) {
  const workspace = gid(args.workspaceId, "workspace");
  const project = args.projectId ? gid(args.projectId, "project") : undefined;
  const name = boundedTaskText(args.name, "task name", 500, true)!;
  const notes = boundedTaskText(args.notes, "task notes", 5000);
  const dueOn = dueDate(args.dueOn);
  const data = {
    workspace,
    name,
    ...(project ? { projects: [project] } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(dueOn ? { due_on: dueOn } : {}),
  };
  const response = await asanaFetch(
    args.userId,
    "/tasks",
    {
      method: "POST",
      body: JSON.stringify({ data }),
      ...(args.signal ? { signal: args.signal } : {}),
    },
    args.fetchImpl ?? fetch,
  );
  const payload = await response.json() as any;
  return {
    gid: String(payload?.data?.gid ?? "").slice(0, 50),
    name: String(payload?.data?.name ?? name).slice(0, 500),
    permalinkUrl: payload?.data?.permalink_url ? String(payload.data.permalink_url).slice(0, 2000) : null,
  };
}

export async function updateAsanaTask(args: {
  userId: string;
  taskId: string;
  name?: string;
  notes?: string;
  completed?: boolean;
  dueOn?: string;
  signal?: AbortSignal;
  fetchImpl?: FetchLike;
}) {
  const taskId = gid(args.taskId, "task");
  const name = boundedTaskText(args.name, "task name", 500);
  const notes = boundedTaskText(args.notes, "task notes", 5000);
  const dueOn = dueDate(args.dueOn);
  const data: Record<string, unknown> = {
    ...(name !== undefined ? { name } : {}),
    ...(notes !== undefined ? { notes } : {}),
    ...(typeof args.completed === "boolean" ? { completed: args.completed } : {}),
    ...(dueOn ? { due_on: dueOn } : {}),
  };
  if (!Object.keys(data).length) throw new AsanaIntegrationError("At least one Asana task field is required.");
  const response = await asanaFetch(
    args.userId,
    `/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "PUT",
      body: JSON.stringify({ data }),
      ...(args.signal ? { signal: args.signal } : {}),
    },
    args.fetchImpl ?? fetch,
  );
  const payload = await response.json() as any;
  return {
    gid: String(payload?.data?.gid ?? taskId).slice(0, 50),
    name: payload?.data?.name ? String(payload.data.name).slice(0, 500) : name ?? null,
    completed: typeof payload?.data?.completed === "boolean" ? payload.data.completed : args.completed ?? null,
    permalinkUrl: payload?.data?.permalink_url ? String(payload.data.permalink_url).slice(0, 2000) : null,
  };
}
