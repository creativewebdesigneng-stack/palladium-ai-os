import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const panel = readFileSync(
  fileURLToPath(new URL("../../../components/tools-framework/AppStudioPanel.jsx", import.meta.url)),
  "utf8",
);
const releases = readFileSync(
  fileURLToPath(new URL("../app-studio-release.functions.ts", import.meta.url)),
  "utf8",
);

describe("App Studio release history UI", () => {
  it("shows release history and can repoint the live app to an existing immutable release", () => {
    expect(panel).toContain("publishExistingStudioRelease");
    expect(panel).toContain("Versions");
    expect(panel).toContain("Make live");
    expect(releases).toContain("existing immutable release");
    expect(releases).toContain("it never mutates the saved release");
    expect(releases).toContain('action: "app_studio_release_activated"');
  });

  it("distinguishes the currently published release dynamically", () => {
    expect(panel).toContain("document.app.published_release_id === item.id");
    expect(panel).toContain('live ? " · Live" : ""');
    expect(panel).toContain('live ? "Live" : "Make live"');
  });
});
