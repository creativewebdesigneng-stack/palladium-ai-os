import { describe, expect, it } from "vitest";
import { browserProfileScopeKey, sanitizeBrowserStorageState } from "../browser-storage-state";

describe("browser storage state", () => {
  it("filters cookies and local storage outside the exact domain scope", () => {
    const state = sanitizeBrowserStorageState({
      cookies: [
        { name: "session", value: "private", domain: ".example.com", path: "/", expires: -1, httpOnly: true, secure: true, sameSite: "Lax" },
        { name: "outside", value: "leak", domain: "evil.test", path: "/", expires: -1 },
      ],
      origins: [
        { origin: "https://app.example.com", localStorage: [{ name: "session", value: "private" }] },
        { origin: "https://evil.test", localStorage: [{ name: "session", value: "leak" }] },
      ],
    }, ["example.com"]);

    expect(state.cookies).toHaveLength(1);
    expect(state.cookies[0]?.name).toBe("session");
    expect(state.origins).toHaveLength(1);
    expect(state.origins[0]?.origin).toBe("https://app.example.com");
  });

  it("makes the persistence key deterministic and domain-scope specific", () => {
    expect(browserProfileScopeKey(["shop.example.com", "example.com"]))
      .toBe(browserProfileScopeKey(["example.com", "shop.example.com"]));
    expect(browserProfileScopeKey(["example.com"]))
      .not.toBe(browserProfileScopeKey(["evil.test"]));
  });

  it("rejects browser session state beyond the hard persistence budget", () => {
    expect(() => sanitizeBrowserStorageState({
      cookies: Array.from({ length: 20 }, (_, index) => ({
        name: `cookie-${index}`,
        value: "x".repeat(16_000),
        domain: "example.com",
        path: "/",
        expires: -1,
      })),
    }, ["example.com"])).toThrow(/256 KB/);
  });
});
