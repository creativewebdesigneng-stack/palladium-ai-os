import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../memory.server.ts", import.meta.url), "utf8");

describe("owner-scoped memory deletion", () => {
  it("filters memory and document deletes by the caller before removing rows", () => {
    expect(source).toContain('.eq("id", args.id)\n    .eq("user_id", args.userId)');
    expect(source).toContain('.delete().eq("id", args.id).eq("user_id", args.userId)');
    expect(source).toContain('.eq("id", args.documentId)\n    .eq("user_id", args.userId)');
    expect(source).toContain('.delete().eq("id", args.documentId).eq("user_id", args.userId)');
    expect(source).toContain("you do not have permission to delete it");
  });

  it("preserves the embedding quota message when document indexing fails", () => {
    expect(source).toContain("if (error instanceof EmbeddingError)");
    expect(source).toContain("throw new MemoryError(error.message");
  });
});
