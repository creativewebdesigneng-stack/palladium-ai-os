import type { ToolDef } from "@/lib/runtime/model-gateway.server";
import { validateStudioBindings, validateStudioEvents } from "./app-studio-bindings";
import { executeStudioQuery } from "./app-studio-query.server";

type Sb = { from: (table: string) => any };

type AppStudioAgentContext = {
  userId: string;
  orgId: string | null;
  sb: Sb;
};

const FORBIDDEN_CONFIG_KEY = /(?:password|secret|token|api[_-]?key|private[_-]?key|authorization|cookie)/i;
const SUPPORTED_WIDGETS = ["container","text","button","input","textarea","select","checkbox","table","list","image","form","chart","stat","tabs","modal","divider","link"] as const;
const SUPPORTED_SOURCES = ["rest","graphql","mcp","integration"] as const;

function str(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function cleanSlug(value: unknown) {
  return str(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function rejectEmbeddedSecrets(value: unknown, path = "config"): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_CONFIG_KEY.test(key)) {
      throw new Error(`Credentials cannot be supplied through App Studio agent input (${path}.${key}). Use a connected integration or MCP reference.`);
    }
    rejectEmbeddedSecrets(child, `${path}.${key}`);
  }
}

async function requireApp(ctx: AppStudioAgentContext, appId: string) {
  const result = await ctx.sb.from("app_studio_apps")
    .select("id,name,slug,status")
    .eq("id", appId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (result.error || !result.data) throw new Error("That App Studio application is unavailable.");
  return result.data;
}

export const APP_STUDIO_TOOL_DEF: ToolDef = {
  name: "app_studio",
  description:
    "Build and test owner-scoped low-code application drafts in PalladiumAI App Studio. Can create apps, pages, components, secure datasource references and queries, and run tests. Publishing remains operator-controlled in Tool Framework.",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list_apps","get_app","create_app","add_page","add_widget","add_datasource","add_query","run_query"],
      },
      app_id: { type: "string" },
      page_id: { type: "string" },
      datasource_id: { type: "string" },
      query_id: { type: "string" },
      name: { type: "string" },
      slug: { type: "string" },
      widget_type: { type: "string", enum: [...SUPPORTED_WIDGETS] },
      provider: { type: "string", enum: [...SUPPORTED_SOURCES] },
      connection_ref: { type: "string", description: "Existing integration:<provider> or mcp:<server-id> reference. Never a credential." },
      operation: { type: "string" },
      properties: { type: "object" },
      bindings: { type: "object" },
      events: { type: "object" },
      position: { type: "object" },
      config: { type: "object" },
      configuration: { type: "object" },
      input: { type: "object" },
      run_on_load: { type: "boolean" },
      requires_approval: { type: "boolean" },
      timeout_ms: { type: "number" },
    },
    required: ["action"],
  },
};

export async function runAppStudioTool(
  input: Record<string, unknown>,
  ctx: AppStudioAgentContext,
): Promise<unknown> {
  const action = str(input["action"]);

  if (action === "list_apps") {
    const result = await ctx.sb.from("app_studio_apps")
      .select("id,name,slug,application_type,status,updated_at")
      .eq("user_id", ctx.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    return result.error
      ? { error: "App Studio applications could not be loaded." }
      : { apps: result.data ?? [] };
  }

  if (action === "create_app") {
    const name = str(input["name"]).trim().slice(0, 120);
    const slug = cleanSlug(input["slug"] || name);
    if (!name || !slug) return { error: "A valid application name is required." };
    const app = await ctx.sb.from("app_studio_apps").insert({
      user_id: ctx.userId,
      org_id: ctx.orgId,
      name,
      slug,
      application_type: "web",
      status: "draft",
    }).select("id,name,slug,status").maybeSingle();
    if (app.error || !app.data) return { error: "The draft application could not be created." };
    const page = await ctx.sb.from("app_studio_pages").insert({
      app_id: app.data.id,
      user_id: ctx.userId,
      name: "Home",
      slug: "home",
      is_home: true,
      layout: { type: "canvas", version: 1 },
      position: 0,
    }).select("id,name,slug").maybeSingle();
    if (page.error || !page.data) {
      await ctx.sb.from("app_studio_apps").delete().eq("id", app.data.id).eq("user_id", ctx.userId);
      return { error: "The application home page could not be created." };
    }
    return { app: app.data, page: page.data, draft: true };
  }

  const appId = str(input["app_id"]);
  if (!appId) return { error: "app_id is required." };
  await requireApp(ctx, appId);

  if (action === "get_app") {
    const [pages, widgets, datasources, queries] = await Promise.all([
      ctx.sb.from("app_studio_pages").select("id,name,slug,is_home,position").eq("app_id", appId).eq("user_id", ctx.userId).order("position"),
      ctx.sb.from("app_studio_widgets").select("id,page_id,name,widget_type,position,properties,bindings,events").eq("app_id", appId).eq("user_id", ctx.userId),
      ctx.sb.from("app_studio_datasources").select("id,name,provider,connection_ref,environment,enabled").eq("app_id", appId).eq("user_id", ctx.userId),
      ctx.sb.from("app_studio_queries").select("id,page_id,datasource_id,name,operation,run_on_load,requires_approval,timeout_ms").eq("app_id", appId).eq("user_id", ctx.userId),
    ]);
    if ([pages, widgets, datasources, queries].some((result) => result.error)) {
      return { error: "The App Studio draft could not be loaded." };
    }
    return {
      pages: pages.data ?? [],
      widgets: widgets.data ?? [],
      datasources: datasources.data ?? [],
      queries: queries.data ?? [],
    };
  }

  if (action === "add_page") {
    const name = str(input["name"]).trim().slice(0, 120);
    const slug = cleanSlug(input["slug"] || name);
    if (!name || !slug) return { error: "A valid page name is required." };
    const count = await ctx.sb.from("app_studio_pages")
      .select("id", { count: "exact", head: true })
      .eq("app_id", appId)
      .eq("user_id", ctx.userId);
    const page = await ctx.sb.from("app_studio_pages").insert({
      app_id: appId,
      user_id: ctx.userId,
      name,
      slug,
      is_home: false,
      layout: { type: "canvas", version: 1 },
      position: count.count ?? 0,
    }).select("id,name,slug,position").maybeSingle();
    return page.error || !page.data ? { error: "The page could not be created." } : { page: page.data };
  }

  if (action === "add_widget") {
    const pageId = str(input["page_id"]);
    const widgetType = str(input["widget_type"]);
    if (!pageId || !SUPPORTED_WIDGETS.includes(widgetType as typeof SUPPORTED_WIDGETS[number])) {
      return { error: "A valid page_id and widget_type are required." };
    }
    const page = await ctx.sb.from("app_studio_pages").select("id")
      .eq("id", pageId).eq("app_id", appId).eq("user_id", ctx.userId).maybeSingle();
    if (!page.data) return { error: "That App Studio page is unavailable." };
    const widget = await ctx.sb.from("app_studio_widgets").insert({
      app_id: appId,
      page_id: pageId,
      user_id: ctx.userId,
      widget_type: widgetType,
      name: str(input["name"], widgetType).slice(0, 120),
      position: object(input["position"]),
      properties: object(input["properties"]),
      bindings: validateStudioBindings(object(input["bindings"])),
      events: validateStudioEvents(object(input["events"])),
    }).select("id,name,widget_type,position").maybeSingle();
    return widget.error || !widget.data ? { error: "The component could not be created." } : { widget: widget.data };
  }

  if (action === "add_datasource") {
    const name = str(input["name"]).trim().slice(0, 120);
    const provider = str(input["provider"]).toLowerCase();
    if (!name || !SUPPORTED_SOURCES.includes(provider as typeof SUPPORTED_SOURCES[number])) {
      return { error: "A valid datasource name and provider are required." };
    }
    const connectionRef = str(input["connection_ref"]).trim().slice(0, 240) || null;
    if (provider === "mcp" && (!connectionRef || !connectionRef.startsWith("mcp:"))) {
      return { error: "MCP datasources require an existing mcp:<server-id> connection reference." };
    }
    if (provider === "integration" && (!connectionRef || !connectionRef.startsWith("integration:"))) {
      return { error: "Integration datasources require an existing integration:<provider> connection reference." };
    }
    const config = object(input["config"]);
    rejectEmbeddedSecrets(config);
    const datasource = await ctx.sb.from("app_studio_datasources").insert({
      app_id: appId,
      user_id: ctx.userId,
      name,
      provider,
      connection_ref: connectionRef,
      config,
      environment: "development",
      enabled: true,
    }).select("id,name,provider,connection_ref,environment,enabled").maybeSingle();
    return datasource.error || !datasource.data
      ? { error: "The datasource could not be created." }
      : { datasource: datasource.data };
  }

  if (action === "add_query") {
    const datasourceId = str(input["datasource_id"]);
    const name = str(input["name"]).trim().slice(0, 120);
    const operation = str(input["operation"]).trim().slice(0, 160);
    if (!datasourceId || !name || !operation) {
      return { error: "datasource_id, name and operation are required." };
    }
    const source = await ctx.sb.from("app_studio_datasources").select("id,provider")
      .eq("id", datasourceId).eq("app_id", appId).eq("user_id", ctx.userId).eq("enabled", true).maybeSingle();
    if (!source.data) return { error: "That App Studio datasource is unavailable." };
    const pageId = str(input["page_id"]) || null;
    if (pageId) {
      const page = await ctx.sb.from("app_studio_pages").select("id")
        .eq("id", pageId).eq("app_id", appId).eq("user_id", ctx.userId).maybeSingle();
      if (!page.data) return { error: "That App Studio page is unavailable." };
    }
    if (source.data.provider === "rest" && operation.toLowerCase() !== "get") {
      return { error: "Direct REST agent-created queries are read-only GET requests." };
    }
    const configuration = object(input["configuration"]);
    rejectEmbeddedSecrets(configuration, "query.configuration");
    const query = await ctx.sb.from("app_studio_queries").insert({
      app_id: appId,
      page_id: pageId,
      datasource_id: datasourceId,
      user_id: ctx.userId,
      name,
      operation,
      configuration,
      run_on_load: input["run_on_load"] === true,
      requires_approval: input["requires_approval"] === true,
      timeout_ms: Math.min(60_000, Math.max(1_000, Number(input["timeout_ms"] ?? 15_000) || 15_000)),
    }).select("id,name,operation,run_on_load,requires_approval,timeout_ms").maybeSingle();
    return query.error || !query.data ? { error: "The query could not be created." } : { query: query.data };
  }

  if (action === "run_query") {
    const queryId = str(input["query_id"]);
    if (!queryId) return { error: "query_id is required." };
    const owned = await ctx.sb.from("app_studio_queries").select("id")
      .eq("id", queryId).eq("app_id", appId).eq("user_id", ctx.userId).maybeSingle();
    if (!owned.data) return { error: "That App Studio query is unavailable." };
    return executeStudioQuery({
      sb: ctx.sb,
      userId: ctx.userId,
      queryId,
      input: object(input["input"]),
    });
  }

  return { error: "Unsupported App Studio action." };
}
