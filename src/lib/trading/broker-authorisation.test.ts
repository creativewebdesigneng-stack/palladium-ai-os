import { describe, expect, it } from "vitest";
import { brokerExecutionDecision } from "./broker-authorisation";

describe("trading broker authorisation", () => {
  it("keeps execution on paper when authorisation is absent", () => {
    const decision = brokerExecutionDecision({});
    expect(decision).toMatchObject({ mode: "paper", liveExecution: false, authorised: false });
    expect(decision.reason).toContain("Paper simulation");
  });

  it("records explicit authorisation without placing a live order", () => {
    const decision = brokerExecutionDecision({ TRADING_BROKER_EXECUTION_AUTHORIZED: "true" });
    expect(decision.authorised).toBe(true);
    expect(decision.liveExecution).toBe(false);
    expect(decision.reason).toContain("No live order was sent");
  });

  it("ignores any value other than the explicit true flag", () => {
    expect(
      brokerExecutionDecision({ TRADING_BROKER_EXECUTION_AUTHORIZED: "TRUE" }).authorised,
    ).toBe(false);
    expect(brokerExecutionDecision({ TRADING_BROKER_EXECUTION_AUTHORIZED: "1" }).authorised).toBe(
      false,
    );
  });
});
