import { describe, expect, it } from "vitest";
import {
  retrieveSyntheticCorpus,
  syntheticRetrievalAccuracy,
  SYNTHETIC_MEMORY_CORPUS,
} from "../synthetic-retrieval";

describe("synthetic corpus retrieval accuracy", () => {
  it("ranks the labelled document first for every held-out query", () => {
    const result = syntheticRetrievalAccuracy();
    expect(result.misses).toEqual([]);
    expect(result.accuracy).toBe(1);
  });

  it("does not return another tenant even when that tenant has the closer copy", () => {
    const hits = retrieveSyntheticCorpus("tenant acme invoice ledger 4481", "tenant-a", 5);
    expect(hits[0]?.id).toBe("invoice-ledger");
    expect(hits.map((hit) => hit.id)).not.toContain("foreign-invoice");
    expect(SYNTHETIC_MEMORY_CORPUS.some((document) => document.tenantId === "tenant-b")).toBe(true);
  });

  it("keeps another tenant off a subject that tenant does not own", () => {
    const hits = retrieveSyntheticCorpus("palladium reactor coolant valve schedule", "tenant-b", 5);
    expect(hits.map((hit) => hit.id)).not.toContain("coolant-valve");
    expect(hits.map((hit) => hit.id)).not.toContain("native-lane");
    expect(
      hits.every(
        (hit) =>
          SYNTHETIC_MEMORY_CORPUS.find((document) => document.id === hit.id)?.tenantId ===
          "tenant-b",
      ),
    ).toBe(true);
  });
});
