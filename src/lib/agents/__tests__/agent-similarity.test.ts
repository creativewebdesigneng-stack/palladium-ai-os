import { describe, expect, it } from "vitest";
import {
  similaritySelectionBonus,
  summariseSimilarPerformance,
  taskSimilarity,
} from "../agent-performance";

describe("agent task similarity intelligence", () => {
  it("recognises meaningful overlap between a new goal and historical tasks", () => {
    expect(taskSimilarity("research competitors and market evidence", "research market competitors with web evidence")).toBeGreaterThan(0.5);
    expect(taskSimilarity("research competitors", "refactor typescript authentication middleware")).toBe(0);
  });

  it("rewards verified success on similar historical work", () => {
    const tasks = Array.from({ length: 8 }, (_, index) => ({
      agent_id: "researcher",
      status: index < 7 ? "succeeded" : "failed",
      input: `Research competitors and market evidence for sector ${index}`,
      verification_state: { score: index < 7 ? 0.94 : 0.3 },
      replan_count: index < 6 ? 0 : 1,
      duration_ms: 1400 + index * 20,
    }));
    const snapshot = summariseSimilarPerformance(
      "researcher",
      "Research competitors and market evidence",
      tasks,
    );
    expect(snapshot.similarity_runs).toBe(8);
    expect(snapshot.average_similarity).toBeGreaterThan(0.5);
    expect(snapshot.similarity_score).toBeGreaterThan(0.5);
    expect(similaritySelectionBonus(snapshot)).toBeGreaterThan(0);
  });

  it("does not reward unrelated history or a single matching run", () => {
    const unrelated = summariseSimilarPerformance("agent-a", "research competitors", [
      { agent_id: "agent-a", status: "succeeded", input: "implement typescript auth", verification_state: { score: 1 } },
    ]);
    expect(unrelated.similarity_runs).toBe(0);
    expect(similaritySelectionBonus(unrelated)).toBe(0);

    const tiny = summariseSimilarPerformance("agent-a", "research competitors", [
      { agent_id: "agent-a", status: "succeeded", input: "research competitors", verification_state: { score: 1 } },
    ]);
    expect(tiny.similarity_runs).toBe(1);
    expect(similaritySelectionBonus(tiny)).toBe(0);
  });
});
