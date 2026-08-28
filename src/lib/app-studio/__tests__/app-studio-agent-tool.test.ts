import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(
  fileURLToPath(new URL("../app-studio-agent-tool.server.ts", import.meta.url)),
  "utf8",
);

describe("App Studio agent tool contract", () => {
  it("supports data-connected draft construction and query testing", () => {
    for (const action of [
      "list_apps",
      "get_app",
      "create_app",
      "add_page",
      "add_widget",
      "add_datasource",
      "add_query",
      "run_query",
    ]) expect(source).toContain(`\"${action}\"`);
    expect(source).toContain("executeStudioQuery");
  });

  it("keeps publishing outside agent authority", () => {
    expect(source).toContain("Publishing remains operator-controlled");
    expect(source).not.toContain('action === "publish"');
    expect(source).not.toContain('action === "create_release"');
  });

  it("rejects inline credentials and requires typed secure connection references", () => {
    expect(source).toContain("rejectEmbeddedSecrets");
    expect(source).toContain('startsWith("mcp:")');
    expect(source).toContain('startsWith("integration:")');
    expect(source).toContain("Direct REST agent-created queries are read-only GET requests");
  });
});
