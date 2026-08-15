import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";

type Sb = { from: (table: string) => any };
type ProjectScope = { id: string; user_id: string; org_id: string | null; name: string; status?: string };
type ResourceType = "agent" | "workflow";

const scopeSchema = z.object({ orgId: z.string().uuid().nullish() });
const statusSchema = z.enum(["active", "paused", "completed", "archived"]);
const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);
const resourceTypeSchema = z.enum(["agent", "workflow"]);

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

async function getProjectForMutation(sb: Sb, id: string, userId: string): Promise<ProjectScope> {
  const { data, error } = await sb
    .from("projects")
    .select("id,user_id,org_id,name,status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Project not found or access denied.");
  if (data.org_id) await requireOrgManager(sb, data.org_id, userId);
  else if (data.user_id !== userId) throw new Error("Project not found or access denied.");
  return data as ProjectScope;
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

async function resolveScopedResource(
  sb: Sb,
  project: ProjectScope,
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
) {
  const table = resourceType === "agent" ? "personal_agents" : "workflows";
  const fields = resourceType === "agent"
    ? "id,name,status,user_id,org_id,category"
    : "id,name,status,user_id,org_id,description";
  const { data, error } = await sb.from(table).select(fields).eq("id", resourceId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`${resourceType === "agent" ? "Agent" : "Workflow"} not found or access denied.`);

  const sameScope = project.org_id
    ? data.org_id === project.org_id
    : data.user_id === userId && !data.org_id;
  if (!sameScope) {
    throw new Error("That resource belongs to a different workspace and cannot be linked to this project.");
  }
  return data;
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

    const [{ data: activity, error: activityError }, { data: resources, error: resourceError }] = await Promise.all([
      sb.from("project_activity")
        .select("id,user_id,kind,message,metadata,created_at")
        .eq("project_id", data.id)
        .order("created_at", { ascending: false })
        .limit(50),
      sb.from("project_resources")
        .select("id,resource_type,resource_id,added_by,created_at")
        .eq("project_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (activityError) throw new Error(activityError.message);
    if (resourceError) throw new Error(resourceError.message);
    return { project, activity: activity ?? [], resources: resources ?? [] };
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
    if (data.name !== undefined) patch["name"] = data.name;
    if (data.description !== undefined) patch["description"] = data.description;
    if (data.status !== undefined) patch["status"] = data.status;
    if (data.priority !== undefined) patch["priority"] = data.priority;
    if (data.tags !== undefined) patch["tags"] = data.tags;
    if (data.dueAt !== undefined) patch["due_at"] = data.dueAt;
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

export const listProjectResources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: project, error: projectError } = await sb
      .from("projects")
      .select("id,user_id,org_id,name")
      .eq("id", data.projectId)
      .maybeSingle();
    if (projectError) throw new Error(projectError.message);
    if (!project) throw new Error("Project not found or access denied.");
    if (project.org_id) await requireOrgMember(sb, project.org_id, context.userId);
    else if (project.user_id !== context.userId) throw new Error("Project not found or access denied.");

    let agentsQuery = sb
      .from("personal_agents")
      .select("id,name,status,user_id,org_id,category")
      .order("name", { ascending: true })
      .limit(250);
    let workflowsQuery = sb
      .from("workflows")
      .select("id,name,status,user_id,org_id,description")
      .order("name", { ascending: true })
      .limit(250);
    if (project.org_id) {
      agentsQuery = agentsQuery.eq("org_id", project.org_id);
      workflowsQuery = workflowsQuery.eq("org_id", project.org_id);
    } else {
      agentsQuery = agentsQuery.eq("user_id", context.userId).is("org_id", null);
      workflowsQuery = workflowsQuery.eq("user_id", context.userId).is("org_id", null);
    }

    const [linksResult, agentsResult, workflowsResult] = await Promise.all([
      sb.from("project_resources")
        .select("id,resource_type,resource_id,added_by,created_at")
        .eq("project_id", data.projectId)
        .order("created_at", { ascending: false }),
      agentsQuery,
      workflowsQuery,
    ]);
    if (linksResult.error) throw new Error(linksResult.error.message);
    if (agentsResult.error) throw new Error(agentsResult.error.message);
    if (workflowsResult.error) throw new Error(workflowsResult.error.message);

    return {
      project,
      links: linksResult.data ?? [],
      agents: agentsResult.data ?? [],
      workflows: workflowsResult.data ?? [],
    };
  });

export const addProjectResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: z.string().uuid(),
      resourceType: resourceTypeSchema,
      resourceId: z.string().uuid(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await getProjectForMutation(sb, data.projectId, context.userId);
    const resource = await resolveScopedResource(
      sb,
      project,
      context.userId,
      data.resourceType,
      data.resourceId,
    );

    const { data: existing, error: existingError } = await sb
      .from("project_resources")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("resource_type", data.resourceType)
      .eq("resource_id", data.resourceId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) return existing;

    const { data: link, error } = await sb
      .from("project_resources")
      .insert({
        project_id: data.projectId,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        added_by: context.userId,
      })
      .select("id,resource_type,resource_id,created_at")
      .single();
    if (error) throw new Error(error.message);

    const label = data.resourceType === "agent" ? "agent" : "workflow";
    await addActivity(sb, context.userId, project.id, "resource_linked", `Linked ${label} “${resource.name}”.`);
    await writeAudit({
      userId: context.userId,
      orgId: project.org_id,
      action: "project_resource_linked",
      targetType: "project",
      targetId: project.id,
      metadata: { resourceType: data.resourceType, resourceId: data.resourceId },
    });
    return link;
  });

export const removeProjectResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid(), linkId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const project = await getProjectForMutation(sb, data.projectId, context.userId);
    const { data: link, error: linkError } = await sb
      .from("project_resources")
      .select("id,resource_type,resource_id")
      .eq("id", data.linkId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (linkError) throw new Error(linkError.message);
    if (!link) throw new Error("Project resource link not found.");

    const { error } = await sb
      .from("project_resources")
      .delete()
      .eq("id", data.linkId)
      .eq("project_id", data.projectId);
    if (error) throw new Error(error.message);

    await addActivity(sb, context.userId, project.id, "resource_unlinked", `Removed linked ${link.resource_type}.`);
    await writeAudit({
      userId: context.userId,
      orgId: project.org_id,
      action: "project_resource_unlinked",
      targetType: "project",
      targetId: project.id,
      metadata: { resourceType: link.resource_type, resourceId: link.resource_id },
    });
    return { ok: true };
  });
