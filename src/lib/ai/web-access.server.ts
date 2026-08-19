export type WebSource = {
  title: string;
  url: string;
  snippet?: string;
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
    pushUnique(
      results,
      {
        url,
        title: stripHtml(match[2] ?? "") || url,
        snippet: stripHtml(match[3] ?? "").slice(0, 700),
      },
      limit,
    );
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
    pushUnique(
      results,
      { url, title: stripHtml(title) || url, snippet: stripHtml(description).slice(0, 700) },
      limit,
    );
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

export async function searchPublicWeb(
  queryInput: string,
  limitInput = 5,
  signal?: AbortSignal,
): Promise<{ query: string; results: WebSource[] }> {
  const query = queryInput.trim().slice(0, 300);
  if (!query) return { query: "", results: [] };
  const limit = Math.max(1, Math.min(Number(limitInput) || 5, 8));
  const encoded = encodeURIComponent(query);

  const providers: Array<[string, (body: string, limit: number) => WebSource[]]> = [
    [`https://duckduckgo.com/html/?q=${encoded}`, parseDuckDuckGoHtml],
    [`https://lite.duckduckgo.com/lite/?q=${encoded}`, parseDuckDuckGoLite],
    [`https://www.bing.com/search?format=rss&q=${encoded}`, parseBingRss],
  ];

  for (const [url, parser] of providers) {
    const results = await trySearchEndpoint(url, parser, limit, signal);
    if (results.length) return { query, results };
  }

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
