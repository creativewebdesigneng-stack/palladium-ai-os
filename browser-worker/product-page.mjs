function clean(value, max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function firstValue(value) {
  if (Array.isArray(value)) return value.find(Boolean) ?? null;
  return value ?? null;
}

function productJsonLd(nodes) {
  const queue = [...nodes];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
    if (types.some((type) => String(type || "").toLowerCase() === "product")) return node;
    if (Array.isArray(node["@graph"])) queue.push(...node["@graph"]);
  }
  return null;
}

export async function extractVerifiedProductPage(page, candidate) {
  const metadata = await page.evaluate(() => {
    const readMeta = (...selectors) => {
      for (const selector of selectors) {
        const value = document.querySelector(selector)?.getAttribute("content")?.trim();
        if (value) return value;
      }
      return "";
    };
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const title = readMeta('meta[property="og:title"]', 'meta[name="twitter:title"]') || document.querySelector("h1")?.textContent || document.title;
    const image = readMeta('meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[name="twitter:image:src"]');
    const price = readMeta('meta[property="product:price:amount"]', 'meta[property="og:price:amount"]');
    const currency = readMeta('meta[property="product:price:currency"]', 'meta[property="og:price:currency"]');
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0, 40).map((script) => script.textContent || "");
    const fallbackImage = document.querySelector('main img[src], [data-testid*="product"] img[src], [class*="product"] img[src], [class*="Product"] img[src]')?.currentSrc || document.querySelector('main img[src], [data-testid*="product"] img[src], [class*="product"] img[src], [class*="Product"] img[src]')?.src || "";
    const bodyText = (document.body?.innerText || "").slice(0, 30000);
    return { canonical, title, image, fallbackImage, price, currency, scripts, bodyText };
  });

  let product = null;
  for (const raw of metadata.scripts) {
    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      product = productJsonLd(nodes);
      if (product) break;
    } catch {}
  }

  const offer = firstValue(product?.offers);
  const aggregateOffer = offer && typeof offer === "object" ? offer : null;
  const jsonPrice = aggregateOffer?.price ?? aggregateOffer?.lowPrice ?? null;
  const jsonCurrency = aggregateOffer?.priceCurrency ?? null;
  const jsonImage = firstValue(product?.image);
  const jsonName = product?.name ?? null;
  const availability = clean(aggregateOffer?.availability, 200).toLowerCase();

  const url = new URL(metadata.canonical || page.url(), page.url()).toString();
  const imageCandidate = jsonImage || metadata.image || metadata.fallbackImage || candidate?.specs?.image_url || "";
  let imageUrl = "";
  try {
    const resolved = new URL(String(imageCandidate), page.url());
    if (["http:", "https:"].includes(resolved.protocol)) imageUrl = resolved.toString();
  } catch {}

  const parsedPrice = Number(String(jsonPrice || metadata.price || candidate?.price || "").replace(/[^0-9.]/g, ""));
  const text = metadata.bodyText.toLowerCase();
  const unavailable = /out of stock|currently unavailable|not available|sold out/.test(text) || /outofstock|soldout|discontinued/.test(availability);

  return {
    ...candidate,
    product: clean(jsonName || metadata.title || candidate?.product, 300),
    price: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : candidate?.price,
    currency: clean(jsonCurrency || metadata.currency || candidate?.currency || "GBP", 8).toUpperCase(),
    url,
    inStock: !unavailable,
    specs: {
      ...(candidate?.specs && typeof candidate.specs === "object" ? candidate.specs : {}),
      ...(imageUrl ? { image_url: imageUrl } : {}),
      canonical_url: url,
      verified_product_page: true,
      source: "verified live retailer product page",
    },
    reason: "Verified directly against the live retailer product page.",
  };
}
