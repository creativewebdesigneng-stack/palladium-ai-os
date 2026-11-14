import { describe, expect, it } from "vitest";
import { mergeIndustryOperatingPicture } from "./industry-operating-picture";

const workspace = {
  id: "8c1b0c2e-6d4a-4f4e-9b2a-1a2b3c4d5e6f",
  name: "North mill",
  industry: "Manufacturing & Industry",
  geography: "GB",
  objectives: "Reduce changeover time",
  risks: [{ name: "Single supplier" }],
  roadmap: [{ name: "Pilot" }],
  benchmark: { note: "kept" },
  disruption_signals: [{ lens: "Energy" }],
};

describe("industry operating picture persistence", () => {
  it("stores the live picture and keeps unrelated workspace records", () => {
    const saved = mergeIndustryOperatingPicture(workspace, {
      maturity: { Strategy: 4, Data: 2, Ignored: 9 },
      suppliers: [{ name: "Supplier A", score: 75 }],
      growth: { marginPct: 30 },
      opportunities: [{ name: "Automation", score: 80 }],
    });
    expect(saved.maturity).toEqual({ Strategy: 4, Data: 2 });
    expect(saved.supplier_assessments).toEqual([{ name: "Supplier A", score: 75 }]);
    expect(saved.opportunities).toEqual([{ name: "Automation", score: 80 }]);
    expect(saved.benchmark).toEqual({ note: "kept", growth: { marginPct: 30 } });
    expect(saved.risks).toEqual([{ name: "Single supplier" }]);
    expect(saved.roadmap).toEqual([{ name: "Pilot" }]);
    expect(saved.disruption_signals).toEqual([{ lens: "Energy" }]);
    expect(saved.objectives).toBe("Reduce changeover time");
  });

  it("refuses to invent a workspace", () => {
    expect(() => mergeIndustryOperatingPicture({ ...workspace, name: "  " }, {})).toThrow(
      "saved industry workspace",
    );
  });
});
