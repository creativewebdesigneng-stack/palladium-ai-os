import { describe, expect, it } from "vitest";
import { evaluatePersonalOsAction } from "../personal-policy";

const policy = {
  maxDailySpendMicros: 500_000,
  requireApprovalForMessages: true,
  requireApprovalForPurchases: true,
  requireApprovalForExternalWrites: true,
  allowedCapabilities: ["calendar", "research", "support"],
  quietHoursStart: 22,
  quietHoursEnd: 7,
};

describe("Blackstar Personal OS policy", () => {
  it("allows bounded read-only assistance", () => {
    expect(evaluatePersonalOsAction(policy, {
      capability: "research",
      dailySpendMicros: 10_000,
      estimatedCostMicros: 5_000,
      sendsMessage: false,
      purchase: false,
      externalWrite: false,
      localHour: 12,
      urgent: false,
    })).toEqual({ allowed: true, requiresApproval: false, blockers: [] });
  });

  it("requires approval before messaging", () => {
    const result = evaluatePersonalOsAction(policy, {
      capability: "support",
      dailySpendMicros: 0,
      estimatedCostMicros: 0,
      sendsMessage: true,
      purchase: false,
      externalWrite: true,
      localHour: 12,
      urgent: false,
    });
    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(true);
  });

  it("blocks non-urgent actions during quiet hours", () => {
    const result = evaluatePersonalOsAction(policy, {
      capability: "calendar",
      dailySpendMicros: 0,
      estimatedCostMicros: 0,
      sendsMessage: false,
      purchase: false,
      externalWrite: false,
      localHour: 23,
      urgent: false,
    });
    expect(result.blockers).toContain("quiet_hours");
  });

  it("blocks unapproved capability scopes", () => {
    const result = evaluatePersonalOsAction(policy, {
      capability: "banking",
      dailySpendMicros: 0,
      estimatedCostMicros: 0,
      sendsMessage: false,
      purchase: false,
      externalWrite: false,
      localHour: 12,
      urgent: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.blockers).toContain("capability_not_allowed");
  });
});
