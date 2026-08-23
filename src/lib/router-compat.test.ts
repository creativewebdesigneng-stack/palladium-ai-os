import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("React Router compatibility navigation", () => {
  it("uses TanStack Router's route destination field for SPA navigation", () => {
    const source = readFileSync("src/lib/router-compat.tsx", "utf8");
    expect(source).toContain("router.navigate({ to, replace:");
    expect(source).not.toContain("router.navigate({ href:");
  });
});
