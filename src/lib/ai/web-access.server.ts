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

export async function searchPublicWeb(
  queryInput: string,
  limitInput = 5,
  signal?: AbortSignal,
): Promise<{ query: string; results: WebSource[] }> {
  const query = queryInput.trim().slice(0, 300);
  if (!query) return { query: "", results: [] };
  const limit = Math.max(1, Math.min(Number(limitInput) || 5, 8));
  const response = await fetch(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": "PalladiumAI-Chat/1.0" },
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Web search failed (${response.status}).`);

  const html = await response.text();
  const results: WebSource[] = [];
  const blockRe = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html)) && results.length < limit) {
    const url = decodeDdg(match[1] ?? "");
    if (!isSafePublicUrl(url)) continue;
    results.push({
      url,
      title: stripHtml(match[2] ?? "") || url,
      snippet: stripHtml(match[3] ?? "").slice(0, 700),
    });
  }
  return { query, results };
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
