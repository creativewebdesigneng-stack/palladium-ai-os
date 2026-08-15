import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";

type Sb = { from: (table: string) => any };

const scopeSchema = z.object({ orgId: z.string().uuid().nullish() });
const statusSchema = z.enum(["active", "paused", "completed", "archived"]);
const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);

async function requireOrgMember(sb: Sb, orgId: string, userId: string) {
  const { data, error } = await sb
    .from("organisation_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("You do not have access to this workspace.");
  return data.role as string;
}

async function requireOrgManager(sb: Sb, orgId: string, userId: string) {
  const role = await requireOrgMember(sb, orgId, userId);
  if (!["owner", "admin"].includes(role)) {
    throw new Error("Only workspace owners and admins can change organisation projects.");
  }
}

async function getProjectForMutation(sb: Sb, id: string, userId: string) {
  const { data, error } = await sb
    .from("projects")
    .select("id,user_id,org_id,name,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Project not found or access denied.");
  if (data.org_id) await requireOrgManager(sb, data.org_id, userId);
  else if (data.user_id !== userId) throw new Error("Project not found or access denied.");
  return data;
}

async function addActivity(sb: Sb, userId: string, projectId: string, kind: string, message: string) {
  const { error } = await sb.from("project_activity").insert({
    project_id: projectId,
    user_id: userId,
    kind,
    message,
  });
  if (error) throw new Error(error.message);
}

export const listProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    scopeSchema.extend({ includeArchived: z.boolean().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (data.orgId) await requireOrgMember(sb, data.orgId, context.userId);

    let q = sb
      .from("projects")
      .select("id,user_id,org_id,name,description,status,priority,tags,due_at,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    q = data.orgId ? q.eq("org_id", data.orgId) : q.is("org_id", null).eq("user_id", context.userId);
    if (!data.includeArchived) q = q.neq("status", "archived");
    const { data: projects, error } = await q;
    if (error) throw new Error(error.message);
    return { projects: projects ?? [] };
  });

export const getProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: project, error } = await sb
      .from("projects")
      .select("id,user_id,org_id,name,description,status,priority,tags,due_at,created_at,updated_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) throw new Error("Project not found or access denied.");

    const { data: activity, error: activityError } = await sb
      .from("project_activity")
      .select("id,user_id,kind,message,metadata,created_at")
      .eq("project_id", data.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (activityError) throw new Error(activityError.message);
    return { project, activity: activity ?? [] };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    scopeSchema
      .extend({
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(2000).nullish(),
        priority: prioritySchema.optional(),
        tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
        dueAt: z.string().datetime().nullish(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    if (data.orgId) await requireOrgMember(sb, data.orgId, context.userId);

    const { data: project, error } = await sb
      .from("projects")
      .insert({
        user_id: context.userId,
        org_id: data.orgId ?? null,
        name: data.name,
        description: data.description ?? null,
        priority: data.priority ?? "normal",
        tags: data.tags ?? [],
        due_at: data.dueAt ?? null,
      })
      .select("id,user_id,org_id,name,description,status,priority,tags,due_at,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);

    await addActivity(sb, context.userId, project.id, "created", `Created project “${project.name}”.`);
    await writeAudit({
      userId: context.userId,
      orgId: project.org_id,
      action: "project_created",
      targetType: "project",
      targetId: project.id,
      metadata: { name: project.name },
    });
    return project;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(120).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
        status: statusSchema.optional(),
        priority: prioritySchema.optional(),
        tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
        dueAt: z.string().datetime().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const existing = await getProjectForMutation(sb, data.id, context.userId);
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;
    if (data.status !== undefined) patch.status = data.status;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.dueAt !== undefined) patch.due_at = data.dueAt;
    if (Object.keys(patch).length === 0) return existing;

    const { data: project, error } = await sb
      .from("projects")
      .update(patch)
      .eq("id", data.id)
      .select("id,user_id,org_id,name,description,status,priority,tags,due_at,created_at,updated_at")
      .single();
    if (error) throw new Error(error.message);

    await addActivity(sb, context.userId, project.id, "updated", `Updated project “${project.name}”.`);
    await writeAudit({
      userId: context.userId,
      orgId: project.org_id,
      action: "project_updated",
      targetType: "project",
      targetId: project.id,
      metadata: { fields: Object.keys(patch) },
    });
    return project;
  });

export const archiveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const existing = await getProjectForMutation(sb, data.id, context.userId);
    const { data: project, error } = await sb
      .from("projects")
      .update({ status: "archived" })
      .eq("id", data.id)
      .select("id,name,org_id,status")
      .single();
    if (error) throw new Error(error.message);

    await addActivity(sb, context.userId, data.id, "archived", `Archived project “${existing.name}”.`);
    await writeAudit({
      userId: context.userId,
      orgId: project.org_id,
      action: "project_archived",
      targetType: "project",
      targetId: data.id,
    });
    return project;
  });
