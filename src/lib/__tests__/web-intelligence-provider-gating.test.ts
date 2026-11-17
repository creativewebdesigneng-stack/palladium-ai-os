import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const screen = readFileSync(new URL("../../screens/WebIntelligence.jsx", import.meta.url), "utf8");
const server = readFileSync(new URL("../web/web-intelligence.server.ts", import.meta.url), "utf8");

describe("Web Intelligence provider gating", () => {
  it("does not submit a job unless the selected provider is configured", () => {
    expect(screen).toContain("caps?.[provider]?.configured !== true");
    expect(screen).toContain("disabled={busy || !source.trim() || !providerReady}");
  });

  it("shows the exact server-side setup needed for each missing provider", () => {
    expect(screen).toContain("FIRECRAWL_API_KEY");
    expect(screen).toContain("CRAWLEE_WORKER_URL");
    expect(screen).toContain("CRAWLEE_WORKER_TOKEN");
  });

  it("derives provider readiness from server-only endpoint and token configuration", () => {
    expect(server).toContain("Boolean(connection('firecrawl'))");
    expect(server).toContain("Boolean(connection('crawlee'))");
  });
});
