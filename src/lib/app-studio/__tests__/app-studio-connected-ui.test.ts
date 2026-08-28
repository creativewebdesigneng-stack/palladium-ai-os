import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const panel = readFileSync(
  fileURLToPath(new URL("../../../components/tools-framework/AppStudioPanel.jsx", import.meta.url)),
  "utf8",
);

describe("App Studio connected datasource UI", () => {
  it("offers public, MCP and integration datasource types", () => {
    expect(panel).toContain('["rest", "graphql", "mcp", "integration"]');
    expect(panel).toContain('placeholder={datasourceProvider === "mcp" ? "mcp:<server-id>" : "integration:<provider>"}');
  });

  it("lets the user select the datasource used by a query", () => {
    expect(panel).toContain("selectedDatasourceId");
    expect(panel).toContain("selectedDatasource");
    expect(panel).toContain("Select datasource");
  });

  it("requires a read-only GraphQL document and never collects credentials", () => {
    expect(panel).toContain("Enter a read-only GraphQL query document.");
    expect(panel).toContain('placeholder="query { ... }"');
    expect(panel).not.toMatch(/password|api key|access token/i);
  });
});
