import type { BrowserProductOffer } from "@/lib/mission/browser-agent";

type SerpShoppingResult = {
  title?: string;
  source?: string;
  price?: string;
  extracted_price?: number;
  delivery?: string;
  rating?: number;
  reviews?: number;
  thumbnail?: string;
  serpapi_thumbnail?: string;
  product_link?: string;
  link?: string;
  tracking_link?: string;
};

type SerpShoppingResponse = {
  shopping_results?: SerpShoppingResult[];
  inline_shopping_results?: SerpShoppingResult[];
  error?: string;
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

  const rows = [...(payload.shopping_results ?? []), ...(payload.inline_shopping_results ?? [])];
  const budget = params.budget != null && Number.isFinite(Number(params.budget)) && Number(params.budget) > 0
    ? Number(params.budget)
    : null;
  const seen = new Set<string>();
  const offers: BrowserProductOffer[] = [];

  for (const row of rows) {
    const product = clean(row.title, 300);
    const seller = clean(row.source, 120) || "Google Shopping seller";
    const price = Number(row.extracted_price);
    const imageUrl = isHttpUrl(row.thumbnail) ? row.thumbnail : isHttpUrl(row.serpapi_thumbnail) ? row.serpapi_thumbnail : null;
    const productUrl = isHttpUrl(row.link) ? row.link : isHttpUrl(row.product_link) ? row.product_link : isHttpUrl(row.tracking_link) ? row.tracking_link : null;
    if (!product || !Number.isFinite(price) || price <= 0 || !imageUrl || !productUrl) continue;
    if (budget != null && price > budget) continue;
    const key = `${product.toLowerCase()}|${seller.toLowerCase()}|${price}`;
    if (seen.has(key)) continue;
    seen.add(key);

    offers.push({
      product,
      price: Math.round(price * 100) / 100,
      currency: clean(params.currency ?? "GBP", 8).toUpperCase(),
      seller,
      delivery: clean(row.delivery, 200) || "Check seller for delivery",
      deliveryCost: 0,
      rating: Number.isFinite(Number(row.rating)) ? Math.max(0, Math.min(5, Number(row.rating))) : 0,
      url: productUrl,
      inStock: true,
      specs: {
        image_url: imageUrl,
        verified_product_page: "true",
        source: "Google Shopping live result",
        google_shopping: "true",
        ...(Number.isFinite(Number(row.reviews)) ? { reviews: String(row.reviews) } : {}),
      },
      reason: "Live Google Shopping result matching the request.",
    });
    if (offers.length >= 16) break;
  }

  return offers;
}
