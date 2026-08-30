import { afterEach, describe, expect, it, vi } from "vitest";
import { extractWeatherLocation, isWeatherQuery, searchPublicWeb } from "../web-access.server";

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

describe("live weather grounding", () => {
  it("recognises weather intent and extracts explicit places", () => {
    expect(isWeatherQuery("what is the weather in Manchester today?")).toBe(true);
    expect(extractWeatherLocation("what is the weather in Manchester today?")).toBe("Manchester");
    expect(extractWeatherLocation("what is the weather in my city?" )).toBeNull();
  });

  it("uses browser coordinates for a live current-location weather source", async () => {
    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes("api.open-meteo.com/v1/forecast")) {
        return new Response(JSON.stringify({
          timezone: "Europe/London",
          current: {
            time: "2026-08-30T23:00",
            temperature_2m: 18.4,
            apparent_temperature: 18.1,
            precipitation: 0,
            weather_code: 1,
            wind_speed_10m: 6.2,
            wind_gusts_10m: 10.5,
          },
          daily: {
            temperature_2m_max: [21, 22],
            temperature_2m_min: [13, 14],
            precipitation_probability_max: [10, 25],
          },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response("blocked", { status: 403 });
    }) as typeof fetch;

    const result = await searchPublicWeb(
      "what is the weather in my city right now?",
      3,
      undefined,
      { latitude: 53.48, longitude: -2.24, accuracy: 500 },
    );

    expect(result.results[0]).toEqual(expect.objectContaining({
      title: "Live weather · your current location",
      snippet: expect.stringContaining("Current temperature: 18.4°C"),
    }));
  });
});
