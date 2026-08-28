import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const panel = readFileSync(
  fileURLToPath(new URL("../../../components/tools-framework/AppStudioPanel.jsx", import.meta.url)),
  "utf8",
);

describe("App Studio release history UI", () => {
  it("shows immutable release history and supports making an older version live", () => {
    expect(panel).toContain("publishExistingStudioRelease");
    expect(panel).toContain("Versions");
    expect(panel).toContain("Make live");
    expect(panel).toContain("immutable snapshot");
  });

  it("distinguishes the currently published release", () => {
    expect(panel).toContain("document.app.published_release_id === item.id");
    expect(panel).toContain(">Live<");
  });
});
