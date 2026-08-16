import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/screens/Workforce.jsx", "utf8");

describe("Workforce header action navigation", () => {
  it("routes task assignment into the real Mission Control task flow", () => {
    expect(source).toContain('to="/mission-control"');
    expect(source).toContain("gate('runTasks')");
  });

  it("routes agent creation into the real agent wizard", () => {
    expect(source).toContain('to="/agents/new"');
    expect(source).toContain("gate('createAgents')");
  });
});
