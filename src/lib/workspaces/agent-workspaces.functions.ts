import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ingestDocument } from "@/lib/memory/memory.server";

type Sb = { from: (table: string) => any };

const workspaceInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  objective: z.string().max(20_000).default(""),
  projectId: z.string().uuid().nullable().optional(),
  agentId: z.string().uuid().nullable().optional(),
  isolationMode: z.enum(["shared", "worktree"]).default("shared"),
  branchName: z.string().trim().max(200).nullable().optional(),
  status: z.enum(["draft", "running", "paused", "completed", "archived"]).default("draft"),
  runtimeTaskId: z.string().uuid().nullable().optional(),
});

const cardInput = z.object({
  id: z.string().uuid().optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  cardKind: z.enum(["note", "task", "event", "progress", "metric", "link", "person", "place", "insight"]).default("note"),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(100_000).default(""),
  occurredAt: z.string().datetime().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  sourceKind: z.enum(["manual", "agent", "workflow", "project", "memory", "knowledge"]).default("manual"),
  sourceId: z.string().max(200).nullable().optional(),
  pinned: z.boolean().default(false),
});

function workspaceDto(row: any) {
  return {
    id: String(row.id),
    project_id: row.project_id ? String(row.project_id) : null,
    agent_id: row.agent_id ? String(row.agent_id) : null,
    title: String(row.title ?? "Untitled workspace"),
    objective: String(row.objective ?? ""),
    isolation_mode: String(row.isolation_mode ?? "shared"),
    branch_name: row.branch_name ? String(row.branch_name) : null,
    status: String(row.status ?? "draft"),
    runtime_task_id: row.runtime_task_id ? String(row.runtime_task_id) : null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

function cardDto(row: any) {
  return {
    id: String(row.id),
    workspace_id: row.workspace_id ? String(row.workspace_id) : null,
    card_kind: String(row.card_kind ?? "note"),
    title: String(row.title ?? "Untitled context"),
    body: String(row.body ?? ""),
    occurred_at: row.occurred_at ? String(row.occurred_at) : null,
    tags: Array.isArray(row.tags) ? row.tags.map(String).slice(0, 30) : [],
    source_kind: String(row.source_kind ?? "manual"),
    source_id: row.source_id ? String(row.source_id) : null,
    knowledge_document_id: row.knowledge_document_id ? String(row.knowledge_document_id) : null,
    pinned: Boolean(row.pinned),
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

export const listAgentWorkspaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string; limit?: number } = {}) => ({
    status: String(input.status ?? "").trim(),
    limit: Math.min(Math.max(Number(input.limit ?? 100) || 100, 1), 300),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let query = sb.from("agent_workspaces").select("*").eq("user_id", context.userId).order("updated_at", { ascending: false }).limit(data.limit);
    if (["draft", "running", "paused", "completed", "archived"].includes(data.status)) query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { workspaces: (rows ?? []).map(workspaceDto) };
  });

export const saveAgentWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => workspaceInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      title: data.title,
      objective: data.objective,
      project_id: data.projectId ?? null,
      agent_id: data.agentId ?? null,
      isolation_mode: data.isolationMode,
      branch_name: data.branchName || null,
      status: data.status,
      runtime_task_id: data.runtimeTaskId ?? null,
      updated_at: new Date().toISOString(),
    };
    const result = data.id
      ? await sb.from("agent_workspaces").update(row).eq("id", data.id).eq("user_id", context.userId).select("*").single()
      : await sb.from("agent_workspaces").insert({ ...row, user_id: context.userId, org_id: null }).select("*").single();
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Could not save workspace.");
    return { workspace: workspaceDto(result.data) };
  });

export const listContextTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { workspaceId?: string | null; query?: string; limit?: number } = {}) => ({
    workspaceId: input.workspaceId ? z.string().uuid().parse(input.workspaceId) : null,
    query: String(input.query ?? "").trim().slice(0, 160),
    limit: Math.min(Math.max(Number(input.limit ?? 200) || 200, 1), 500),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let query = sb.from("context_timeline_cards").select("*").eq("user_id", context.userId).order("pinned", { ascending: false }).order("occurred_at", { ascending: false }).limit(data.limit);
    if (data.workspaceId) query = query.eq("workspace_id", data.workspaceId);
    if (data.query) {
      const safe = data.query.replace(/[%,()]/g, " ");
      query = query.or(`title.ilike.%${safe}%,body.ilike.%${safe}%`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { cards: (rows ?? []).map(cardDto) };
  });

export const saveContextCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cardInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      workspace_id: data.workspaceId ?? null,
      card_kind: data.cardKind,
      title: data.title,
      body: data.body,
      occurred_at: data.occurredAt ?? new Date().toISOString(),
      tags: [...new Set(data.tags.map((tag) => tag.toLowerCase()))],
      source_kind: data.sourceKind,
      source_id: data.sourceId ?? null,
      pinned: data.pinned,
      updated_at: new Date().toISOString(),
    };
    const result = data.id
      ? await sb.from("context_timeline_cards").update(row).eq("id", data.id).eq("user_id", context.userId).select("*").single()
      : await sb.from("context_timeline_cards").insert({ ...row, user_id: context.userId, org_id: null }).select("*").single();
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Could not save context card.");
    return { card: cardDto(result.data) };
  });

export const promoteContextCardToKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: card, error } = await sb.from("context_timeline_cards").select("id,title,body,card_kind").eq("id", data.id).eq("user_id", context.userId).single();
    if (error || !card) throw new Error(error?.message ?? "Context card not found.");
    if (!String(card.body ?? "").trim()) throw new Error("Add context before promoting this card to Knowledge.");
    const indexed = await ingestDocument({
      sb,
      userId: context.userId,
      input: {
        title: String(card.title ?? "Untitled context"),
        text: String(card.body),
        org_id: null,
        agent_id: null,
        storage_path: null,
        mime_type: "text/markdown",
        size_bytes: String(card.body).length,
        source: `context-card:${card.id}`,
        scope: "private",
      },
    });
    await sb.from("context_timeline_cards").update({ knowledge_document_id: indexed.document.id, updated_at: new Date().toISOString() }).eq("id", card.id).eq("user_id", context.userId);
    return { ok: true, documentId: String(indexed.document.id), chunks: Number(indexed.chunks ?? 0) };
  });
