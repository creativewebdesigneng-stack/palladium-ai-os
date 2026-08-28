import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("App Studio clone wiring", () => {
  it("exposes duplication in the editor", () => {
    const panel = read("src/components/tools-framework/AppStudioPanel.jsx");
    expect(panel).toContain('cloneStudioApp');
    expect(panel).toContain('preserveConnectionRefs: true');
    expect(panel).toContain('Application duplicated');
    expect(panel).toContain('>Duplicate</button>');
  });

  it("keeps cloning owner scoped, bounded, and draft only", () => {
    const clone = read("src/lib/app-studio/app-studio-clone.functions.ts");
    expect(clone).toContain('.eq("user_id", context.userId)');
    expect(clone).toContain('bounded(pagesResult.data, 100');
    expect(clone).toContain('bounded(widgetsResult.data, 1000');
    expect(clone).toContain('bounded(datasourcesResult.data, 100');
    expect(clone).toContain('bounded(queriesResult.data, 500');
    expect(clone).toContain('status: "draft"');
    expect(clone).toContain('published_release_id: null');
    expect(clone).toContain('preserveConnectionRefs');
  });
});
