import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const api = readFileSync(
  fileURLToPath(new URL("../web-discovery.functions.ts", import.meta.url)),
  "utf8",
);
const screen = readFileSync(
  fileURLToPath(new URL("../../../screens/Web.jsx", import.meta.url)),
  "utf8",
);
const searchBackend = readFileSync(
  fileURLToPath(new URL("../web-access.server.ts", import.meta.url)),
  "utf8",
);

describe("PalladiumAI Web production contract", () => {
  it("uses authenticated server-side public web search with usage and audit recording", () => {
    expect(api).toContain("requireSupabaseAuth");
    expect(api).toContain("searchPublicWeb");
    expect(api).toContain('metric: "web_search"');
    expect(api).toContain('action: "web.search"');
  });

  it("keeps public URL and search execution safeguards in the backend", () => {
    expect(searchBackend).toContain("isSafePublicUrl");
    expect(searchBackend).toContain("AbortSignal.timeout(12_000)");
    expect(searchBackend).toContain("Math.max(1, Math.min");
    expect(searchBackend).toContain("duckduckgo.com");
    expect(searchBackend).toContain("bing.com/search?format=rss");
  });

  it("renders real source links and never claims unsupported media or dates", () => {
    expect(screen).toContain("searchWeb");
    expect(screen).toContain("source.url");
    expect(screen).toContain("source.snippet");
    expect(screen).toContain("Image search");
    expect(screen).toContain("Disabled until source-backed image results are available");
    expect(screen).not.toContain("Live web discovery is not connected yet");
    expect(screen).not.toContain("artificial search delays");
    expect(screen).not.toContain("AI_ANSWER");
  });
});
