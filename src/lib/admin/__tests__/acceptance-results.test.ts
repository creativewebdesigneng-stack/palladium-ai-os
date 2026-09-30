import { describe, expect, it } from "vitest";
import { prepareOperationalAcceptanceResult } from "../acceptance-results";

describe("operational acceptance result policy", () => {
  it("derives evidence kind from the canonical gate rather than caller input", () => {
    expect(
      prepareOperationalAcceptanceResult({
        itemId: "U10",
        status: "waiting",
        evidenceReference: "",
        notes: "",
      }),
    ).toEqual({
      itemId: "U10",
      status: "waiting",
      evidenceKind: "transaction",
      evidenceReference: null,
      notes: null,
    });
  });

  it("rejects verified state without real evidence reference and explanation", () => {
    expect(() =>
      prepareOperationalAcceptanceResult({
        itemId: "U07",
        status: "verified",
        evidenceReference: "",
        notes: "Rendered.",
      }),
    ).toThrow(/evidence reference/i);
  });

  it("accepts verified state when an evidence reference and explanation exist", () => {
    expect(
      prepareOperationalAcceptanceResult({
        itemId: "U17",
        status: "verified",
        evidenceReference: "device-test-2026-10-01",
        notes: "Physical device pairing and safe fallback were observed.",
      }),
    ).toMatchObject({
      itemId: "U17",
      status: "verified",
      evidenceKind: "device",
      evidenceReference: "device-test-2026-10-01",
    });
  });

  it("requires a reproducible note for failed state", () => {
    expect(() =>
      prepareOperationalAcceptanceResult({
        itemId: "U02",
        status: "failed",
        evidenceReference: "",
        notes: "broken",
      }),
    ).toThrow(/reproducible symptom/i);
  });
});
