import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

const projectInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  domain: z.string().trim().min(1).max(255),
  provider: z.string().trim().max(80).default("provider-neutral"),
  locationCode: z.string().trim().max(40).nullable().optional(),
  languageCode: z.string().trim().max(20).nullable().optional(),
});

const snapshotInput = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(["keyword", "rank", "backlink", "audit"]),
  subject: z.string().trim().min(1).max(500),
  metrics: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().max(20_000).default(""),
  source: z.string().trim().max(120).default("manual"),
  observedAt: z.string().datetime().optional(),
});

export const listSeoProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data, error } = await sb.from("seo_projects").select("*").eq("user_id", context.userId).order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { projects: data ?? [] };
  });

export const saveSeoProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => projectInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const row = {
      name: data.name,
      domain: normalizeDomain(data.domain),
      provider: data.provider,
      location_code: data.locationCode ?? null,
      language_code: data.languageCode ?? null,
      updated_at: new Date().toISOString(),
    };
    if (!row.domain || !row.domain.includes(".")) throw new Error("Enter a valid domain such as example.com.");
    const result = data.id
      ? await sb.from("seo_projects").update(row).eq("id", data.id).eq("user_id", context.userId).select("*").single()
      : await sb.from("seo_projects").insert({ ...row, user_id: context.userId, org_id: null }).select("*").single();
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Could not save SEO project.");
    return { project: result.data };
  });

export const listSeoSnapshots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId?: string | null; kind?: string; limit?: number } | undefined) => ({
    projectId: input?.projectId ? z.string().uuid().parse(input.projectId) : null,
    kind: String(input?.kind ?? ""),
    limit: Math.min(Math.max(Number(input?.limit ?? 250) || 250, 1), 500),
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let query = sb.from("seo_snapshots").select("*").eq("user_id", context.userId).order("observed_at", { ascending: false }).limit(data.limit);
    if (data.projectId) query = query.eq("project_id", data.projectId);
    if (["keyword", "rank", "backlink", "audit"].includes(data.kind)) query = query.eq("kind", data.kind);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return { snapshots: rows ?? [] };
  });

export const saveSeoSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => snapshotInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: project, error: projectError } = await sb.from("seo_projects").select("id").eq("id", data.projectId).eq("user_id", context.userId).maybeSingle();
    if (projectError || !project) throw new Error(projectError?.message ?? "SEO project not found.");
    const { data: row, error } = await sb.from("seo_snapshots").insert({
      user_id: context.userId,
      project_id: data.projectId,
      kind: data.kind,
      subject: data.subject,
      metrics: data.metrics,
      notes: data.notes,
      source: data.source,
      observed_at: data.observedAt ?? new Date().toISOString(),
    }).select("*").single();
    if (error || !row) throw new Error(error?.message ?? "Could not save SEO observation.");
    return { snapshot: row };
  });
