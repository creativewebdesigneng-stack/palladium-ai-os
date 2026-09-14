import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";

type Sb = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

const projectIdSchema = z.string().uuid();
const branchSchema = z.string().trim().min(1).max(120);
const pathSchema = z.string().trim().min(1).max(500).refine(
  (value) => !value.startsWith("/") && !value.endsWith("/") && !/(^|\/)\.\.(\/|$)/.test(value),
  "Invalid repository path.",
);
const roleSchema = z.enum(["viewer", "contributor", "maintainer"]);

export const getRepositoryOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: projectIdSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const [{ data: project, error: projectError }, { data: branches, error: branchError }] = await Promise.all([
      sb.from("projects")
        .select("id,user_id,org_id,name,description,status,priority,tags,visibility,slug,default_branch,license,homepage_url,created_at,updated_at")
        .eq("id", data.projectId)
        .maybeSingle(),
      sb.from("project_repository_branches")
        .select("id,name,head_commit_id,protected,created_at,updated_at")
        .eq("project_id", data.projectId)
        .order("name", { ascending: true }),
    ]);
    if (projectError) throw new Error(projectError.message);
    if (!project) throw new Error("Repository not found or access denied.");
    if (branchError) throw new Error(branchError.message);

    return { project, branches: branches ?? [] };
  });

export const listRepositoryFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      branch: branchSchema.default("main"),
      prefix: z.string().trim().max(500).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let q = sb.from("project_repository_files")
      .select("id,path,mime_type,byte_size,content_hash,updated_by,updated_at")
      .eq("project_id", data.projectId)
      .eq("branch_name", data.branch)
      .order("path", { ascending: true })
      .limit(2000);
    if (data.prefix) q = q.like("path", `${data.prefix.replace(/[%_]/g, "")}%`);
    const { data: files, error } = await q;
    if (error) throw new Error(error.message);
    return files ?? [];
  });

export const readRepositoryFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: projectIdSchema, branch: branchSchema, path: pathSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: file, error } = await sb.from("project_repository_files")
      .select("id,path,content,mime_type,byte_size,content_hash,updated_by,updated_at")
      .eq("project_id", data.projectId)
      .eq("branch_name", data.branch)
      .eq("path", data.path)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!file) throw new Error("File not found or access denied.");
    return file;
  });

export const listRepositoryCommits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      branch: branchSchema.optional(),
      limit: z.number().int().min(1).max(100).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let q = sb.from("project_repository_commits")
      .select("id,parent_commit_id,branch_name,author_id,message,created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (data.branch) q = q.eq("branch_name", data.branch);
    const { data: commits, error } = await q;
    if (error) throw new Error(error.message);
    return commits ?? [];
  });

export const listCommitChanges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: projectIdSchema, commitId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb.from("project_repository_commit_files")
      .select("id,commit_id,path,content,mime_type,byte_size,content_hash,deleted")
      .eq("project_id", data.projectId)
      .eq("commit_id", data.commitId)
      .order("path", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const commitRepositoryFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      branch: branchSchema,
      path: pathSchema,
      content: z.string().max(1_048_576).nullable(),
      message: z.string().trim().min(1).max(500),
      mimeType: z.string().trim().min(1).max(120).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: commitId, error } = await sb.rpc("project_repository_commit_file", {
      p_project_id: data.projectId,
      p_branch_name: data.branch,
      p_path: data.path,
      p_content: data.content,
      p_message: data.message,
      p_mime_type: data.mimeType ?? "text/plain",
    });
    if (error) throw new Error(error.message);

    await writeAudit({
      userId: context.userId,
      orgId: null,
      action: data.content === null ? "project_repository_file_deleted" : "project_repository_file_committed",
      targetType: "project",
      targetId: data.projectId,
      metadata: { branch: data.branch, path: data.path, commitId },
    });
    return { commitId };
  });

export const listRepositoryCollaborators = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: projectIdSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: collaborators, error } = await sb.rpc("project_repository_list_collaborators", {
      p_project_id: data.projectId,
    });
    if (error) throw new Error(error.message);
    return collaborators ?? [];
  });

export const addRepositoryCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      email: z.string().trim().email().max(320),
      role: roleSchema,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: collaborator, error } = await sb.rpc("project_repository_add_collaborator_by_email", {
      p_project_id: data.projectId,
      p_email: data.email,
      p_role: data.role,
    });
    if (error) throw new Error(error.message);

    await writeAudit({
      userId: context.userId,
      orgId: null,
      action: "project_repository_collaborator_added",
      targetType: "project",
      targetId: data.projectId,
      metadata: { role: data.role },
    });
    return Array.isArray(collaborator) ? collaborator[0] : collaborator;
  });

export const updateRepositoryCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      userId: z.string().uuid(),
      role: roleSchema,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb.from("project_collaborators")
      .update({ role: data.role })
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId)
      .select("user_id,role")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: context.userId,
      orgId: null,
      action: "project_repository_collaborator_updated",
      targetType: "project",
      targetId: data.projectId,
      metadata: { collaboratorUserId: data.userId, role: data.role },
    });
    return row;
  });

export const removeRepositoryCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: projectIdSchema, userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("project_collaborators")
      .delete()
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: context.userId,
      orgId: null,
      action: "project_repository_collaborator_removed",
      targetType: "project",
      targetId: data.projectId,
      metadata: { collaboratorUserId: data.userId },
    });
    return { ok: true };
  });
