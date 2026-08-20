import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const documentsRoot = resolve(here, "../../..");

function source(path: string) {
  return readFileSync(resolve(documentsRoot, path), "utf8");
}

describe("Documents production workspace contract", () => {
  it("keeps document CRUD owner scoped on the authenticated user", () => {
    const functions = source("lib/documents/documents.functions.ts");
    expect(functions).toContain('.eq("user_id", context.userId)');
    expect(functions).toContain('user_id: context.userId');
    expect(functions).toContain('requireSupabaseAuth');
    expect(functions).toContain('from("user_documents")');
  });

  it("persists AI output only after the model completes", () => {
    const functions = source("lib/documents/documents.functions.ts");
    const runIndex = functions.indexOf("await runChat(");
    const generatedInsertIndex = functions.indexOf('.from("user_documents")', runIndex);
    expect(runIndex).toBeGreaterThan(-1);
    expect(generatedInsertIndex).toBeGreaterThan(runIndex);
    expect(functions).toContain("The AI provider is rate limiting this workspace");
  });

  it("has no reachable mock dataset or timer simulation in Documents UI", () => {
    const files = [
      "screens/Documents.jsx",
      "components/documents/DocumentsViews.jsx",
      "components/documents/DocumentsToolbar.jsx",
      "components/documents/DocumentTypes.jsx",
      "components/documents/AIDocumentsPanel.jsx",
      "components/documents/documentsConfig.jsx",
    ];
    const combined = files.map(source).join("\n");
    expect(combined).not.toContain("documentsData");
    expect(combined).not.toContain("Mock data");
    expect(combined).not.toContain("setTimeout(");
    expect(combined).not.toContain("illustrative mock data");
  });

  it("keeps starter prompts separate from persisted document metrics", () => {
    const config = source("components/documents/documentsConfig.jsx");
    const functions = source("lib/documents/documents.functions.ts");
    expect(config).toContain("STARTER_PROMPTS");
    expect(functions).toContain("documentMetrics");
    expect(functions).not.toContain("STARTER_PROMPTS");
  });
});
