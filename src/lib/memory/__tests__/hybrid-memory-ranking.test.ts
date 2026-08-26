import { describe, expect, it } from "vitest";
import { rankHybridMemoryHits, type HybridMemoryHit } from "../hybrid-memory-ranking";

function hit(
  id: string,
  similarity: number,
  content: string,
  extra: Partial<HybridMemoryHit> = {},
): HybridMemoryHit {
  return { id, similarity, content, kind: "memory", ...extra };
}

describe("rankHybridMemoryHits", () => {
  it("includes an exact keyword-only hit even when semantic results exist", () => {
    const result = rankHybridMemoryHits({
      query: "SKU-8842",
      limit: 5,
      semantic: [hit("semantic", 0.41, "General inventory policy")],
      keyword: [hit("exact", 0, "Warehouse item SKU-8842 is reserved")],
    });

    expect(result.map((row) => row.id)).toContain("exact");
  });

  it("deduplicates a memory returned by both retrieval paths and preserves semantic similarity", () => {
    const semantic = hit("same", 0.73, "Project Palladium launch notes");
    const result = rankHybridMemoryHits({
      query: "Palladium",
      limit: 5,
      semantic: [semantic],
      keyword: [hit("same", 0, "Project Palladium launch notes")],
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("same");
    expect(result[0]?.similarity).toBe(0.73);
  });

  it("keeps a strong semantic result ahead of a weaker lexical-only result", () => {
    const result = rankHybridMemoryHits({
      query: "customer refund process",
      limit: 5,
      semantic: [hit("semantic", 0.91, "Returns and reimbursements workflow")],
      keyword: [hit("keyword", 0, "customer refund process")],
    });

    expect(result[0]?.id).toBe("semantic");
  });

  it("uses lexical evidence to lift an exact identifier above only weak semantic matches", () => {
    const result = rankHybridMemoryHits({
      query: "ORDER-77A",
      limit: 5,
      semantic: [hit("weak", 0.19, "Old order handling notes")],
      keyword: [hit("exact", 0, "Escalation record for ORDER-77A")],
    });

    expect(result[0]?.id).toBe("exact");
  });

  it("respects the requested limit deterministically", () => {
    const result = rankHybridMemoryHits({
      query: "alpha",
      limit: 2,
      semantic: [hit("a", 0.8, "alpha one"), hit("b", 0.7, "alpha two")],
      keyword: [hit("c", 0, "alpha three")],
    });

    expect(result).toHaveLength(2);
  });

  it("keeps document chunks distinct and does not collide them with memory rows", () => {
    const result = rankHybridMemoryHits({
      query: "policy",
      limit: 5,
      semantic: [
        hit("shared-id", 0.6, "memory policy"),
        hit("shared-id", 0.65, "document policy", { kind: "document", document_id: "doc-1" }),
      ],
      keyword: [],
    });

    expect(result).toHaveLength(2);
    expect(result.map((row) => row.kind).sort()).toEqual(["document", "memory"]);
  });
});
