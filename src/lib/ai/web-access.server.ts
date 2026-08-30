export type WebSource = {
  title: string;
  url: string;
  snippet?: string;
};

export type LiveLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

const stripHtml = (html: string) =>
  html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const decodeDdg = (href: string) => {
  const match = /uddg=([^&]+)/.exec(href);
  try {
    return match?.[1] ? decodeURIComponent(match[1]) : href;
  } catch {
    return href;
  }
};

export function isSafePublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === "::1"
    ) return false;
    return true;
  } catch {
    return false;
  }
}

function pushUnique(results: WebSource[], item: WebSource, limit: number) {
  if (results.length >= limit || !isSafePublicUrl(item.url)) return;
  if (results.some((existing) => existing.url === item.url)) return;
  results.push(item);
}

function parseDuckDuckGoHtml(html: string, limit: number): WebSource[] {
  const results: WebSource[] = [];
  const blockRe = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) && results.length < limit) {
    const url = decodeDdg(match[1] ?? "");
    pushUnique(results, {
      url,
      title: stripHtml(match[2] ?? "") || url,
      snippet: stripHtml(match[3] ?? "").slice(0, 700),
    }, limit);
  }
  return results;
}

function parseDuckDuckGoLite(html: string, limit: number): WebSource[] {
  const results: WebSource[] = [];
  const linkRe = /<a[^>]+href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) && results.length < limit) {
    const url = decodeDdg(match[1] ?? "");
    pushUnique(results, { url, title: stripHtml(match[2] ?? "") || url }, limit);
  }
  return results;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseBingRss(xml: string, limit: number): WebSource[] {
  const results: WebSource[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRe.exec(xml)) && results.length < limit) {
    const item = match[1] ?? "";
    const title = decodeXml(/<title>([\s\S]*?)<\/title>/i.exec(item)?.[1] ?? "").trim();
    const url = decodeXml(/<link>([\s\S]*?)<\/link>/i.exec(item)?.[1] ?? "").trim();
    const description = decodeXml(/<description>([\s\S]*?)<\/description>/i.exec(item)?.[1] ?? "");
    if (!url) continue;
    pushUnique(results, {
      url,
      title: stripHtml(title) || url,
      snippet: stripHtml(description).slice(0, 700),
    }, limit);
  }
  return results;
}

async function trySearchEndpoint(
  url: string,
  parser: (body: string, limit: number) => WebSource[],
  limit: number,
  signal?: AbortSignal,
): Promise<WebSource[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PalladiumAI/1.0; +https://palladium-ai-os.lovable.app)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: signal ?? AbortSignal.timeout(12_000),
    });
    if (!response.ok) return [];
    return parser(await response.text(), limit);
  } catch {
    return [];
  }
}

export function buildPublicSearchQueries(queryInput: string): string[] {
  const query = queryInput.trim().slice(0, 300);
  if (!query) return [];
  const wantsVideo = /\b(youtube|you tube|video|videos)\b/i.test(query);
  return wantsVideo
    ? [`site:youtube.com/watch ${query}`.slice(0, 300), query]
    : [query];
}

async function runProviderSet(query: string, limit: number, signal?: AbortSignal): Promise<WebSource[]> {
  const encoded = encodeURIComponent(query);
  const providers: Array<[string, (body: string, limit: number) => WebSource[]]> = [
    [`https://duckduckgo.com/html/?q=${encoded}`, parseDuckDuckGoHtml],
    [`https://lite.duckduckgo.com/lite/?q=${encoded}`, parseDuckDuckGoLite],
    [`https://www.bing.com/search?format=rss&q=${encoded}`, parseBingRss],
  ];
  for (const [url, parser] of providers) {
    const results = await trySearchEndpoint(url, parser, limit, signal);
    if (results.length) return results;
  }
  return [];
}

const WEATHER_PATTERN = /\b(weather|forecast|temperature|rain|raining|snow|snowing|sunny|wind|windy|heat|cold)\b/i;

export function isWeatherQuery(query: string): boolean {
  return WEATHER_PATTERN.test(query);
}

export function extractWeatherLocation(query: string): string | null {
  if (!isWeatherQuery(query)) return null;
  const explicit = /\b(?:in|for|at|near)\s+([a-z0-9][a-z0-9 .,'-]{1,70}?)(?=\?|$|\b(?:today|tonight|tomorrow|this morning|this afternoon|this evening|right now|now)\b)/i.exec(query)?.[1]?.trim();
  if (!explicit) return null;
  if (/^(my city|my town|my area|me|here|home|where i am|where i'm at)$/i.test(explicit)) return null;
  return explicit.replace(/[?.!,]+$/, "").trim() || null;
}

function weatherCodeLabel(codeInput: unknown): string {
  const code = Number(codeInput);
  if (code === 0) return "clear sky";
  if ([1, 2].includes(code)) return "mainly clear to partly cloudy";
  if (code === 3) return "overcast";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "thunderstorms";
  return "mixed conditions";
}

function finiteCoordinate(value: unknown, min: number, max: number): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

async function geocodeWeatherLocation(name: string, signal?: AbortSignal): Promise<{ latitude: number; longitude: number; label: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  try {
    const response = await fetch(url, { signal: signal ?? AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const body = await response.json() as { results?: Array<Record<string, unknown>> };
    const item = body.results?.[0];
    if (!item) return null;
    const latitude = finiteCoordinate(item.latitude, -90, 90);
    const longitude = finiteCoordinate(item.longitude, -180, 180);
    if (latitude === null || longitude === null) return null;
    const parts = [item.name, item.admin1, item.country].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    return { latitude, longitude, label: parts.join(", ") || name };
  } catch {
    return null;
  }
}

async function tryLiveWeather(query: string, location?: LiveLocation, signal?: AbortSignal): Promise<WebSource | null> {
  if (!isWeatherQuery(query)) return null;

  const suppliedLatitude = finiteCoordinate(location?.latitude, -90, 90);
  const suppliedLongitude = finiteCoordinate(location?.longitude, -180, 180);
  const explicitLocation = extractWeatherLocation(query);

  let latitude = suppliedLatitude;
  let longitude = suppliedLongitude;
  let label = suppliedLatitude !== null && suppliedLongitude !== null ? "your current location" : "";

  if (explicitLocation) {
    const geocoded = await geocodeWeatherLocation(explicitLocation, signal);
    if (geocoded) {
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
      label = geocoded.label;
    }
  }

  if (latitude === null || longitude === null) return null;

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(latitude));
  forecastUrl.searchParams.set("longitude", String(longitude));
  forecastUrl.searchParams.set("current", "temperature_2m,apparent_temperature,precipitation,rain,showers,snowfall,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m");
  forecastUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  forecastUrl.searchParams.set("temperature_unit", "celsius");
  forecastUrl.searchParams.set("wind_speed_unit", "mph");
  forecastUrl.searchParams.set("timezone", "auto");
  forecastUrl.searchParams.set("forecast_days", "3");

  try {
    const response = await fetch(forecastUrl, { signal: signal ?? AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const body = await response.json() as {
      timezone?: string;
      current?: Record<string, unknown>;
      daily?: Record<string, unknown[]>;
    };
    const current = body.current ?? {};
    const daily = body.daily ?? {};
    const temperature = Number(current.temperature_2m);
    const apparent = Number(current.apparent_temperature);
    const wind = Number(current.wind_speed_10m);
    const gust = Number(current.wind_gusts_10m);
    const precipitation = Number(current.precipitation);
    const code = weatherCodeLabel(current.weather_code);
    const todayMax = Number(daily.temperature_2m_max?.[0]);
    const todayMin = Number(daily.temperature_2m_min?.[0]);
    const rainChance = Number(daily.precipitation_probability_max?.[0]);
    const tomorrowMax = Number(daily.temperature_2m_max?.[1]);
    const tomorrowMin = Number(daily.temperature_2m_min?.[1]);
    const tomorrowRain = Number(daily.precipitation_probability_max?.[1]);
    const parts = [
      `Live weather for ${label || "the requested location"}.`,
      typeof current.time === "string" ? `Observation time: ${current.time}${body.timezone ? ` (${body.timezone})` : ""}.` : "",
      Number.isFinite(temperature) ? `Current temperature: ${temperature.toFixed(1)}°C.` : "",
      Number.isFinite(apparent) ? `Feels like: ${apparent.toFixed(1)}°C.` : "",
      `Conditions: ${code}.`,
      Number.isFinite(precipitation) ? `Current precipitation: ${precipitation.toFixed(1)} mm.` : "",
      Number.isFinite(wind) ? `Wind: ${wind.toFixed(1)} mph${Number.isFinite(gust) ? `, gusting ${gust.toFixed(1)} mph` : ""}.` : "",
      Number.isFinite(todayMax) && Number.isFinite(todayMin) ? `Today: ${todayMin.toFixed(1)}–${todayMax.toFixed(1)}°C${Number.isFinite(rainChance) ? `, max precipitation chance ${Math.round(rainChance)}%` : ""}.` : "",
      Number.isFinite(tomorrowMax) && Number.isFinite(tomorrowMin) ? `Tomorrow: ${tomorrowMin.toFixed(1)}–${tomorrowMax.toFixed(1)}°C${Number.isFinite(tomorrowRain) ? `, max precipitation chance ${Math.round(tomorrowRain)}%` : ""}.` : "",
    ].filter(Boolean);
    return {
      title: `Live weather · ${label || "current location"}`,
      url: forecastUrl.toString(),
      snippet: parts.join(" ").slice(0, 1200),
    };
  } catch {
    return null;
  }
}

export async function searchPublicWeb(
  queryInput: string,
  limitInput = 5,
  signal?: AbortSignal,
  location?: LiveLocation,
): Promise<{ query: string; results: WebSource[] }> {
  const query = queryInput.trim().slice(0, 300);
  if (!query) return { query: "", results: [] };
  const limit = Math.max(1, Math.min(Number(limitInput) || 5, 8));
  const results: WebSource[] = [];

  const weather = await tryLiveWeather(query, location, signal);
  if (weather) pushUnique(results, weather, limit);

  for (const searchQuery of buildPublicSearchQueries(query)) {
    const batch = await runProviderSet(searchQuery, limit, signal);
    for (const item of batch) pushUnique(results, item, limit);
    if (results.length >= limit) break;
  }

  if (results.length) return { query, results };
  throw new Error("Public web search providers are temporarily unavailable.");
}

export async function fetchPublicWebPage(
  urlInput: string,
  signal?: AbortSignal,
): Promise<{ url: string; text: string }> {
  const url = urlInput.trim();
  if (!isSafePublicUrl(url)) throw new Error("Only public http(s) URLs can be fetched.");
  const response = await fetch(url, {
    headers: { "User-Agent": "PalladiumAI-Chat/1.0" },
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Web fetch failed (${response.status}).`);
  const html = await response.text();
  return { url, text: stripHtml(html).slice(0, 7000) };
}
