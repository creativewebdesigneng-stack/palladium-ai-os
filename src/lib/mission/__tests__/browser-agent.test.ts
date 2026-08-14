import { describe, expect, it } from "vitest";
import { createSimulatedBrowserTool, guardBrowserTool } from "../browser-agent";

const config = {
  allowedDomains: ["example.com"],
  allowedTools: ["browser"],
};

describe("browser allow-list boundary", () => {
  it("blocks direct simulated browser actions outside the agent allow-list", async () => {
    const tool = createSimulatedBrowserTool(config);

    expect((await tool.navigate("https://internal.test/")).ok).toBe(false);
    expect((await tool.extract("https://internal.test/")).text).toContain("blocked");
    expect((await tool.fillForm("https://internal.test/", { email: "a@example.com" })).ok).toBe(
      false,
    );
    await expect(
      tool.prepareCheckout({
        product: "Test item",
        price: 10,
        currency: "GBP",
        seller: "Test seller",
        delivery: "None",
        deliveryCost: 0,
        rating: 5,
        url: "https://internal.test/checkout",
        inStock: true,
        specs: {},
        reason: "Test",
      }),
    ).rejects.toThrow("allow-list");
  });

  it("guards an adapter that returns a disallowed checkout redirect", async () => {
    const base = createSimulatedBrowserTool(config);
    const tool = guardBrowserTool(
      {
        ...base,
        async prepareCheckout(offer) {
          return {
            ...(await base.prepareCheckout(offer)),
            checkoutUrl: "https://internal.test/checkout",
          };
        },
      },
      config,
    );

    await expect(
      tool.prepareCheckout({
        product: "Test item",
        price: 10,
        currency: "GBP",
        seller: "Example",
        delivery: "None",
        deliveryCost: 0,
        rating: 5,
        url: "https://example.com/checkout",
        inStock: true,
        specs: {},
        reason: "Test",
      }),
    ).rejects.toThrow("allowlist");
  });
});
