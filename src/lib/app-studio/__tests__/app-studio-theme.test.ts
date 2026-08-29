import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const functions = readFileSync(fileURLToPath(new URL("../app-studio-theme.functions.ts", import.meta.url)), "utf8");
const renderer = readFileSync(fileURLToPath(new URL("../../../screens/PublishedStudioApp.jsx", import.meta.url)), "utf8");

describe("App Studio themes", () => {
  it("accepts bounded colors and an allow-listed font only", () => {
    expect(functions).toContain('/^#[0-9a-fA-F]{6}$/');
    expect(functions).toContain('["Inter", "system-ui", "Arial", "Georgia", "monospace"]');
    expect(functions).toContain('.eq("user_id", context.userId)');
  });

  it("applies saved background, foreground, accent and font settings to published apps", () => {
    expect(renderer).toContain('const accent = theme.accent || "#4f46e5"');
    expect(renderer).toContain("backgroundColor: theme.background");
    expect(renderer).toContain("color: theme.foreground");
    expect(renderer).toContain("fontFamily: theme.fontFamily");
    expect(renderer).toContain("accent={accent}");
  });
});
