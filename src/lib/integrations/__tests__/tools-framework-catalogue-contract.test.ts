import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const screen = readFileSync(
  fileURLToPath(new URL("../../../screens/ToolsFramework.jsx", import.meta.url)),
  "utf8",
);
const tab = readFileSync(
  fileURLToPath(new URL("../../../components/tools-framework/IntegrationsTab.jsx", import.meta.url)),
  "utf8",
);
const maps = readFileSync(
  fileURLToPath(new URL("../../../components/tools-framework/toolsData.jsx", import.meta.url)),
  "utf8",
);
const api = readFileSync(
  fileURLToPath(new URL("../integrations.functions.ts", import.meta.url)),
  "utf8",
);

describe("Tools Framework integration catalogue", () => {
  it("uses the canonical authenticated backend provider catalogue", () => {
    expect(api).toContain("INTEGRATION_PROVIDERS.map");
    expect(api).toContain("return { integrations: rows ?? [], catalogue }");
    expect(screen).toContain("integRes.catalogue");
    expect(screen).toContain("integrationCatalogue");
    expect(tab).toContain("catalogue.map");
    expect(tab).toContain("def.configured");
    expect(tab).toContain("def.connection");
  });

  it("keeps presentation maps free of a second provider catalogue", () => {
    expect(maps).not.toContain("export const INTEGRATIONS");
    expect(maps).not.toContain("Google Workspace");
    expect(maps).not.toContain("Microsoft 365");
  });
});
