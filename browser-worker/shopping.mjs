const RETAILER_SEARCH = {
  "amazon.co.uk": (q) => `https://www.amazon.co.uk/s?k=${encodeURIComponent(q)}`,
  "johnlewis.com": (q) => `https://www.johnlewis.com/search?search-term=${encodeURIComponent(q)}`,
  "argos.co.uk": (q) => `https://www.argos.co.uk/search/${encodeURIComponent(q).replace(/%20/g, "-")}/`,
  "currys.co.uk": (q) => `https://www.currys.co.uk/search?q=${encodeURIComponent(q)}`,
  "ikea.com": (q) => `https://www.ikea.com/gb/en/search/?q=${encodeURIComponent(q)}`,
  "tesco.com": (q) => `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(q)}`,
  "sainsburys.co.uk": (q) => `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(q)}`,
};

const SELLER_LABELS = {
  "amazon.co.uk": "Amazon UK",
  "johnlewis.com": "John Lewis",
  "argos.co.uk": "Argos",
  "currys.co.uk": "Currys",
  "ikea.com": "IKEA",
  "tesco.com": "Tesco",
  "sainsburys.co.uk": "Sainsbury's",
};

export function supportedRetailerDomains(allowedDomains = []) {
  return [...new Set(allowedDomains.map((d) => String(d || "").replace(/^www\./, "").toLowerCase()))]
    .filter((d) => Boolean(RETAILER_SEARCH[d]));
}

export function retailerSearchUrl(domain, query) {
  const fn = RETAILER_SEARCH[String(domain || "").replace(/^www\./, "").toLowerCase()];
  return fn ? fn(String(query || "").trim()) : null;
}

export function sellerLabel(domain) {
  return SELLER_LABELS[String(domain || "").replace(/^www\./, "").toLowerCase()] || domain;
}

export function normaliseProductCandidates(items, opts = {}) {
  const budget = Number.isFinite(Number(opts.budget)) && Number(opts.budget) > 0 ? Number(opts.budget) : null;
  const currency = String(opts.currency || "GBP").toUpperCase();
  const requireVerified = opts.requireVerified === true;
  const seen = new Set();
  const result = [];

  for (const item of Array.isArray(items) ? items : []) {
    const product = String(item?.product || "").replace(/\s+/g, " ").trim().slice(0, 300);
    const url = String(item?.url || "").trim();
    const seller = String(item?.seller || "").trim().slice(0, 120);
    const price = Number(item?.price);
    const specs = item?.specs && typeof item.specs === "object" ? item.specs : {};
    if (!product || !url || !seller || !Number.isFinite(price) || price <= 0) continue;
    if (budget != null && price > budget) continue;
    if (requireVerified && (specs.verified_product_page !== true || !String(specs.image_url || "").startsWith("http"))) continue;
    const key = `${url}|${product.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const rating = Number(item?.rating);
    result.push({
      product,
      price: Math.round(price * 100) / 100,
      currency: String(item?.currency || currency).toUpperCase(),
      seller,
      delivery: String(item?.delivery || "Check retailer for delivery").slice(0, 200),
      deliveryCost: Number.isFinite(Number(item?.deliveryCost)) ? Math.max(0, Number(item.deliveryCost)) : 0,
      rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0,
      url,
      inStock: item?.inStock !== false,
      specs,
      reason: String(item?.reason || "Live retailer result matching the request.").slice(0, 500),
    });
  }

  return result
    .sort((a, b) => Number(b.inStock) - Number(a.inStock) || b.rating - a.rating || (a.price + a.deliveryCost) - (b.price + b.deliveryCost))
    .slice(0, 12);
}
