import { describe, expect, it } from "vitest";
import { mergeCompanyStrategyAgenda } from "./company-strategy";

describe("company strategy agenda", () => {
  it("adds the objective and replaces priorities without dropping the rest of the workspace", () => {
    const saved = mergeCompanyStrategyAgenda(
      {
        id: "8c1b0c2e-6d4a-4f4e-9b2a-1a2b3c4d5e6f",
        name: "Northstar",
        stage: "grow",
        objectives: ["Keep margin"],
        risks: ["Concentration"],
        kpis: [{ name: "Revenue" }],
        leadership_cadence: { notes: "Monthly" },
        mission: "Serve operators",
      },
      {
        goal: "Grow revenue while protecting margin",
        horizon: "12 months",
        priorities: ["Revenue growth", "Margin improvement"],
      },
    );
    expect(saved.objectives).toEqual(["Keep margin", "Grow revenue while protecting margin"]);
    expect(saved.priorities).toEqual(["Revenue growth", "Margin improvement"]);
    expect(saved.risks).toEqual(["Concentration"]);
    expect(saved.kpis).toEqual([{ name: "Revenue" }]);
    expect(saved.leadership_cadence).toEqual({ notes: "Monthly", horizon: "12 months" });
    expect(saved.mission).toBe("Serve operators");
    expect(saved.stage).toBe("grow");
  });

  it("does not duplicate an objective that is already stored", () => {
    const saved = mergeCompanyStrategyAgenda(
      {
        id: "8c1b0c2e-6d4a-4f4e-9b2a-1a2b3c4d5e6f",
        name: "Northstar",
        objectives: ["Grow revenue"],
      },
      { goal: "Grow revenue", horizon: "6 months", priorities: [] },
    );
    expect(saved.objectives).toEqual(["Grow revenue"]);
  });
});
