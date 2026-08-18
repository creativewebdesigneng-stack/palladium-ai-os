import type { BrowserProductOffer } from "@/lib/mission/browser-agent";

type SerpShoppingResult = {
  title?: string;
  source?: string;
  price?: string;
  extracted_price?: number | string;
  delivery?: string;
  rating?: number | string;
  reviews?: number | string;
  thumbnail?: string;
  thumbnails?: string[];
  serpapi_thumbnail?: string;
  serpapi_thumbnails?: string[];
  product_link?: string;
  link?: string;
  tracking_link?: string;
  product_id?: string | number;
  immersive_product_page_token?: string;
  serpapi_immersive_product_api?: string;
};

type SerpShoppingResponse = {
  shopping_results?: SerpShoppingResult[];
  inline_shopping_results?: SerpShoppingResult[];
  error?: string;
};

type NormaliseParams = {
  budget?: number | null;
  currency?: string;
};

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function clean(value: unknown, max = 500): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parsePositiveNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function parsePrice(extracted: unknown, display: unknown): number | null {
  const direct = parsePositiveNumber(extracted);
  if (direct !== null) return direct;

  const text = clean(display, 100).replace(/,/g, "");
  const match = text.match(/(?:GBP|USD|EUR|£|\$|€)?\s*(\d+(?:\.\d{1,2})?)/i);
  return match?.[1] ? parsePositiveNumber(match[1]) : null;
}

function firstHttpUrl(values: unknown[]): string | null {
  for (const value of values) {
    if (isHttpUrl(value)) return value;
    if (Array.isArray(value)) {
      const nested = value.find(isHttpUrl);
      if (nested) return nested;
    }
  }
  return null;
}

export function normaliseGoogleShoppingRows(
  rows: SerpShoppingResult[],
  params: NormaliseParams = {},
): BrowserProductOffer[] {
  const budget = params.budget != null && Number.isFinite(Number(params.budget)) && Number(params.budget) > 0
    ? Number(params.budget)
    : null;
  const currency = clean(params.currency ?? "GBP", 8).toUpperCase() || "GBP";
  const seen = new Set<string>();
  const offers: BrowserProductOffer[] = [];

  for (const row of rows) {
    const product = clean(row.title, 300);
    const seller = clean(row.source, 120) || "Google Shopping seller";
    const price = parsePrice(row.extracted_price, row.price);
    const imageUrl = firstHttpUrl([
      row.thumbnail,
      row.serpapi_thumbnail,
      row.thumbnails,
      row.serpapi_thumbnails,
    ]);
    const productUrl = firstHttpUrl([row.link, row.product_link, row.tracking_link]);

    if (!product || price === null || !imageUrl || !productUrl) continue;
    if (budget != null && price > budget) continue;

    const productId = clean(row.product_id, 160);
    const dedupeKey = productId
      ? `id:${productId}`
      : `${product.toLowerCase()}|${seller.toLowerCase()}|${price}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const ratingNumber = Number(row.rating);
    offers.push({
      product,
      price: Math.round(price * 100) / 100,
      currency,
      seller,
      delivery: clean(row.delivery, 200) || "Check seller for delivery",
      deliveryCost: 0,
      rating: Number.isFinite(ratingNumber) ? Math.max(0, Math.min(5, ratingNumber)) : 0,
      url: productUrl,
      inStock: true,
      specs: {
        image_url: imageUrl,
        verified_product_page: "true",
        source: "Google Shopping live result",
        source_provider: "google-shopping",
        google_shopping: "true",
        ...(productId ? { google_product_id: productId } : {}),
        ...(clean(row.immersive_product_page_token, 500)
          ? { google_immersive_token: clean(row.immersive_product_page_token, 500) }
          : {}),
        ...(isHttpUrl(row.serpapi_immersive_product_api)
          ? { serpapi_immersive_product_api: row.serpapi_immersive_product_api }
          : {}),
        ...(Number.isFinite(Number(row.reviews)) ? { reviews: String(row.reviews) } : {}),
      },
      reason: "Live Google Shopping result matching the request.",
    });
    if (offers.length >= 16) break;
  }

  return offers;
}

export function googleShoppingConfigured(): boolean {
  return Boolean(process.env["SERPAPI_API_KEY"]?.trim());
}

export async function searchGoogleShopping(params: {
  query: string;
  budget?: number | null;
  currency?: string;
  location?: string | null;
}): Promise<BrowserProductOffer[]> {
  const apiKey = process.env["SERPAPI_API_KEY"]?.trim();
  if (!apiKey) return [];

  const search = new URL("https://serpapi.com/search.json");
  search.searchParams.set("engine", "google_shopping");
  search.searchParams.set("q", params.query.trim());
  search.searchParams.set("api_key", apiKey);
  search.searchParams.set("gl", "uk");
  search.searchParams.set("hl", "en");
  search.searchParams.set("device", "desktop");
  search.searchParams.set("direct_link", "true");
  if (params.location?.trim()) search.searchParams.set("location", params.location.trim());

  const response = await fetch(search, {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Google Shopping provider failed (${response.status})`);

  const payload = (await response.json()) as SerpShoppingResponse;
  if (payload.error) throw new Error(clean(payload.error, 300));

  return normaliseGoogleShoppingRows(
    [...(payload.shopping_results ?? []), ...(payload.inline_shopping_results ?? [])],
    { budget: params.budget, currency: params.currency },
  );
}
