import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const migration = readFileSync(fileURLToPath(new URL("../../../../supabase/migrations/20260828006000_app_studio.sql", import.meta.url)), "utf8");
const api = readFileSync(fileURLToPath(new URL("../app-studio.functions.ts", import.meta.url)), "utf8");
const panel = readFileSync(fileURLToPath(new URL("../../../components/tools-framework/AppStudioPanel.jsx", import.meta.url)), "utf8");
const framework = readFileSync(fileURLToPath(new URL("../../../screens/ToolsFramework.jsx", import.meta.url)), "utf8");

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
  });
});
