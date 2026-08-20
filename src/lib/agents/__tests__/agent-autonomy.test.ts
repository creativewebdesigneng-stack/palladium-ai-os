import { describe, expect, it } from "vitest";
import { normaliseAutonomyLevel } from "../agent-autonomy";

describe("normaliseAutonomyLevel", () => {
  it("maps the legacy supervised value to approval_required", () => {
    expect(normaliseAutonomyLevel("supervised")).toBe("approval_required");
  });

  it("defaults missing autonomy to approval_required", () => {
    expect(normaliseAutonomyLevel()).toBe("approval_required");
  });

  it.each(["assist", "prepare", "execute", "approval_required"])(
    "preserves the valid database enum value %s",
    (value) => {
      expect(normaliseAutonomyLevel(value)).toBe(value);
    },
  );

  it("rejects unknown autonomy values before they reach Supabase", () => {
    expect(() => normaliseAutonomyLevel("fully_autonomous")).toThrow("Unknown autonomy level");
  });
});
