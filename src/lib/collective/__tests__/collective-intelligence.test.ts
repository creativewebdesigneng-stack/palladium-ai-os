import { describe, expect, it } from "vitest";
import { resolveCollectiveConsensus } from "../collective-intelligence";

describe("Blackstar collective intelligence", () => {
  it("selects the strongest supported answer with provenance", () => {
    const result = resolveCollectiveConsensus([
      { agentId: "a1", canonicalId: "blackstar:a1", answerKey: "approve", confidence: 0.9, evidenceRefs: ["doc:1"] },
      { agentId: "a2", canonicalId: "blackstar:a2", answerKey: "approve", confidence: 0.8, evidenceRefs: ["doc:2", "doc:1"] },
      { agentId: "a3", canonicalId: "blackstar:a3", answerKey: "reject", confidence: 0.7, evidenceRefs: ["doc:3"] },
    ]);
    expect(result.status).toBe("consensus");
    expect(result.selectedAnswerKey).toBe("approve");
    expect(result.agreementRatio).toBeCloseTo(2 / 3);
    expect(result.evidenceRefs).toEqual(["doc:1", "doc:2"]);
    expect(result.dissentingAgentIds).toEqual(["a3"]);
  });

  it("marks a tied population as contested and resolves deterministically", () => {
    const result = resolveCollectiveConsensus([
      { agentId: "a1", canonicalId: "blackstar:a1", answerKey: "beta", confidence: 0.8, evidenceRefs: [] },
      { agentId: "a2", canonicalId: "blackstar:a2", answerKey: "alpha", confidence: 0.8, evidenceRefs: [] },
    ]);
    expect(result.status).toBe("contested");
    expect(result.selectedAnswerKey).toBe("alpha");
  });

  it("rejects duplicate specialists", () => {
    expect(() => resolveCollectiveConsensus([
      { agentId: "a1", canonicalId: "blackstar:a1", answerKey: "x", confidence: 0.6, evidenceRefs: [] },
      { agentId: "a1", canonicalId: "blackstar:a2", answerKey: "y", confidence: 0.7, evidenceRefs: [] },
    ])).toThrow("COLLECTIVE_DUPLICATE_AGENT");
  });

  it("requires independent proposals", () => {
    expect(() => resolveCollectiveConsensus([
      { agentId: "a1", canonicalId: "blackstar:a1", answerKey: "x", confidence: 0.6, evidenceRefs: [] },
    ])).toThrow("COLLECTIVE_INSUFFICIENT_PROPOSALS");
  });
});
