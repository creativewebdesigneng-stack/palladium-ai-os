import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listAsanaWorkspaces,
  searchAsanaProjects,
  searchAsanaProjectTasks,
} from "./asana.server";

function limit(value: unknown, fallback: number, max: number): number {
  return Math.min(Math.max(Number(value ?? fallback) || fallback, 1), max);
}

function optionalGid(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const id = String(value).trim();
  if (!/^\d{1,30}$/.test(id)) throw new Error(`A valid Asana ${label} GID is required`);
  return id;
}

export const listConnectedAsanaWorkspaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number }) => ({ limit: limit(input?.limit, 50, 100) }))
  .handler(async ({ data, context }) =>
    listAsanaWorkspaces({ userId: context.userId, limit: data.limit }),
  );

export const searchConnectedAsanaProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; workspaceId?: string; limit?: number }) => {
    const query = String(input?.query ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 300);
    if (!query) throw new Error("An Asana project search query is required");
    return {
      query,
      workspaceId: optionalGid(input?.workspaceId, "workspace"),
      limit: limit(input?.limit, 20, 50),
    };
  })
  .handler(async ({ data, context }) =>
    searchAsanaProjects({
      userId: context.userId,
      query: data.query,
      ...(data.workspaceId ? { workspaceId: data.workspaceId } : {}),
      limit: data.limit,
    }),
  );

export const searchConnectedAsanaProjectTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; query?: string; limit?: number }) => {
    const projectId = optionalGid(input?.projectId, "project");
    if (!projectId) throw new Error("A valid Asana project GID is required");
    const query = String(input?.query ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, 300);
    return {
      projectId,
      query,
      limit: limit(input?.limit, 50, 100),
    };
  })
  .handler(async ({ data, context }) =>
    searchAsanaProjectTasks({
      userId: context.userId,
      projectId: data.projectId,
      ...(data.query ? { query: data.query } : {}),
      limit: data.limit,
    }),
  );
