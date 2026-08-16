import { describe, expect, it } from "vitest";
import { parseBuilderSourceManifest } from "../builder-source.server";

function manifest(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    summary: "A safe starter implementation with explicit setup and verification steps.",
    files: [
      { path: "src/index.ts", purpose: "Application entrypoint", content: "export const ready = true;\n" },
    ],
    setup: ["Install dependencies"],
    verification: ["Run the test suite"],
    ...overrides,
  });
}

describe("Builder source manifest parsing", () => {
  it("accepts a bounded relative-path source manifest", () => {
    const parsed = parseBuilderSourceManifest(manifest());
    expect(parsed.files[0]?.path).toBe("src/index.ts");
  });

  it("rejects path traversal before any repository mutation can be queued", () => {
    expect(() => parseBuilderSourceManifest(manifest({
      files: [{ path: "../secret.txt", purpose: "unsafe", content: "nope" }],
    }))).toThrow(/unsafe or incomplete/i);
  });

  it("rejects duplicate paths", () => {
    expect(() => parseBuilderSourceManifest(manifest({
      files: [
        { path: "src/index.ts", purpose: "one", content: "one" },
        { path: "src/index.ts", purpose: "two", content: "two" },
      ],
    }))).toThrow(/unsafe or incomplete/i);
  });

  it("rejects oversized individual files", () => {
    expect(() => parseBuilderSourceManifest(manifest({
      files: [{ path: "src/large.ts", purpose: "large", content: "x".repeat(24001) }],
    }))).toThrow(/unsafe or incomplete/i);
  });
});
