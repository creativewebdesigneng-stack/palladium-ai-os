import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };

export type SearchResult = {
  type: "project" | "agent" | "task" | "workflow" | "file";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

type SearchRows = {
  projects?: any[];
  agents?: any[];
  tasks?: any[];
  workflows?: any[];
  documents?: any[];
};

const inputSchema = z.object({
  query: z.string().trim().min(2).max(120),
  limit: z.number().int().min(1).max(30).optional(),
});

const text = (value: unknown) => (typeof value === "string" ? value : "");
const includesNeedle = (needle: string, ...values: unknown[]) =>
  values.some((value) => text(value).toLowerCase().includes(needle));

/**
 * Convert already-authorised rows into navigation-safe search results.
 *
 * The query is treated only as plain text; it never becomes SQL/PostgREST
 * syntax. Keeping this helper pure also lets the safety boundary be regression
 * tested independently of TanStack middleware plumbing.
 */
export function matchWorkspaceRows(
  rows: SearchRows,
  query: string,
  limit = 20,
): SearchResult[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];

  const results: SearchResult[] = [];

  for (const row of rows.projects ?? []) {
    if (!includesNeedle(needle, row.name, row.description, row.status)) continue;
    results.push({
      type: "project",
      id: String(row.id),
      title: text(row.name) || "Untitled project",
      subtitle: ["Project", text(row.status)].filter(Boolean).join(" · "),
      href: "/projects",
    });
  }

  for (const row of rows.agents ?? []) {
    if (!includesNeedle(needle, row.name, row.description, row.category, row.status)) continue;
    results.push({
      type: "agent",
      id: String(row.id),
      title: text(row.name) || "Untitled agent",
      subtitle: ["Agent", text(row.category), text(row.status)].filter(Boolean).join(" · "),
      href: `/agents/${String(row.id)}`,
    });
  }

  for (const row of rows.tasks ?? []) {
    if (!includesNeedle(needle, row.title, row.input, row.status)) continue;
    results.push({
      type: "task",
      id: String(row.id),
      title: text(row.title) || text(row.input).slice(0, 80) || "Task",
      subtitle: ["Task", text(row.status)].filter(Boolean).join(" · "),
      href: "/tasks",
    });
  }

  for (const row of rows.workflows ?? []) {
    if (!includesNeedle(needle, row.name, row.description, row.status, row.trigger_type)) continue;
    results.push({
      type: "workflow",
      id: String(row.id),
      title: text(row.name) || "Untitled workflow",
      subtitle: ["Workflow", text(row.status), text(row.trigger_type)].filter(Boolean).join(" · "),
      href: "/workflows",
    });
  }

  for (const row of rows.documents ?? []) {
    const source = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? text((row.metadata as Record<string, unknown>)["source"])
      : "";
    if (!includesNeedle(needle, row.title, row.mime_type, source)) continue;
    results.push({
      type: "file",
      id: String(row.id),
      title: text(row.title) || "Untitled file",
      subtitle: ["File", text(row.mime_type), source].filter(Boolean).join(" · "),
      href: "/files",
    });
  }

  return results.slice(0, Math.max(0, Math.min(limit, 30)));
}

/**
 * Small global-search surface for the command menu.
 *
 * The authenticated Supabase client is supplied by middleware and RLS decides
 * which rows the caller may see. We intentionally do not interpolate the user
 * query into PostgREST filter syntax: each source is capped, then matched in
 * server memory. That keeps punctuation in a search term from becoming query
 * syntax and keeps the response bounded.
 */
export const searchWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const sourceLimit = 100;

    const [projects, agents, tasks, workflows, documents] = await Promise.all([
      sb.from("projects")
        .select("id,name,description,status,updated_at")
        .order("updated_at", { ascending: false })
        .limit(sourceLimit),
      sb.from("personal_agents")
        .select("id,name,description,category,status,updated_at")
        .order("updated_at", { ascending: false })
        .limit(sourceLimit),
      sb.from("agent_tasks")
        .select("id,title,input,status,agent_id,updated_at,created_at")
        .order("updated_at", { ascending: false })
        .limit(sourceLimit),
      sb.from("workflows")
        .select("id,name,description,status,trigger_type,updated_at")
        .order("updated_at", { ascending: false })
        .limit(sourceLimit),
      sb.from("memory_documents")
        .select("id,title,mime_type,metadata,created_at")
        .order("created_at", { ascending: false })
        .limit(sourceLimit),
    ]);

    for (const result of [projects, agents, tasks, workflows, documents]) {
      if (result.error) throw new Error(result.error.message);
    }

    return {
      results: matchWorkspaceRows(
        {
          projects: projects.data ?? [],
          agents: agents.data ?? [],
          tasks: tasks.data ?? [],
          workflows: workflows.data ?? [],
          documents: documents.data ?? [],
        },
        data.query,
        data.limit ?? 20,
      ),
    };
  });
