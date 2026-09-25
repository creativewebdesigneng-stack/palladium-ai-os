import { describe, expect, it } from "vitest";
import {
  buildBrowserTaskComputerUsePlan,
  buildRecordedSessionComputerUsePlan,
  summarizeBrowserComputerUsePlan,
} from "../browser-computer-use-policy.server";

describe("Blackstar browser computer-use policy", () => {
  it("allows governed browser reads on allow-listed domains", () => {
    const plan = buildBrowserTaskComputerUsePlan({
      url: "https://example.com",
      steps: [
        { action: "navigate", url: "https://example.com/products" },
        { action: "read", url: "https://example.com/products" },
      ],
    }, ["example.com"]);

    expect(plan.executable).toBe(true);
    expect(plan.blockedCount).toBe(0);
  });

  it("blocks model-controlled navigation outside the agent allow-list", () => {
    const plan = buildBrowserTaskComputerUsePlan({
      steps: [{ action: "navigate", url: "https://evil.example" }],
    }, ["example.com"]);

    expect(plan.executable).toBe(false);
    expect(plan.blockedCount).toBe(1);
    expect(plan.decisions[0]?.reason).toContain("allow-list");
  });

  it("blocks sensitive model-controlled typing", () => {
    const plan = buildBrowserTaskComputerUsePlan({
      steps: [{ action: "type", selector: "#password", text: "secret" }],
    }, ["example.com"]);

    expect(plan.executable).toBe(false);
    expect(plan.decisions[0]?.risk).toBe("blocked");
  });

  it("leaves trusted server-side login/download actions to their existing boundaries", () => {
    const plan = buildBrowserTaskComputerUsePlan({
      steps: [
        { action: "login", credential_id: "cred-1" },
        { action: "download", label: "Invoice" },
        { action: "read", url: "https://example.com/account" },
      ],
    }, ["example.com"]);

    expect(plan.decisions).toHaveLength(1);
    expect(plan.executable).toBe(true);
  });

  it("keeps trusted-only login/download tasks executable", () => {
    const plan = buildBrowserTaskComputerUsePlan({
      steps: [
        { action: "login", credential_id: "cred-1" },
        { action: "download", label: "Invoice" },
      ],
    }, ["example.com"]);

    expect(plan.decisions).toHaveLength(0);
    expect(plan.executable).toBe(true);
    expect(plan.blockedCount).toBe(0);
  });
});

describe("recorded browser session computer-use verdict", () => {
  it("scores allow-listed recorded navigation as executable", () => {
    const plan = buildRecordedSessionComputerUsePlan([
      { kind: "navigate", target: "https://example.com/products" },
      { kind: "read", target: "https://example.com/products" },
    ], ["example.com"]);

    expect(plan.executable).toBe(true);
    expect(summarizeBrowserComputerUsePlan(plan).reviewedSteps).toBe(2);
  });

  it("blocks recorded checkout preparation rather than treating it as a generic click", () => {
    const plan = buildRecordedSessionComputerUsePlan([
      { kind: "prepare_checkout", target: "https://example.com/checkout" },
      { kind: "navigate", target: "https://evil.example/pay" },
    ], ["example.com"]);

    expect(plan.executable).toBe(false);
    expect(plan.blockedCount).toBeGreaterThan(0);
  });
});
