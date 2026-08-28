import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import type { ToolContext } from "@/lib/runtime/tools-core.server";

const actions = ["list_workspaces", "create_workspace", "list_context", "create_context"] as const;
type Action = (typeof actions)[number];

export const AGENT_WORKSPACE_TOOL_DEF: ToolDef = {
  name: "agent_workspace",
  description: "Create and inspect PalladiumAI agent workspaces and context timeline cards. Use worktree isolation metadata for parallel coding plans and timeline cards for durable operator context. This tool does not execute shell commands, mutate Git, or bypass approvals.",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: [...actions] },
      workspace_id: { type: "string" },
      title: { type: "string" },
      objective: { type: "string" },
      isolation_mode: { type: "string", enum: ["shared", "worktree"] },
      branch_name: { type: "string" },
      card_kind: { type: "string", enum: ["note", "task", "event", "progress", "metric", "link", "person", "place", "insight"] },
      body: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["action"],
    additionalProperties: false,
  },
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";
}

function action(value: unknown): Action {
  const selected = clean(value, 40) as Action;
  if (!actions.includes(selected)) throw new Error("Unsupported agent workspace action.");
  return selected;
}

function uuid(value: unknown) {
  const text = clean(value, 60);
  if (!/^[0-9a-f-]{36}$/i.test(text)) throw new Error("A valid workspace ID is required.");
  return text;
}

export async function runAgentWorkspaceTool(input: Record<string, unknown>, ctx: ToolContext) {
  const selected = action(input["action"]);
  const sb = ctx.sb;

  if (selected === "list_workspaces") {
    const { data, error } = await sb.from("agent_workspaces")
      .select("id,title,objective,isolation_mode,branch_name,status,runtime_task_id,updated_at")
      .eq("user_id", ctx.userId).order("updated_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return { workspaces: (data ?? []).map((row: any) => ({
      id: String(row.id), title: String(row.title), objective: String(row.objective ?? ""),
      isolation_mode: String(row.isolation_mode ?? "shared"), branch_name: row.branch_name ? String(row.branch_name) : null,
      status: String(row.status ?? "draft"), runtime_task_id: row.runtime_task_id ? String(row.runtime_task_id) : null,
      updated_at: row.updated_at ? String(row.updated_at) : null,
    })) };
  }

  if (selected === "list_context") {
    const workspaceId = input["workspace_id"] ? uuid(input["workspace_id"]) : null;
    let query = sb.from("context_timeline_cards")
      .select("id,workspace_id,card_kind,title,body,tags,source_kind,knowledge_document_id,occurred_at")
      .eq("user_id", ctx.userId).order("occurred_at", { ascending: false }).limit(200);
    if (workspaceId) query = query.eq("workspace_id", workspaceId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { cards: (data ?? []).map((row: any) => ({
      id: String(row.id), workspace_id: row.workspace_id ? String(row.workspace_id) : null,
      card_kind: String(row.card_kind ?? "note"), title: String(row.title), body: String(row.body ?? ""),
      tags: Array.isArray(row.tags) ? row.tags.map(String).slice(0, 30) : [], source_kind: String(row.source_kind ?? "manual"),
      knowledge_document_id: row.knowledge_document_id ? String(row.knowledge_document_id) : null,
      occurred_at: row.occurred_at ? String(row.occurred_at) : null,
    })) };
  }

  if (selected === "create_workspace") {
    const isolation = clean(input["isolation_mode"], 20) || "shared";
    if (!["shared", "worktree"].includes(isolation)) throw new Error("Unsupported isolation mode.");
    const { data, error } = await sb.from("agent_workspaces").insert({
      user_id: ctx.userId,
      org_id: ctx.orgId ?? null,
      title: clean(input["title"], 200) || "Untitled workspace",
      objective: clean(input["objective"], 20_000),
      isolation_mode: isolation,
      branch_name: clean(input["branch_name"], 200) || null,
      status: "draft",
      metadata: {},
    }).select("id,title,objective,isolation_mode,branch_name,status,updated_at").single();
    if (error || !data) throw new Error(error?.message ?? "Could not create workspace.");
    return { workspace: data };
  }

  const kind = clean(input["card_kind"], 30) || "note";
  if (!["note", "task", "event", "progress", "metric", "link", "person", "place", "insight"].includes(kind)) throw new Error("Unsupported context card kind.");
  const tags = Array.isArray(input["tags"])
    ? [...new Set(input["tags"].map((tag) => clean(tag, 40)).filter(Boolean))].slice(0, 30)
    : [];
  const { data, error } = await sb.from("context_timeline_cards").insert({
    user_id: ctx.userId,
    org_id: ctx.orgId ?? null,
    workspace_id: input["workspace_id"] ? uuid(input["workspace_id"]) : null,
    card_kind: kind,
    title: clean(input["title"], 200) || "Untitled context",
    body: clean(input["body"], 100_000),
    tags,
    source_kind: "agent",
    source_id: ctx.agentId ?? null,
    metadata: {},
  }).select("id,workspace_id,card_kind,title,body,tags,source_kind,occurred_at").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create context card.");
  return { card: data };
}
