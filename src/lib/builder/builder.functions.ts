import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };

const createInput = z.object({
  title: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(20).max(12000),
});

const cancelInput = z.object({
  id: z.string().uuid(),
});

const jobColumns = "id,title,prompt,status,plan,repository_full_name,branch_name,last_error,created_at,updated_at";

function mapJob(row: any) {
  return {
    id: String(row.id),
    title: String(row.title),
    prompt: String(row.prompt),
    status: String(row.status),
    plan: row.plan ?? null,
    repositoryFullName: row.repository_full_name ? String(row.repository_full_name) : null,
    branchName: row.branch_name ? String(row.branch_name) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export const listBuilderJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb
      .from("builder_jobs")
      .select(jobColumns)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapJob);
  });

export const createBuilderJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("builder_jobs")
      .insert({
        user_id: context.userId,
        title: data.title.trim(),
        prompt: data.prompt.trim(),
        status: "requested",
      })
      .select(jobColumns)
      .single();
    if (error) throw new Error(error.message);
    return mapJob(row);
  });

export const cancelBuilderJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => cancelInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: row, error } = await sb
      .from("builder_jobs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .in("status", ["requested", "planning"])
      .select(jobColumns)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Build request could not be cancelled because it is no longer pending.");
    return mapJob(row);
  });
