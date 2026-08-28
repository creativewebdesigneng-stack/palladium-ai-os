import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Sb = { from: (table: string) => any };
const uuid = z.string().uuid();
const slug = z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const input = z.object({
  sourceAppId: uuid,
  name: z.string().trim().min(1).max(120),
  slug,
  preserveConnectionRefs: z.boolean().default(true),
});

function bounded(rows: any[] | null | undefined, maximum: number, label: string) {
  const value = rows ?? [];
  if (value.length > maximum) throw new Error(`The source app has too many ${label} to clone safely.`);
  return value;
}

export const cloneStudioApp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => input.parse(value))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const source = await sb.from("app_studio_apps")
      .select("id,name,description,application_type,theme,settings")
      .eq("id", data.sourceAppId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (source.error) throw new Error(source.error.message);
    if (!source.data) throw new Error("The source App Studio application was not found.");

    const [pagesResult, widgetsResult, datasourcesResult, queriesResult] = await Promise.all([
      sb.from("app_studio_pages").select("*").eq("app_id", data.sourceAppId).eq("user_id", context.userId).order("position"),
      sb.from("app_studio_widgets").select("*").eq("app_id", data.sourceAppId).eq("user_id", context.userId).order("created_at"),
      sb.from("app_studio_datasources").select("*").eq("app_id", data.sourceAppId).eq("user_id", context.userId).order("created_at"),
      sb.from("app_studio_queries").select("*").eq("app_id", data.sourceAppId).eq("user_id", context.userId).order("created_at"),
    ]);
    for (const result of [pagesResult, widgetsResult, datasourcesResult, queriesResult]) {
      if (result.error) throw new Error(result.error.message);
    }
    const pages = bounded(pagesResult.data, 100, "pages");
    const widgets = bounded(widgetsResult.data, 1000, "components");
    const datasources = bounded(datasourcesResult.data, 100, "datasources");
    const queries = bounded(queriesResult.data, 500, "queries");

    let newAppId = "";
    try {
      const created = await sb.from("app_studio_apps").insert({
        user_id: context.userId,
        org_id: null,
        name: data.name,
        slug: data.slug,
        description: source.data.description ?? "",
        application_type: source.data.application_type,
        theme: source.data.theme ?? {},
        settings: source.data.settings ?? {},
        status: "draft",
        published_release_id: null,
      }).select("id,name,slug,status").single();
      if (created.error) throw new Error(created.error.code === "23505" ? "An App Studio app already uses that slug." : created.error.message);
      newAppId = created.data.id;

      const pageIds = new Map<string, string>();
      for (const page of pages) {
        const copied = await sb.from("app_studio_pages").insert({
          app_id: newAppId,
          user_id: context.userId,
          name: page.name,
          slug: page.slug,
          is_home: page.is_home,
          layout: page.layout ?? { type: "canvas", version: 1 },
          position: page.position ?? 0,
        }).select("id").single();
        if (copied.error) throw new Error(copied.error.message);
        pageIds.set(page.id, copied.data.id);
      }

      const datasourceIds = new Map<string, string>();
      for (const datasource of datasources) {
        const keepsRef = data.preserveConnectionRefs === true;
        const copied = await sb.from("app_studio_datasources").insert({
          app_id: newAppId,
          user_id: context.userId,
          name: datasource.name,
          provider: datasource.provider,
          connection_ref: keepsRef ? datasource.connection_ref : null,
          config: datasource.config ?? {},
          environment: datasource.environment ?? "development",
          enabled: keepsRef || datasource.provider === "rest" || datasource.provider === "graphql" ? datasource.enabled !== false : false,
        }).select("id").single();
        if (copied.error) throw new Error(copied.error.message);
        datasourceIds.set(datasource.id, copied.data.id);
      }

      const widgetIds = new Map<string, string>();
      for (const widget of widgets) {
        const pageId = pageIds.get(widget.page_id);
        if (!pageId) throw new Error("The source component references a missing page.");
        const copied = await sb.from("app_studio_widgets").insert({
          app_id: newAppId,
          page_id: pageId,
          user_id: context.userId,
          parent_id: null,
          widget_type: widget.widget_type,
          name: widget.name,
          position: widget.position ?? {},
          properties: widget.properties ?? {},
          bindings: widget.bindings ?? {},
          events: widget.events ?? {},
        }).select("id").single();
        if (copied.error) throw new Error(copied.error.message);
        widgetIds.set(widget.id, copied.data.id);
      }
      for (const widget of widgets) {
        if (!widget.parent_id) continue;
        const widgetId = widgetIds.get(widget.id);
        const parentId = widgetIds.get(widget.parent_id);
        if (!widgetId || !parentId) throw new Error("The source component tree is invalid.");
        const linked = await sb.from("app_studio_widgets")
          .update({ parent_id: parentId })
          .eq("id", widgetId)
          .eq("app_id", newAppId)
          .eq("user_id", context.userId);
        if (linked.error) throw new Error(linked.error.message);
      }

      for (const query of queries) {
        const datasourceId = datasourceIds.get(query.datasource_id);
        if (!datasourceId) throw new Error("The source query references a missing datasource.");
        const pageId = query.page_id ? pageIds.get(query.page_id) : null;
        if (query.page_id && !pageId) throw new Error("The source query references a missing page.");
        const copied = await sb.from("app_studio_queries").insert({
          app_id: newAppId,
          page_id: pageId ?? null,
          datasource_id: datasourceId,
          user_id: context.userId,
          name: query.name,
          operation: query.operation,
          configuration: query.configuration ?? {},
          run_on_load: query.run_on_load === true,
          requires_approval: query.requires_approval === true,
          timeout_ms: query.timeout_ms ?? 15000,
        });
        if (copied.error) throw new Error(copied.error.message);
      }

      await sb.from("mission_audit_logs").insert({
        user_id: context.userId,
        action: "app_studio_cloned",
        target_type: "app_studio_app",
        target_id: newAppId,
        status: "success",
        metadata: {
          source_app_id: data.sourceAppId,
          preserve_connection_refs: data.preserveConnectionRefs,
          pages: pages.length,
          widgets: widgets.length,
          datasources: datasources.length,
          queries: queries.length,
        },
      });
      return { app: created.data, copied: { pages: pages.length, widgets: widgets.length, datasources: datasources.length, queries: queries.length } };
    } catch (error) {
      if (newAppId) {
        await sb.from("app_studio_apps").delete().eq("id", newAppId).eq("user_id", context.userId);
      }
      throw error;
    }
  });
