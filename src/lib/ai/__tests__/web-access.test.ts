import { afterEach, describe, expect, it, vi } from "vitest";
import { searchPublicWeb } from "../web-access.server";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("public web search fallbacks", () => {
  it("falls back to Bing RSS when DuckDuckGo endpoints are unavailable", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes("duckduckgo.com")) return new Response("blocked", { status: 403 });
      return new Response(
        "<?xml version=\"1.0\"?><rss><channel><item><title>London Hotel</title><link>https://example.com/hotel</link><description>Central London hotel</description></item></channel></rss>",
        { status: 200, headers: { "content-type": "application/rss+xml" } },
      );
    }) as typeof fetch;

    const result = await searchPublicWeb("three good hotels in London", 3);
    expect(result.results).toEqual([
      expect.objectContaining({ title: "London Hotel", url: "https://example.com/hotel" }),
    ]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it("rejects private URLs returned by a provider", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(
        "<?xml version=\"1.0\"?><rss><channel><item><title>Private</title><link>http://127.0.0.1/admin</link><description>no</description></item></channel></rss>",
        { status: 200 },
      ),
    ) as typeof fetch;

    await expect(searchPublicWeb("hotels", 3)).rejects.toThrow(
      "Public web search providers are temporarily unavailable.",
    );
  });
});
