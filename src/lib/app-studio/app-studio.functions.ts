import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeStudioQuery } from "@/lib/app-studio/app-studio-query.server";

type Sb = { from: (table: string) => any };

const slug = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const uuid = z.string().uuid();
const jsonRecord = z.record(z.string(), z.unknown()).default({});
const appInput = z.object({
  name: z.string().trim().min(1).max(120),
  slug,
  description: z.string().max(2000).default(""),
  applicationType: z.enum(["web", "internal", "dashboard", "mobile_web"]).default("web"),
});
const pageInput = z.object({
  appId: uuid,
  id: uuid.optional(),
  name: z.string().trim().min(1).max(120),
  slug,
  isHome: z.boolean().default(false),
  layout: jsonRecord,
  position: z.number().int().min(0).max(10000).default(0),
});
const widgetInput = z.object({
  appId: uuid,
  pageId: uuid,
  id: uuid.optional(),
  parentId: uuid.nullable().optional(),
  widgetType: z.enum(["container","text","button","input","textarea","select","checkbox","table","list","image","form","chart","stat","tabs","modal","divider","link"]),
  name: z.string().trim().min(1).max(120),
  position: jsonRecord,
  properties: jsonRecord,
  bindings: jsonRecord,
  events: jsonRecord,
});
const datasourceInput = z.object({
  appId: uuid,
  id: uuid.optional(),
  name: z.string().trim().min(1).max(120),
  provider: z.enum(["rest","graphql","supabase","postgres","mysql","mongodb","mcp","integration"]),
  connectionRef: z.string().trim().max(240).nullable().optional(),
  config: jsonRecord,
  environment: z.enum(["development","staging","production"]).default("development"),
  enabled: z.boolean().default(true),
});
const queryInput = z.object({
  appId: uuid,
  id: uuid.optional(),
  pageId: uuid.nullable().optional(),
  datasourceId: uuid,
  name: z.string().trim().min(1).max(120),
  operation: z.string().trim().min(1).max(160),
  configuration: jsonRecord,
  runOnLoad: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  timeoutMs: z.number().int().min(1000).max(60000).default(15000),
});

const FORBIDDEN_CONFIG_KEY = /(?:password|secret|token|api[_-]?key|private[_-]?key|authorization|cookie)/i;

function rejectEmbeddedSecrets(value: unknown, path = "config"): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_CONFIG_KEY.test(key)) {
      throw new Error(`Credentials cannot be stored in App Studio JSON (${path}.${key}). Use a connected integration or encrypted credential reference.`);
    }
    rejectEmbeddedSecrets(child, `${path}.${key}`);
  }
}

async function requireApp(sb: Sb, userId: string, appId: string) {
  const result = await sb.from("app_studio_apps").select("id,name,slug,status").eq("id", appId).eq("user_id", userId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) throw new Error("App Studio application not found.");
  return result.data;
}

export const listStudioApps = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const result = await sb.from("app_studio_apps").select("id,name,slug,description,application_type,status,published_release_id,created_at,updated_at").eq("user_id", context.userId).order("updated_at", { ascending: false }).limit(100);
    if (result.error) throw new Error(result.error.message);
    return result.data ?? [];
  });

export const createStudioApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => appInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const app = await sb.from("app_studio_apps").insert({
      user_id: context.userId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      application_type: data.applicationType,
    }).select("*").single();
    if (app.error) throw new Error(app.error.code === "23505" ? "You already have an app with that slug." : app.error.message);
    const page = await sb.from("app_studio_pages").insert({
      app_id: app.data.id,
      user_id: context.userId,
      name: "Home",
      slug: "home",
      is_home: true,
      position: 0,
    }).select("*").single();
    if (page.error) {
      await sb.from("app_studio_apps").delete().eq("id", app.data.id).eq("user_id", context.userId);
      throw new Error(page.error.message);
    }
    await sb.from("mission_audit_logs").insert({
      user_id: context.userId, action: "app_studio_created", target_type: "app_studio_app",
      target_id: app.data.id, status: "success", metadata: { slug: data.slug, application_type: data.applicationType },
    });
    return { app: app.data, page: page.data };
  });

export const getStudioApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ appId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const app = await sb.from("app_studio_apps").select("*").eq("id", data.appId).eq("user_id", context.userId).maybeSingle();
    if (app.error) throw new Error(app.error.message);
    if (!app.data) throw new Error("App Studio application not found.");
    const [pages, widgets, datasources, queries, releases] = await Promise.all([
      sb.from("app_studio_pages").select("*").eq("app_id", data.appId).eq("user_id", context.userId).order("position"),
      sb.from("app_studio_widgets").select("*").eq("app_id", data.appId).eq("user_id", context.userId).order("created_at"),
      sb.from("app_studio_datasources").select("*").eq("app_id", data.appId).eq("user_id", context.userId).order("name"),
      sb.from("app_studio_queries").select("*").eq("app_id", data.appId).eq("user_id", context.userId).order("name"),
      sb.from("app_studio_releases").select("id,version,notes,status,created_at,published_at").eq("app_id", data.appId).eq("user_id", context.userId).order("version", { ascending: false }).limit(30),
    ]);
    for (const result of [pages, widgets, datasources, queries, releases]) if (result.error) throw new Error(result.error.message);
    return { app: app.data, pages: pages.data ?? [], widgets: widgets.data ?? [], datasources: datasources.data ?? [], queries: queries.data ?? [], releases: releases.data ?? [] };
  });

export const saveStudioPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pageInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireApp(sb, context.userId, data.appId);
    if (data.isHome) await sb.from("app_studio_pages").update({ is_home: false }).eq("app_id", data.appId).eq("user_id", context.userId);
    const row = { app_id: data.appId, user_id: context.userId, name: data.name, slug: data.slug, is_home: data.isHome, layout: data.layout, position: data.position };
    const result = data.id
      ? await sb.from("app_studio_pages").update(row).eq("id", data.id).eq("app_id", data.appId).eq("user_id", context.userId).select("*").maybeSingle()
      : await sb.from("app_studio_pages").insert(row).select("*").single();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("Page not found.");
    return result.data;
  });

export const saveStudioWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => widgetInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireApp(sb, context.userId, data.appId);
    const page = await sb.from("app_studio_pages").select("id").eq("id", data.pageId).eq("app_id", data.appId).eq("user_id", context.userId).maybeSingle();
    if (!page.data) throw new Error("Page not found.");
    const row = { app_id: data.appId, page_id: data.pageId, user_id: context.userId, parent_id: data.parentId ?? null, widget_type: data.widgetType, name: data.name, position: data.position, properties: data.properties, bindings: data.bindings, events: data.events };
    const result = data.id
      ? await sb.from("app_studio_widgets").update(row).eq("id", data.id).eq("app_id", data.appId).eq("user_id", context.userId).select("*").maybeSingle()
      : await sb.from("app_studio_widgets").insert(row).select("*").single();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("Widget not found.");
    return result.data;
  });

export const saveStudioDatasource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => datasourceInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireApp(sb, context.userId, data.appId);
    rejectEmbeddedSecrets(data.config);
    if (data.provider !== "rest" && data.provider !== "graphql" && !data.connectionRef) {
      throw new Error("This datasource requires an existing connected integration or encrypted credential reference.");
    }
    const row = { app_id: data.appId, user_id: context.userId, name: data.name, provider: data.provider, connection_ref: data.connectionRef ?? null, config: data.config, environment: data.environment, enabled: data.enabled };
    const result = data.id
      ? await sb.from("app_studio_datasources").update(row).eq("id", data.id).eq("app_id", data.appId).eq("user_id", context.userId).select("*").maybeSingle()
      : await sb.from("app_studio_datasources").insert(row).select("*").single();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("Datasource not found.");
    return result.data;
  });

export const saveStudioQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => queryInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireApp(sb, context.userId, data.appId);
    rejectEmbeddedSecrets(data.configuration, "query.configuration");
    const source = await sb.from("app_studio_datasources").select("id").eq("id", data.datasourceId).eq("app_id", data.appId).eq("user_id", context.userId).maybeSingle();
    if (!source.data) throw new Error("Datasource not found.");
    const row = { app_id: data.appId, page_id: data.pageId ?? null, datasource_id: data.datasourceId, user_id: context.userId, name: data.name, operation: data.operation, configuration: data.configuration, run_on_load: data.runOnLoad, requires_approval: data.requiresApproval, timeout_ms: data.timeoutMs };
    const result = data.id
      ? await sb.from("app_studio_queries").update(row).eq("id", data.id).eq("app_id", data.appId).eq("user_id", context.userId).select("*").maybeSingle()
      : await sb.from("app_studio_queries").insert(row).select("*").single();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("Query not found.");
    return result.data;
  });

export const createStudioRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ appId: uuid, notes: z.string().max(2000).default(""), publish: z.boolean().default(false) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await requireApp(sb, context.userId, data.appId);
    const document = await Promise.all([
      sb.from("app_studio_apps").select("id,name,slug,description,application_type,theme,settings").eq("id", data.appId).eq("user_id", context.userId).single(),
      sb.from("app_studio_pages").select("*").eq("app_id", data.appId).eq("user_id", context.userId).order("position"),
      sb.from("app_studio_widgets").select("*").eq("app_id", data.appId).eq("user_id", context.userId),
      sb.from("app_studio_datasources").select("id,name,provider,connection_ref,config,environment,enabled").eq("app_id", data.appId).eq("user_id", context.userId),
      sb.from("app_studio_queries").select("*").eq("app_id", data.appId).eq("user_id", context.userId),
      sb.from("app_studio_releases").select("version").eq("app_id", data.appId).eq("user_id", context.userId).order("version", { ascending: false }).limit(1),
    ]);
    for (const result of document) if (result.error) throw new Error(result.error.message);
    const version = Number(document[5].data?.[0]?.version ?? 0) + 1;
    const snapshot = { schemaVersion: 1, app: document[0].data, pages: document[1].data ?? [], widgets: document[2].data ?? [], datasources: document[3].data ?? [], queries: document[4].data ?? [] };
    const release = await sb.from("app_studio_releases").insert({ app_id: data.appId, user_id: context.userId, version, snapshot, notes: data.notes, status: data.publish ? "published" : "created", published_at: data.publish ? new Date().toISOString() : null }).select("id,version,notes,status,created_at,published_at").single();
    if (release.error) throw new Error(release.error.message);
    if (data.publish) {
      const updated = await sb.from("app_studio_apps").update({ status: "published", published_release_id: release.data.id }).eq("id", data.appId).eq("user_id", context.userId);
      if (updated.error) throw new Error(updated.error.message);
    }
    await sb.from("mission_audit_logs").insert({ user_id: context.userId, action: data.publish ? "app_studio_published" : "app_studio_release_created", target_type: "app_studio_app", target_id: data.appId, status: "success", metadata: { release_id: release.data.id, version } });
    return release.data;
  });


export const runStudioQuery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ queryId: uuid, input: z.record(z.string(), z.unknown()).default({}) }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const startedAt = Date.now();
    try {
      const result = await executeStudioQuery({ sb, userId: context.userId, queryId: data.queryId, input: data.input });
      await sb.from("mission_audit_logs").insert({
        user_id: context.userId, action: "app_studio_query_executed", target_type: "app_studio_query",
        target_id: data.queryId, status: "success", metadata: { duration_ms: Date.now() - startedAt },
      });
      return result;
    } catch (error) {
      await sb.from("mission_audit_logs").insert({
        user_id: context.userId, action: "app_studio_query_failed", target_type: "app_studio_query",
        target_id: data.queryId, status: "failed", metadata: { duration_ms: Date.now() - startedAt },
      });
      throw error;
    }
  });
