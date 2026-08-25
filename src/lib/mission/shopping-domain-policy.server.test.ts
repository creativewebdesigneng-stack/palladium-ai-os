import { describe, expect, it } from "vitest";
import { resolveShoppingDomainsFromPermissions } from "./shopping-domain-policy.server";

describe("Mission Control shopping domain policy", () => {
  it("uses an agent custom allow-list instead of global shopping defaults", () => {
    const domains = resolveShoppingDomainsFromPermissions([
      { tool: "browser", enabled: true, allowed_domains: ["example-shop.co.uk", "WWW.Example.com"] },
      { tool: "shopping_search", enabled: true, allowed_domains: ["example-shop.co.uk", "example.com"] },
    ]);
    expect(domains).toEqual(["example-shop.co.uk", "example.com"]);
    expect(domains).not.toContain("amazon.co.uk");
  });

  it("uses the least-privilege intersection when tool policies differ", () => {
    const domains = resolveShoppingDomainsFromPermissions([
      { tool: "browser", enabled: true, allowed_domains: ["shop-a.test", "shared.test"] },
      { tool: "shopping_search", enabled: true, allowed_domains: ["shop-b.test", "shared.test"] },
      { tool: "checkout", enabled: true, allowed_domains: ["shared.test"] },
    ]);
    expect(domains).toEqual(["shared.test"]);
  });

  it("fails closed when an agent has no enabled shopping permission rows", () => {
    expect(resolveShoppingDomainsFromPermissions([])).toEqual([]);
    expect(
      resolveShoppingDomainsFromPermissions([
        { tool: "browser", enabled: false, allowed_domains: ["amazon.co.uk"] },
      ]),
    ).toEqual([]);
  });

  it("fails closed for malformed domain policy data", () => {
    expect(
      resolveShoppingDomainsFromPermissions([
        { tool: "browser", enabled: true, allowed_domains: null },
        { tool: "shopping_search", enabled: true, allowed_domains: ["valid.test"] },
      ]),
    ).toEqual([]);
  });
});
