import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";

type Sb = { from: (table: string) => any };
type ProjectScope = { id: string; user_id: string; org_id: string | null; name: string };

const uuid = z.string().uuid();
const itemStatus = z.enum(["backlog", "todo", "in_progress", "in_review", "done", "cancelled"]);
const priority = z.enum(["low", "normal", "high", "urgent"]);
const cycleStatus = z.enum(["planned", "active", "completed", "cancelled"]);
const moduleStatus = z.enum(["backlog", "planned", "in_progress", "completed", "cancelled"]);
const assigneeType = z.enum(["unassigned", "human", "agent"]);

async function requireProjectAccess(sb: Sb, projectId: string, userId: string): Promise<ProjectScope> {
  const { data: project, error } = await sb
    .from("projects")
    .select("id,user_id,org_id,name")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) throw new Error("Project not found or access denied.");
  if (!project.org_id) {
    if (project.user_id !== userId) throw new Error("Project not found or access denied.");
    return project as ProjectScope;
  }
  const { data: member, error: memberError } = await sb
    .from("organisation_members")
    .select("role")
    .eq("org_id", project.org_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (memberError) throw new Error(memberError.message);
  if (!member) throw new Error("Project not found or access denied.");
  return project as ProjectScope;
}

async function activity(sb: Sb, userId: string, projectId: string, kind: string, message: string, metadata: Record<string, unknown> = {}) {
  const { error } = await sb.from("project_activity").insert({ project_id: projectId, user_id: userId, kind, message, metadata });
  if (error) throw new Error(error.message);
}

export const listProjectWorkOS = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await requireProjectAccess(sb, data.projectId, context.userId);
    const [cycles, modules, items] = await Promise.all([
      sb.from("project_cycles").select("id,project_id,name,goal,status,starts_at,ends_at,metadata,created_at,updated_at").eq("project_id", data.projectId).order("starts_at", { ascending: false, nullsFirst: false }).limit(100),
      sb.from("project_modules").select("id,project_id,name,description,status,target_at,metadata,created_at,updated_at").eq("project_id", data.projectId).order("created_at", { ascending: true }).limit(200),
      sb.from("project_work_items").select("id,project_id,cycle_id,module_id,parent_id,title,description,status,priority,estimate,assignee_type,assignee_id,sort_order,starts_at,due_at,completed_at,labels,metadata,created_at,updated_at").eq("project_id", data.projectId).order("sort_order", { ascending: true }).order("created_at", { ascending: true }).limit(1000),
    ]);
    if (cycles.error) throw new Error(cycles.error.message);
    if (modules.error) throw new Error(modules.error.message);
    if (items.error) throw new Error(items.error.message);
    return { project, cycles: cycles.data ?? [], modules: modules.data ?? [], items: items.data ?? [] };
  });

export const createProjectCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    projectId: uuid,
    name: z.string().trim().min(1).max(120),
    goal: z.string().trim().max(2000).nullish(),
    status: cycleStatus.optional(),
    startsAt: z.string().datetime().nullish(),
    endsAt: z.string().datetime().nullish(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await requireProjectAccess(sb, data.projectId, context.userId);
    const { data: cycle, error } = await sb.from("project_cycles").insert({
      project_id: data.projectId,
      created_by: context.userId,
      name: data.name,
      goal: data.goal ?? null,
      status: data.status ?? "planned",
      starts_at: data.startsAt ?? null,
      ends_at: data.endsAt ?? null,
    }).select("id,project_id,name,goal,status,starts_at,ends_at,metadata,created_at,updated_at").single();
    if (error) throw new Error(error.message);
    await activity(sb, context.userId, project.id, "cycle_created", `Created cycle “${cycle.name}”.`, { cycleId: cycle.id });
    await writeAudit({ userId: context.userId, orgId: project.org_id, action: "project_cycle_created", targetType: "project", targetId: project.id, metadata: { cycleId: cycle.id } });
    return cycle;
  });

export const createProjectModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    projectId: uuid,
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).nullish(),
    status: moduleStatus.optional(),
    targetAt: z.string().datetime().nullish(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await requireProjectAccess(sb, data.projectId, context.userId);
    const { data: module, error } = await sb.from("project_modules").insert({
      project_id: data.projectId,
      created_by: context.userId,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? "planned",
      target_at: data.targetAt ?? null,
    }).select("id,project_id,name,description,status,target_at,metadata,created_at,updated_at").single();
    if (error) throw new Error(error.message);
    await activity(sb, context.userId, project.id, "module_created", `Created module “${module.name}”.`, { moduleId: module.id });
    await writeAudit({ userId: context.userId, orgId: project.org_id, action: "project_module_created", targetType: "project", targetId: project.id, metadata: { moduleId: module.id } });
    return module;
  });

export const createProjectWorkItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    projectId: uuid,
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().max(5000).nullish(),
    cycleId: uuid.nullish(),
    moduleId: uuid.nullish(),
    parentId: uuid.nullish(),
    status: itemStatus.optional(),
    priority: priority.optional(),
    estimate: z.number().min(0).max(100000).nullish(),
    assigneeType: assigneeType.optional(),
    assigneeId: uuid.nullish(),
    startsAt: z.string().datetime().nullish(),
    dueAt: z.string().datetime().nullish(),
    labels: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  }).superRefine((value, ctx) => {
    if ((value.assigneeType ?? "unassigned") === "unassigned" && value.assigneeId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["assigneeId"], message: "Unassigned work cannot have an assignee." });
    }
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await requireProjectAccess(sb, data.projectId, context.userId);
    const { data: item, error } = await sb.from("project_work_items").insert({
      project_id: data.projectId,
      created_by: context.userId,
      title: data.title,
      description: data.description ?? null,
      cycle_id: data.cycleId ?? null,
      module_id: data.moduleId ?? null,
      parent_id: data.parentId ?? null,
      status: data.status ?? "backlog",
      priority: data.priority ?? "normal",
      estimate: data.estimate ?? null,
      assignee_type: data.assigneeType ?? "unassigned",
      assignee_id: data.assigneeId ?? null,
      starts_at: data.startsAt ?? null,
      due_at: data.dueAt ?? null,
      labels: data.labels ?? [],
    }).select("id,project_id,cycle_id,module_id,parent_id,title,description,status,priority,estimate,assignee_type,assignee_id,sort_order,starts_at,due_at,completed_at,labels,metadata,created_at,updated_at").single();
    if (error) throw new Error(error.message);
    await activity(sb, context.userId, project.id, "work_item_created", `Created work item “${item.title}”.`, { workItemId: item.id });
    await writeAudit({ userId: context.userId, orgId: project.org_id, action: "project_work_item_created", targetType: "project", targetId: project.id, metadata: { workItemId: item.id } });
    return item;
  });

export const updateProjectWorkItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: uuid,
    projectId: uuid,
    title: z.string().trim().min(1).max(240).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    cycleId: uuid.nullable().optional(),
    moduleId: uuid.nullable().optional(),
    parentId: uuid.nullable().optional(),
    status: itemStatus.optional(),
    priority: priority.optional(),
    estimate: z.number().min(0).max(100000).nullable().optional(),
    assigneeType: assigneeType.optional(),
    assigneeId: uuid.nullable().optional(),
    sortOrder: z.number().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    dueAt: z.string().datetime().nullable().optional(),
    labels: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await requireProjectAccess(sb, data.projectId, context.userId);
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.cycleId !== undefined) patch.cycle_id = data.cycleId;
    if (data.moduleId !== undefined) patch.module_id = data.moduleId;
    if (data.parentId !== undefined) patch.parent_id = data.parentId;
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.completed_at = data.status === "done" ? new Date().toISOString() : null;
    }
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.estimate !== undefined) patch.estimate = data.estimate;
    if (data.assigneeType !== undefined) patch.assignee_type = data.assigneeType;
    if (data.assigneeId !== undefined) patch.assignee_id = data.assigneeId;
    if (data.sortOrder !== undefined) patch.sort_order = data.sortOrder;
    if (data.startsAt !== undefined) patch.starts_at = data.startsAt;
    if (data.dueAt !== undefined) patch.due_at = data.dueAt;
    if (data.labels !== undefined) patch.labels = data.labels;
    if (Object.keys(patch).length === 0) return { id: data.id };
    const { data: item, error } = await sb.from("project_work_items")
      .update(patch)
      .eq("id", data.id)
      .eq("project_id", data.projectId)
      .select("id,project_id,cycle_id,module_id,parent_id,title,description,status,priority,estimate,assignee_type,assignee_id,sort_order,starts_at,due_at,completed_at,labels,metadata,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);
    await activity(sb, context.userId, project.id, "work_item_updated", `Updated work item “${item.title}”.`, { workItemId: item.id, fields: Object.keys(patch) });
    await writeAudit({ userId: context.userId, orgId: project.org_id, action: "project_work_item_updated", targetType: "project", targetId: project.id, metadata: { workItemId: item.id, fields: Object.keys(patch) } });
    return item;
  });
