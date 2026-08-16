import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/lib/stripe.server.ts", "utf8");

describe("server billing mode contract", () => {
  it("keeps the billing mode decision on the server", () => {
    expect(source).toContain('process.env["PAYMENTS_ENVIRONMENT"]');
    expect(source).toContain("configured for ${serverEnv} mode");
  });
});
