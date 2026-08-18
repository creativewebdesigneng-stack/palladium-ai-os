import http from "node:http";
import crypto from "node:crypto";
import { chromium } from "playwright";
import {
  MAX_BODY_BYTES,
  MAX_SESSIONS,
  MAX_TEXT_CHARS,
  SESSION_TTL_MS,
  assertPublicHttpUrl,
  bearerAuthorised,
  cleanAllowedDomains,
  safeSelector,
  safeText,
} from "./policy.mjs";
import {
  normaliseProductCandidates,
  retailerSearchUrl,
  sellerLabel,
  supportedRetailerDomains,
} from "./shopping.mjs";
import { extractVerifiedProductPage } from "./product-page.mjs";

const PORT = Number(process.env.PORT || process.env.BROWSER_WORKER_PORT || 8787);
const TOKEN = process.env.BROWSER_WORKER_TOKEN || "";
const HEADLESS = process.env.BROWSER_WORKER_HEADLESS !== "false";
const sessions = new Map();
let browserPromise;

function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": data.length,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(data);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: HEADLESS, args: ["--disable-dev-shm-usage"] });
  return browserPromise;
}

async function closeSession(id) {
  const session = sessions.get(id);
  if (!session) return;
  sessions.delete(id);
  try { await session.context.close(); } catch {}
}

function touch(session) { session.expiresAt = Date.now() + SESSION_TTL_MS; }

async function sessionFor(id) {
  const session = sessions.get(String(id || ""));
  if (!session) throw new Error("Unknown or expired browser session");
  if (session.expiresAt <= Date.now()) {
    await closeSession(session.id);
    throw new Error("Unknown or expired browser session");
  }
  touch(session);
  return session;
}

async function createSession(allowedDomains) {
  if (sessions.size >= MAX_SESSIONS) throw new Error("Browser worker is at session capacity");
  const domains = cleanAllowedDomains(allowedDomains);
  if (!domains.length) throw new Error("At least one allowed domain is required");
  const browser = await getBrowser();
  const context = await browser.newContext({
    ignoreHTTPSErrors: false,
    acceptDownloads: false,
    javaScriptEnabled: true,
    locale: "en-GB",
  });
  const page = await context.newPage();
  const id = crypto.randomUUID();
  const session = { id, context, page, allowedDomains: domains, expiresAt: Date.now() + SESSION_TTL_MS };

  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    try {
      const requireAllowedDomain = request.isNavigationRequest() && request.resourceType() === "document";
      await assertPublicHttpUrl(url, domains, { requireAllowedDomain });
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });

  sessions.set(id, session);
  return session;
}

async function navigate(session, params) {
  const url = (await assertPublicHttpUrl(String(params.url || ""), session.allowedDomains)).toString();
  const response = await session.page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
  return { url: session.page.url(), status: response?.status() ?? null, title: await session.page.title() };
}

async function extract(session, params) {
  const url = String(params.url || session.page.url());
  if (url && url !== "about:blank" && url !== session.page.url()) await navigate(session, { url });
  const selector = params.selector ? safeSelector(params.selector) : "body";
  const loc = session.page.locator(selector).first();
  const text = safeText(await loc.innerText({ timeout: 10_000 }), MAX_TEXT_CHARS);
  return { text, items: [] };
}

async function searchRetailerPage(session, domain, query, currency) {
  const url = retailerSearchUrl(domain, query);
  if (!url) return [];
  await navigate(session, { url });
  await session.page.waitForTimeout(900).catch(() => {});

  return session.page.evaluate(({ seller, requestedCurrency }) => {
    const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const anchors = [...document.querySelectorAll("a[href]")].slice(0, 1800);
    const out = [];
    const seen = new Set();

    for (const anchor of anchors) {
      const container = anchor.closest("article, li, [data-testid*='product'], [class*='product'], [class*='Product']") || anchor.parentElement;
      const text = clean(container?.innerText || anchor.innerText);
      if (!text || text.length < 8 || text.length > 1600) continue;
      const priceMatch = text.match(/£\s?(\d{1,5}(?:[.,]\d{2})?)/);
      if (!priceMatch) continue;
      const price = Number(priceMatch[1].replace(",", ""));
      if (!Number.isFinite(price) || price <= 0) continue;

      const heading = container?.querySelector("h1,h2,h3,h4,[data-testid*='title'],[class*='title'],[class*='Title']");
      const product = clean(heading?.textContent || anchor.textContent || text.split("£")[0]).slice(0, 300);
      if (!product || product.length < 3) continue;

      let href;
      try { href = new URL(anchor.href, location.href).toString(); } catch { continue; }
      if (!href.startsWith("http")) continue;
      const key = `${href}|${product.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const image = container?.querySelector("img");
      let imageUrl = "";
      const imageCandidate = image?.currentSrc || image?.src || image?.getAttribute("data-src") || image?.getAttribute("data-lazy-src") || "";
      try {
        const resolvedImage = imageCandidate ? new URL(imageCandidate, location.href) : null;
        if (resolvedImage && (resolvedImage.protocol === "https:" || resolvedImage.protocol === "http:")) imageUrl = resolvedImage.toString();
      } catch {}

      const ratingMatch = text.match(/([0-5](?:\.\d)?)\s*(?:out of 5|stars?)/i);
      const inStock = !/(out of stock|currently unavailable|not available)/i.test(text);
      out.push({
        product,
        price,
        currency: requestedCurrency,
        seller,
        delivery: /free delivery/i.test(text) ? "Free delivery shown by retailer" : "Check retailer for delivery",
        deliveryCost: 0,
        rating: ratingMatch ? Number(ratingMatch[1]) : 0,
        url: href,
        inStock,
        specs: { source: "live retailer search", ...(imageUrl ? { image_url: imageUrl } : {}) },
        reason: "Live retailer search result matching the shopping request.",
      });
      if (out.length >= 8) break;
    }
    return out;
  }, { seller: sellerLabel(domain), requestedCurrency: currency });
}

async function verifyProductCandidates(session, candidates, opts) {
  const verified = [];
  for (const candidate of candidates.slice(0, 10)) {
    try {
      const target = await assertPublicHttpUrl(String(candidate.url || ""), session.allowedDomains, { requireAllowedDomain: true });
      const response = await session.page.goto(target.toString(), { waitUntil: "domcontentloaded", timeout: 12_000 });
      if (response && response.status() >= 400) continue;
      await session.page.waitForTimeout(250).catch(() => {});
      const product = await extractVerifiedProductPage(session.page, candidate);
      await assertPublicHttpUrl(product.url, session.allowedDomains, { requireAllowedDomain: true });
      if (!product.specs?.verified_product_page || !product.specs?.image_url) continue;
      verified.push(product);
      if (verified.length >= 8) break;
    } catch (error) {
      console.warn("[browser-worker] product-page verification skipped:", error instanceof Error ? error.message : error);
    }
  }
  return normaliseProductCandidates(verified, opts);
}

async function searchRetailers(session, params) {
  const query = safeText(params.query || "", 500).trim();
  if (!query) throw new Error("Shopping search query is required");
  const currency = safeText(params.currency || "GBP", 8).toUpperCase();
  const budget = Number(params.budget);
  const domains = supportedRetailerDomains(session.allowedDomains).slice(0, 7);
  if (!domains.length) throw new Error("No supported shopping retailers are present in this agent's allow-list");

  const candidates = [];
  for (const domain of domains) {
    try {
      candidates.push(...await searchRetailerPage(session, domain, query, currency));
    } catch (error) {
      console.warn(`[browser-worker] retailer search failed for ${domain}:`, error instanceof Error ? error.message : error);
    }
  }

  const opts = {
    budget: Number.isFinite(budget) && budget > 0 ? budget : null,
    currency,
  };
  const ranked = normaliseProductCandidates(candidates, opts);
  return verifyProductCandidates(session, ranked, opts);
}

async function performAction(session, action, params = {}) {
  switch (action) {
    case "navigate": return navigate(session, params);
    case "read": return extract(session, params);
    case "extract": return extract(session, params);
    case "click": {
      await session.page.locator(safeSelector(params.selector)).first().click({ timeout: 10_000 });
      return { url: session.page.url() };
    }
    case "type": {
      await session.page.locator(safeSelector(params.selector)).first().fill(safeText(params.text));
      return { ok: true };
    }
    case "scroll": {
      const amount = Math.max(1, Math.min(10, Number(params.amount || 1)));
      const dy = (params.direction === "up" ? -1 : 1) * 700 * amount;
      await session.page.evaluate((y) => window.scrollBy(0, y), dy);
      return { ok: true };
    }
    case "screenshot": {
      const bytes = await session.page.screenshot({ type: "png", fullPage: false });
      return { dataUrl: `data:image/png;base64,${bytes.toString("base64")}` };
    }
    case "back": {
      await session.page.goBack({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => null);
      return { url: session.page.url(), title: await session.page.title() };
    }
    case "forward": {
      await session.page.goForward({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => null);
      return { url: session.page.url(), title: await session.page.title() };
    }
    case "wait": {
      await session.page.waitForTimeout(Math.max(0, Math.min(30_000, Number(params.ms || 0))));
      return { ok: true };
    }
    case "fill_form": {
      const url = String(params.url || session.page.url());
      if (url && url !== session.page.url()) await navigate(session, { url });
      const fields = params.fields && typeof params.fields === "object" ? params.fields : {};
      for (const [selector, value] of Object.entries(fields).slice(0, 30)) {
        await session.page.locator(safeSelector(selector)).first().fill(safeText(value, 5000));
      }
      return { ok: true };
    }
    case "search":
      return { offers: await searchRetailers(session, params) };
    case "prepare_checkout":
      return { ...params.offer, paymentAuthorised: false };
    case "compare":
      return { offers: Array.isArray(params.offers) ? params.offers : [] };
    case "close":
      await closeSession(session.id);
      return { ok: true };
    default:
      throw new Error(`Unsupported browser action: ${action}`);
  }
}

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) if (session.expiresAt <= now) void closeSession(id);
}, 60_000);
cleanupTimer.unref();

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "POST required" });
    if (!bearerAuthorised(req.headers, TOKEN)) return json(res, 401, { ok: false, error: "Unauthorised" });

    const path = new URL(req.url || "/", "http://worker.local").pathname;
    if (path === "/health") return json(res, 200, { ok: true, service: "palladium-playwright-worker", sessions: sessions.size });

    const body = await readBody(req);
    if (path === "/session") {
      const session = await createSession(body.allowedDomains);
      return json(res, 200, { sessionId: session.id });
    }
    if (path === "/action") {
      const session = await sessionFor(body.sessionId);
      const data = await performAction(session, String(body.action || ""), body.params || {});
      return json(res, 200, { ok: true, data });
    }
    return json(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Browser worker error";
    return json(res, 400, { ok: false, error: message.slice(0, 500) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Palladium Playwright worker listening on :${PORT}`);
});

async function shutdown() {
  server.close();
  for (const id of [...sessions.keys()]) await closeSession(id);
  try { if (browserPromise) await (await browserPromise).close(); } catch {}
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
