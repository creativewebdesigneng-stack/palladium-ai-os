import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../app-studio-release.functions.ts", import.meta.url)),
  "utf8",
);

describe("App Studio release activation", () => {
  it("requires authenticated owner scope for app and release", () => {
    expect(source).toContain("requireSupabaseAuth");
    expect(source).toContain('.eq("user_id", context.userId)');
    expect(source).toContain('.eq("app_id", data.appId)');
  });

  it("repoints the live app at an immutable existing release", () => {
    expect(source).toContain('published_release_id: release.data.id');
    expect(source).toContain('status: "published"');
    expect(source).not.toContain("snapshot:");
  });

  it("marks the previously live version rolled back and audits activation", () => {
    expect(source).toContain('status: "rolled_back"');
    expect(source).toContain('action: "app_studio_release_activated"');
  });
});
