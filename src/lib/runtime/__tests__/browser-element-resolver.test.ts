import { describe, expect, it } from "vitest";
import type { BrowserTool } from "@/lib/mission/browser-agent";
import { resolveBrowserElementSelector } from "../browser-element-resolver.server";
import { runBoundedBrowserTask } from "../browser-task.server";

describe("browser element resolver", () => {
  it("prefers an exact accessible label and ignores disabled controls", () => {
    const result = resolveBrowserElementSelector(
      [
        { selector: "#old", tag: "button", text: "Submit order", disabled: true },
        { selector: "#submit", tag: "button", label: "Submit order", disabled: false },
        { selector: "#cancel", tag: "button", text: "Cancel" },
      ],
      "Submit order",
      "click",
    );
    expect(result.selector).toBe("#submit");
  });

  it("fails closed on an ambiguous label", () => {
    expect(() =>
      resolveBrowserElementSelector(
        [
          { selector: "#one", tag: "button", text: "Continue" },
          { selector: "#two", tag: "button", text: "Continue" },
        ],
        "Continue",
        "click",
      ),
    ).toThrow("matched multiple controls equally");
  });

  it("resolves a selector-free browser task step from the live interactive map", async () => {
    const calls: string[] = [];
    const tool: BrowserTool = {
      provider: "test",
      kind: "production",
      steps: () => [],
      navigate: async (url) => ({ ok: true, url, simulated: false }),
      search: async () => [],
      click: async (selector) => { calls.push(`click:${selector}`); return { ok: true, simulated: false }; },
      type: async () => ({ ok: true, simulated: false }),
      scroll: async () => ({ ok: true, simulated: false }),
      extract: async (url) => ({
        url,
        text: "Page",
        items: [{ selector: "button[data-testid=submit]", tag: "button", label: "Submit order", disabled: false }],
        simulated: false,
      }),
      screenshot: async () => ({ ok: true, simulated: false }),
      back: async () => ({ url: "https://example.com", simulated: false }),
      forward: async () => ({ url: "https://example.com", simulated: false }),
      wait: async () => ({ ok: true }),
      close: async () => {},
      read: async (url) => ({ url, text: "Page", simulated: false }),
      compare: async (offers) => offers,
      fillForm: async () => ({ ok: true }),
      prepareCheckout: async (offer) => ({
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
      }),
    };

    const result = await runBoundedBrowserTask(
      tool,
      { url: "https://example.com", steps: [{ action: "click", label: "Submit order" }] },
      ["example.com"],
    );

    expect(result.ok).toBe(true);
    expect(calls).toEqual(["click:button[data-testid=submit]"]);
    expect(result.outputs[1]).toMatchObject({
      result: { selector: "button[data-testid=submit]", resolved_from_label: true },
    });
  });
});
