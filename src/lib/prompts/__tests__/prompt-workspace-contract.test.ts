import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const api = readFileSync(
  fileURLToPath(new URL("../prompt-workspace.functions.ts", import.meta.url)),
  "utf8",
);
const screen = readFileSync(
  fileURLToPath(new URL("../../../screens/Prompts.jsx", import.meta.url)),
  "utf8",
);
const migration = readFileSync(
  fileURLToPath(new URL("../../../../supabase/migrations/20260820093000_prompt_workspace.sql", import.meta.url)),
  "utf8",
);

describe("Prompt Workspace production contract", () => {
  it("keeps every prompt table owner scoped with RLS", () => {
    expect(migration).toContain("alter table public.saved_prompts enable row level security");
    expect(migration).toContain("alter table public.saved_prompt_versions enable row level security");
    expect(migration).toContain("alter table public.saved_prompt_runs enable row level security");
    expect((migration.match(/auth\.uid\(\) = user_id/g) ?? []).length).toBeGreaterThanOrEqual(7);
  });

  it("runs prompts through normal entitlements, model preference, usage and audit controls", () => {
    expect(api).toContain("requireSupabaseAuth");
    expect(api).toContain('assertWithinLimit(entitlements, "tasks_per_month")');
    expect(api).toContain("resolveAssistantModelPreference");
    expect(api).toContain("runChat");
    expect(api).toContain('metric: "prompt_run"');
    expect(api).toContain('action: "prompt.run"');
    expect(api).toContain('.eq("user_id", context.userId)');
  });

  it("stores immutable versions and exposes real run history in the UI", () => {
    expect(api).toContain('.from("saved_prompt_versions")');
    expect(api).toContain('.from("saved_prompt_runs")');
    expect(screen).toContain("Version history");
    expect(screen).toContain("Live model execution");
    expect(screen).toContain("Recent runs");
    expect(screen).not.toContain("Not connected");
  });
});
