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

async function requireRepositoryManager(sb: Sb, projectId: string, userId: string) {
  const { data: project, error } = await sb.from("projects")
    .select("id,user_id,org_id")
    .eq("id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!project) throw new Error("Repository not found or access denied.");
  if (!project.org_id) {
    if (project.user_id !== userId) throw new Error("Only the repository owner can manage collaborators.");
    return project;
  }
  const { data: membership, error: membershipError } = await sb.from("organisation_members")
    .select("role")
    .eq("org_id", project.org_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new Error("Only workspace owners and admins can manage repository collaborators.");
  }
  return project;
}

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
    await requireRepositoryManager(sb, data.projectId, context.userId);
    const { data: collaborators, error } = await sb.from("project_collaborators")
      .select("user_id,role,created_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (collaborators ?? []).map((row: { user_id: string }) => row.user_id);
    if (!ids.length) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name")
      .in("id", ids);
    if (profileError) throw new Error(profileError.message);
    const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    return (collaborators ?? []).map((row: any) => ({
      ...row,
      email: profileMap.get(row.user_id)?.email ?? null,
      full_name: profileMap.get(row.user_id)?.full_name ?? null,
    }));
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
    const project = await requireRepositoryManager(sb, data.projectId, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name")
      .eq("email", data.email.toLowerCase())
      .maybeSingle();
    if (targetError) throw new Error(targetError.message);
    if (!target) throw new Error("No Blackstar account uses that email address yet.");
    if (target.id === context.userId) throw new Error("The repository owner already has access.");

    const { data: collaborator, error } = await sb.from("project_collaborators")
      .upsert({
        project_id: data.projectId,
        user_id: target.id,
        role: data.role,
        added_by: context.userId,
      }, { onConflict: "project_id,user_id" })
      .select("user_id,role,created_at")
      .single();
    if (error) throw new Error(error.message);

    await writeAudit({
      userId: context.userId,
      orgId: project.org_id,
      action: "project_repository_collaborator_added",
      targetType: "project",
      targetId: data.projectId,
      metadata: { collaboratorUserId: target.id, role: data.role },
    });
    return { ...collaborator, email: target.email, full_name: target.full_name };
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
    const project = await requireRepositoryManager(sb, data.projectId, context.userId);
    const { data: row, error } = await sb.from("project_collaborators")
      .update({ role: data.role })
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId)
      .select("user_id,role")
      .single();
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: context.userId,
      orgId: project.org_id,
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
    const project = await requireRepositoryManager(sb, data.projectId, context.userId);
    const { error } = await sb.from("project_collaborators")
      .delete()
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: context.userId,
      orgId: project.org_id,
      action: "project_repository_collaborator_removed",
      targetType: "project",
      targetId: data.projectId,
      metadata: { collaboratorUserId: data.userId },
    });
    return { ok: true };
  });


export const createRepositoryBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      name: branchSchema.regex(/^[A-Za-z0-9._/-]+$/),
      fromBranch: branchSchema,
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: branchId, error } = await sb.rpc("project_repository_create_branch", {
      p_project_id: data.projectId,
      p_name: data.name,
      p_from_branch: data.fromBranch,
    });
    if (error) throw new Error(error.message);
    await writeAudit({
      userId: context.userId,
      orgId: null,
      action: "project_repository_branch_created",
      targetType: "project",
      targetId: data.projectId,
      metadata: { branch: data.name, fromBranch: data.fromBranch },
    });
    return { branchId };
  });

export const listRepositoryIssues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      status: z.enum(["open", "closed"]).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let q = sb.from("project_repository_issues")
      .select("id,issue_number,title,body,status,labels,created_by,assignee_id,created_at,updated_at,closed_at")
      .eq("project_id", data.projectId)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: issues, error } = await q;
    if (error) throw new Error(error.message);
    return issues ?? [];
  });

export const createRepositoryIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      title: z.string().trim().min(1).max(240),
      body: z.string().trim().max(20_000).nullish(),
      labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: issue, error } = await sb.from("project_repository_issues")
      .insert({
        project_id: data.projectId,
        title: data.title,
        body: data.body ?? null,
        labels: data.labels ?? [],
        created_by: context.userId,
      })
      .select("id,issue_number,title,status,created_at")
      .single();
    if (error) throw new Error(error.message);
    return issue;
  });

export const setRepositoryIssueStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      issueId: z.string().uuid(),
      status: z.enum(["open", "closed"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: issue, error } = await sb.from("project_repository_issues")
      .update({
        status: data.status,
        closed_at: data.status === "closed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("project_id", data.projectId)
      .eq("id", data.issueId)
      .select("id,issue_number,status,updated_at,closed_at")
      .single();
    if (error) throw new Error(error.message);
    return issue;
  });

export const listRepositoryIssueComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ projectId: projectIdSchema, issueId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: comments, error } = await sb.from("project_repository_issue_comments")
      .select("id,body,created_by,created_at,updated_at")
      .eq("project_id", data.projectId)
      .eq("issue_id", data.issueId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return comments ?? [];
  });

export const addRepositoryIssueComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      issueId: z.string().uuid(),
      body: z.string().trim().min(1).max(10_000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: comment, error } = await sb.from("project_repository_issue_comments")
      .insert({
        project_id: data.projectId,
        issue_id: data.issueId,
        body: data.body,
        created_by: context.userId,
      })
      .select("id,body,created_by,created_at")
      .single();
    if (error) throw new Error(error.message);
    await sb.from("project_repository_issues")
      .update({ updated_at: new Date().toISOString() })
      .eq("project_id", data.projectId)
      .eq("id", data.issueId);
    return comment;
  });

export const listRepositoryReleases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: projectIdSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: releases, error } = await sb.from("project_repository_releases")
      .select("id,tag_name,title,notes,commit_id,created_by,draft,created_at,published_at")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return releases ?? [];
  });

export const createRepositoryRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      projectId: projectIdSchema,
      tagName: z.string().trim().min(1).max(120),
      title: z.string().trim().min(1).max(240),
      notes: z.string().trim().max(30_000).nullish(),
      commitId: z.string().uuid().nullish(),
      draft: z.boolean().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: release, error } = await sb.from("project_repository_releases")
      .insert({
        project_id: data.projectId,
        tag_name: data.tagName,
        title: data.title,
        notes: data.notes ?? null,
        commit_id: data.commitId ?? null,
        created_by: context.userId,
        draft: data.draft ?? false,
        published_at: data.draft ? null : new Date().toISOString(),
      })
      .select("id,tag_name,title,draft,created_at,published_at")
      .single();
    if (error) throw new Error(error.message);
    return release;
  });
