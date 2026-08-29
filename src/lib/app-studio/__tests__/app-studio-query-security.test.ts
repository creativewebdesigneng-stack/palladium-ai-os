import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const runtime = readFileSync(
  fileURLToPath(new URL("../app-studio-query.server.ts", import.meta.url)),
  "utf8",
);

describe("App Studio public datasource safety", () => {
  it("keeps direct REST execution read-only", () => {
    expect(runtime).toContain('source.provider === "rest" && operation !== "get"');
    expect(runtime).toContain("Direct REST datasources are read-only");
  });

  it("rejects GraphQL mutations and subscriptions before fetch", () => {
    expect(runtime).toContain("assertGraphqlReadOnlyDocument");
    expect(runtime).toContain('/\\bmutation\\b/i');
    expect(runtime).toContain('/\\bsubscription\\b/i');
    expect(runtime).toContain("Direct GraphQL datasources are read-only");
    expect(runtime.indexOf("assertGraphqlReadOnlyDocument")).toBeLessThan(runtime.lastIndexOf("await fetch(url"));
  });

  it("retains public-endpoint validation, redirect denial and response bounds", () => {
    expect(runtime).toContain("validateExternalMcpEndpoint");
    expect(runtime).toContain("assertPublicMcpEndpoint");
    expect(runtime).toContain('redirect: "manual"');
    expect(runtime).toContain("MAX_RESULT_BYTES = 1_000_000");
  });
});
