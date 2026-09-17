import { describe, expect, it } from "vitest";
import { phoneAutomationPolicy } from "./automation-policy";

describe("phone automation policy", () => {
  it("maps agent events to agent updates without calling for routine starts", () => {
    expect(phoneAutomationPolicy("agent.started", "info")).toEqual({
      purpose: "agent_update",
      push: true,
      sms: false,
      voice: false,
    });
  });

  it("escalates agent input requests to SMS and voice", () => {
    expect(phoneAutomationPolicy("agent.input_required", "warning")).toEqual({
      purpose: "agent_update",
      push: true,
      sms: true,
      voice: true,
    });
  });

  it("uses business delivery for critical business events", () => {
    expect(phoneAutomationPolicy("payment.failed", "critical")).toEqual({
      purpose: "business_update",
      push: true,
      sms: true,
      voice: true,
    });
  });

  it("maps project completion to project push and SMS without an automatic call", () => {
    expect(phoneAutomationPolicy("project.completed", "success")).toEqual({
      purpose: "project_update",
      push: true,
      sms: true,
      voice: false,
    });
  });
});
