import { describe, expect, it } from "vitest";
import type { BrowserTool } from "@/lib/mission/browser-agent";
import { runBoundedBrowserTask } from "../browser-task.server";

function fakeBrowser(overrides: Partial<BrowserTool> = {}) {
  const calls: string[] = [];
  const tool: BrowserTool = {
    provider: "test",
    kind: "production",
    steps: () => [],
    async navigate(url) {
      calls.push(`navigate:${url}`);
      return { ok: true, url, simulated: false };
    },
    async search() {
      return [];
    },
    async click(selector) {
      calls.push(`click:${selector}`);
      return { ok: true, simulated: false };
    },
    async type(selector, value) {
      calls.push(`type:${selector}:${value}`);
      return { ok: true, simulated: false };
    },
    async scroll(direction, amount) {
      calls.push(`scroll:${direction}:${amount ?? 1}`);
      return { ok: true, simulated: false };
    },
    async extract(url, selector) {
      calls.push(`extract:${url}:${selector ?? ""}`);
      return { url, text: "Dashboard Ready", items: [], simulated: false };
    },
    async screenshot() {
      calls.push("screenshot");
      return { ok: true, dataUrl: "data:image/png;base64,test", simulated: false };
    },
    async back() {
      return { url: "https://example.com/back", simulated: false };
    },
    async forward() {
      return { url: "https://example.com/forward", simulated: false };
    },
    async wait(ms) {
      calls.push(`wait:${ms}`);
      return { ok: true };
    },
    async close() {},
    async read(url) {
      calls.push(`read:${url}`);
      return { url, text: "Dashboard Ready", simulated: false };
    },
    async compare(offers) {
      return offers;
    },
    async fillForm() {
      return { ok: true };
    },
    async prepareCheckout(offer) {
      return {
        product: offer.product,
        seller: offer.seller,
        itemPrice: offer.price,
        deliveryCost: offer.deliveryCost,
        tax: 0,
        fees: 0,
        total: offer.price + offer.deliveryCost,
        currency: offer.currency,
        checkoutUrl: offer.url,
        paymentAuthorised: false,
        simulated: false,
      };
    },
    ...overrides,
  };
  return { tool, calls };
}

describe("bounded browser task", () => {
  it("runs multiple browser steps in one tool instance and validates page state", async () => {
    const { tool, calls } = fakeBrowser();
    const result = await runBoundedBrowserTask(
      tool,
      {
        url: "https://example.com/start",
        max_steps: 5,
        steps: [
          { action: "click", selector: "#open" },
          { action: "read" },
          { action: "validate", expected_text: "dashboard ready" },
        ],
      },
      ["example.com"],
    );

    expect(result.ok).toBe(true);
    expect(result.completed_steps).toBe(3);
    expect(calls).toEqual([
      "navigate:https://example.com/start",
      "click:#open",
      "read:https://example.com/start",
      "extract:https://example.com/start:",
    ]);
  });

  it("uses a bounded fallback selector when the primary selector fails", async () => {
    const base = fakeBrowser();
    const tool = {
      ...base.tool,
      async click(selector: string) {
        base.calls.push(`click:${selector}`);
        if (selector === "#stale") throw new Error("stale selector");
        return { ok: true, simulated: false as const };
      },
    } as BrowserTool;

    const result = await runBoundedBrowserTask(
      tool,
      { steps: [{ action: "click", selector: "#stale", fallback_selector: "button[data-submit]" }] },
      ["example.com"],
    );

    expect(result.ok).toBe(true);
    expect(base.calls).toEqual(["click:#stale", "click:button[data-submit]"]);
    expect(result.outputs[0]).toMatchObject({
      action: "click",
      result: { selector: "button[data-submit]", fallback_used: true },
    });
  });

  it("fails closed before navigation when the starting domain is not allowed", async () => {
    const { tool, calls } = fakeBrowser();
    const result = await runBoundedBrowserTask(
      tool,
      { url: "https://blocked.test", steps: [{ action: "read" }] },
      ["example.com"],
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("allow-list");
    expect(calls).toEqual([]);
  });

  it("enforces the hard task step budget", async () => {
    const { tool, calls } = fakeBrowser();
    const result = await runBoundedBrowserTask(
      tool,
      {
        max_steps: 2,
        steps: [
          { action: "wait", ms: 1 },
          { action: "wait", ms: 1 },
          { action: "wait", ms: 1 },
        ],
      },
      ["example.com"],
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("budget is 2");
    expect(calls).toEqual([]);
  });

  it("stops the task when validation fails", async () => {
    const { tool } = fakeBrowser({
      async extract(url) {
        return { url, text: "Still loading", items: [], simulated: false };
      },
    });
    const result = await runBoundedBrowserTask(
      tool,
      {
        url: "https://example.com",
        steps: [
          { action: "validate", expected_text: "dashboard ready" },
          { action: "screenshot" },
        ],
      },
      ["example.com"],
    );

    expect(result.ok).toBe(false);
    expect(result.completed_steps).toBe(0);
    expect(result.failed_step).toBe(1);
    expect(result.error).toContain("validation failed");
  });

  it("refuses model-controlled typing into credential-like browser targets", async () => {
    const { tool, calls } = fakeBrowser();
    const result = await runBoundedBrowserTask(
      tool,
      {
        steps: [
          { action: "type", selector: "input[type=password]", text: "model-secret" },
        ],
      },
      ["example.com"],
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("trusted server-side credential integration");
    expect(calls).toEqual([]);
  });
});
