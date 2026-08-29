import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const migration = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20260828006000_app_studio.sql", import.meta.url)), "utf8");
const api = readFileSync(fileURLToPath(new URL("../app-studio.functions.ts", import.meta.url)), "utf8");
const panel = readFileSync(fileURLToPath(new URL("../../../components/tools-framework/AppStudioPanel.jsx", import.meta.url)), "utf8");
const framework = readFileSync(fileURLToPath(new URL("../../../screens/ToolsFramework.jsx", import.meta.url)), "utf8");
const queryRuntime = readFileSync(fileURLToPath(new URL("../app-studio-query.server.ts", import.meta.url)), "utf8");
const runtimeTools = readFileSync(fileURLToPath(new URL("../../runtime/tools.server.ts", import.meta.url)), "utf8");
const agentTool = readFileSync(fileURLToPath(new URL("../app-studio-agent-tool.server.ts", import.meta.url)), "utf8");
const published = readFileSync(fileURLToPath(new URL("../../../screens/PublishedStudioApp.jsx", import.meta.url)), "utf8");
const publicRpc = migration.slice(migration.indexOf("create or replace function public.get_published_app_studio_release"));

describe("App Studio production contract", () => {
  it("uses owner-scoped persisted documents instead of mock application state", () => {
    for (const table of ["app_studio_apps","app_studio_pages","app_studio_widgets","app_studio_datasources","app_studio_queries","app_studio_releases"]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
    expect(migration).toContain("auth.uid() = user_id");
    expect(api).toContain("requireSupabaseAuth");
    expect(api).toContain('.eq("user_id", context.userId)');
  });

  it("keeps credentials outside editable application JSON", () => {
    expect(api).toContain("rejectEmbeddedSecrets");
    expect(api).toContain("Use a connected integration or encrypted credential reference");
    expect(migration).toContain("connection_ref text null");
  });

  it("provides pages, components, datasources and immutable release snapshots in Tool Framework", () => {
    expect(framework).toContain("App Studio");
    expect(framework).toContain("<AppStudioPanel");
    expect(panel).toContain("saveStudioPage");
    expect(panel).toContain("saveStudioWidget");
    expect(panel).toContain("saveStudioDatasource");
    expect(panel).toContain("createStudioRelease");
    expect(api).toContain("schemaVersion: 1");
    expect(api).toContain("app_studio_published");
    expect(migration).toContain("get_published_app_studio_release");
    expect(migration).toContain("r.snapshot->'app'");
    expect(migration).not.toContain("r.snapshot->'datasources'");
    expect(published).toContain("safePublicUrl");
  });

  it("reuses MCP, integration approvals and the expanded Harness-controlled agent runtime tool", () => {
    expect(queryRuntime).toContain("prepareAgentMcpIntegrationAction");
    expect(queryRuntime).toContain("prepareIntegrationAction");
    expect(queryRuntime).toContain('action_type: "external_mcp_action"');
    expect(queryRuntime).toContain('action_type: "nango_dynamic_action"');
    expect(queryRuntime).toContain("assertPublicMcpEndpoint");
    expect(runtimeTools).toContain("APP_STUDIO_TOOL_DEF");
    expect(runtimeTools).toContain("runAppStudioTool");
    expect(runtimeTools).toContain('name !== "skill_script" && name !== "app_studio"');
    expect(agentTool).toContain('enum: ["list_apps","get_app","create_app","add_page","add_widget","add_datasource","add_query","run_query"]');
  });
});
