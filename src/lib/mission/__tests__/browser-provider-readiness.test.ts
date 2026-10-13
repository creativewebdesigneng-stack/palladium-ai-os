import { afterEach, describe, expect, it, vi } from "vitest";
import { probeBrowserProvider, browserProviderStatus, resolveBrowserProvider } from "../browser-agent";

const ORIGIN = "https://browser-worker.example.test";
const oldEndpoint = process.env["PLAYWRIGHT_BROWSER_ENDPOINT"];
const oldToken = process.env["PLAYWRIGHT_BROWSER_TOKEN"];
const oldSelection = process.env["BROWSER_AGENT_PROVIDER"];
afterEach(() => {
  vi.restoreAllMocks();
  for (const [key, value] of [
    ["PLAYWRIGHT_BROWSER_ENDPOINT", oldEndpoint],
    ["PLAYWRIGHT_BROWSER_TOKEN", oldToken],
    ["BROWSER_AGENT_PROVIDER", oldSelection],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
const setup = () => {
  process.env["PLAYWRIGHT_BROWSER_ENDPOINT"] = ORIGIN;
  process.env["PLAYWRIGHT_BROWSER_TOKEN"] = "ci-long-secret-worker-token";
  process.env["BROWSER_AGENT_PROVIDER"] = "playwright";
};
const json = (body: unknown) => new Response(JSON.stringify(body), {
  status: 200, headers: { "content-type": "application/json" },
});
describe("production Playwright worker connection requires real authenticated Chromium", () => {
  it("refuses missing token and invalid insecure URLs", async () => {
    setup();
    delete process.env["PLAYWRIGHT_BROWSER_TOKEN"];
    expect(resolveBrowserProvider("playwright")).not.toBe("playwright");
    expect((await probeBrowserProvider("playwright")).ok).toBe(false);
    process.env["PLAYWRIGHT_BROWSER_TOKEN"] = "ci-long-secret-worker-token";
    for (const endpoint of [
      "http://browser-worker.example.test",
      "https://admin:password@browser-worker.example.test",
      "https://browser-worker.example.test/redirect",
      "https://browser-worker.example.test?token=private",
      "https://browser-worker.example.test/#token",
    ]) {
      process.env["PLAYWRIGHT_BROWSER_ENDPOINT"] = endpoint;
      expect((await probeBrowserProvider("playwright")).ok).toBe(false);
    }
  });
  it("does not mark generic HTML or a weak 200 health response as connected", async () => {
    setup();
    const mock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("<html>Service up</html>", { status: 200 })
    ).mockResolvedValueOnce(json({ ok: true, service: "palladium-playwright-worker" }));
    expect((await probeBrowserProvider("playwright")).ok).toBe(false);
    expect((await probeBrowserProvider("playwright")).ok).toBe(false);
    expect(mock).toHaveBeenCalledTimes(2);
    const request = mock.mock.calls[0];
    expect(request?.[0]).toBe(ORIGIN + "/health");
    expect((request?.[1] as RequestInit)?.headers).toMatchObject({
      authorization: "Bearer ci-long-secret-worker-token",
    });
    expect((request?.[1] as RequestInit)?.redirect).toBe("manual");
  });
  it("reports connection only for a ready authenticated Chromium worker", async () => {
    setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(json({
      ok: true, service: "palladium-playwright-worker", browserReady: true,
    })).mockResolvedValueOnce(json({
      ok: true, service: "palladium-playwright-worker", browserReady: true,
    }));
    expect((await probeBrowserProvider("playwright")).ok).toBe(true);
    const status = await browserProviderStatus();
    expect(status.state).toBe("production_connected");
    expect(status.provider).toBe("playwright");
    expect(status.simulated).toBe(false);
  });
  it("does not follow redirects or accept failed health responses", async () => {
    setup();
    const mock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, {status: 302, headers: {location:"https://attacker.invalid/"}})
    ).mockResolvedValueOnce(new Response(null, {status:503}));
    expect((await probeBrowserProvider("playwright")).ok).toBe(false);
    expect((await probeBrowserProvider("playwright")).ok).toBe(false);
    expect(mock).toHaveBeenCalledTimes(2);
  });
});
