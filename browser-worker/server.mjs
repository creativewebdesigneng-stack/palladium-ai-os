import http from "node:http";
import crypto from "node:crypto";
import { chromium } from "playwright";
import {
  MAX_BODY_BYTES, MAX_SESSIONS, MAX_TEXT_CHARS, SESSION_TTL_MS,
  assertPublicHttpUrl, bearerAuthorised, cleanAllowedDomains, safeSelector, safeText,
} from "./policy.mjs";
import { normaliseInteractiveItems } from "./dom-snapshot.mjs";
import {
  isLikelyProductUrl, normaliseProductCandidates, retailerSearchUrl, sellerLabel, supportedRetailerDomains,
} from "./shopping.mjs";
import { extractVerifiedProductPage } from "./product-page.mjs";
import { filterStorageState } from "./storage-state.mjs";

const PORT = Number(process.env.PORT || process.env.BROWSER_WORKER_PORT || 8787);
const TOKEN = process.env.BROWSER_WORKER_TOKEN || "";
const HEADLESS = process.env.BROWSER_WORKER_HEADLESS !== "false";
const sessions = new Map();
let browserPromise;

function json(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": data.length, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(data);
}

async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY_BYTES) throw new Error("Request body too large"); chunks.push(chunk); }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: HEADLESS, args: ["--disable-dev-shm-usage"] });
  return browserPromise;
}

async function closeSession(id) {
  const session = sessions.get(id); if (!session) return;
  sessions.delete(id); try { await session.context.close(); } catch {}
}
function touch(session) { session.expiresAt = Date.now() + SESSION_TTL_MS; }
async function sessionFor(id) {
  const session = sessions.get(String(id || ""));
  if (!session) throw new Error("Unknown or expired browser session");
  if (session.expiresAt <= Date.now()) { await closeSession(session.id); throw new Error("Unknown or expired browser session"); }
  touch(session); return session;
}

async function createSession(allowedDomains, storageState) {
  if (sessions.size >= MAX_SESSIONS) throw new Error("Browser worker is at session capacity");
  const domains = cleanAllowedDomains(allowedDomains);
  if (!domains.length) throw new Error("At least one allowed domain is required");
  const initialState = storageState == null ? undefined : filterStorageState(storageState, domains);
  const browser = await getBrowser();
  const context = await browser.newContext({
    ignoreHTTPSErrors: false,
    acceptDownloads: false,
    javaScriptEnabled: true,
    locale: "en-GB",
    ...(initialState ? { storageState: initialState } : {}),
  });
  const page = await context.newPage();
  const id = crypto.randomUUID();
  const session = { id, context, page, allowedDomains: domains, expiresAt: Date.now() + SESSION_TTL_MS };
  await context.route("**/*", async (route) => {
    const request = route.request();
    try {
      const requireAllowedDomain = request.isNavigationRequest() && request.resourceType() === "document";
      await assertPublicHttpUrl(request.url(), domains, { requireAllowedDomain });
      await route.continue();
    } catch { await route.abort("blockedbyclient"); }
  });
  sessions.set(id, session); return session;
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
  const rawItems = await session.page.evaluate(() => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const selectorFor = (element) => {
      if (element.id) return `#${CSS.escape(element.id)}`;
      const testId = element.getAttribute("data-testid");
      if (testId) return `[data-testid="${CSS.escape(testId)}"]`;
      const name = element.getAttribute("name");
      if (name) return `${element.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
        const tag = current.tagName.toLowerCase();
        const siblings = current.parentElement
          ? [...current.parentElement.children].filter((child) => child.tagName === current.tagName)
          : [];
        const position = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : "";
        parts.unshift(`${tag}${position}`);
        current = current.parentElement;
      }
      return parts.join(" > ");
    };
    const labelFor = (element) => {
      const aria = element.getAttribute("aria-label");
      if (aria) return clean(aria);
      if (element.id) {
        const explicit = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (explicit?.textContent) return clean(explicit.textContent);
      }
      const wrapped = element.closest("label");
      if (wrapped?.textContent) return clean(wrapped.textContent);
      return clean(element.getAttribute("placeholder") || element.getAttribute("name") || "");
    };
    const elements = [...document.querySelectorAll(
      "a[href],button,input,textarea,select,[role='button'],[role='link'],[role='checkbox'],[role='radio'],[role='combobox']",
    )];
    return elements.filter(isVisible).slice(0, 240).map((element) => ({
      selector: selectorFor(element),
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role") || "",
      type: element.getAttribute("type") || "",
      text: clean(element.innerText || element.textContent || "").slice(0, 500),
      label: labelFor(element).slice(0, 500),
      href: element instanceof HTMLAnchorElement ? element.href : "",
      disabled: "disabled" in element ? Boolean(element.disabled) : element.getAttribute("aria-disabled") === "true",
    }));
  });
  return { text, items: normaliseInteractiveItems(rawItems) };
}

async function searchRetailerPage(session, domain, query, currency) {
  const url = retailerSearchUrl(domain, query);
  if (!url) return [];
  await navigate(session, { url });
  await session.page.waitForTimeout(900).catch(() => {});
  const candidates = await session.page.evaluate(({ seller, requestedCurrency }) => {
    const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const anchors = [...document.querySelectorAll("a[href]")].slice(0, 1800);
    const out = []; const seen = new Set();
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
      let href; try { href = new URL(anchor.href, location.href).toString(); } catch { continue; }
      if (!href.startsWith("http")) continue;
      const key = `${href}|${product.toLowerCase()}`; if (seen.has(key)) continue; seen.add(key);
      const image = container?.querySelector("img");
      const imageCandidate = image?.currentSrc || image?.src || image?.getAttribute("data-src") || image?.getAttribute("data-lazy-src") || "";
      let imageUrl = "";
      try { const resolved = imageCandidate ? new URL(imageCandidate, location.href) : null; if (resolved && ["https:", "http:"].includes(resolved.protocol)) imageUrl = resolved.toString(); } catch {}
      const ratingMatch = text.match(/([0-5](?:\.\d)?)\s*(?:out of 5|stars?)/i);
      out.push({ product, price, currency: requestedCurrency, seller, delivery: /free delivery/i.test(text) ? "Free delivery shown by retailer" : "Check retailer for delivery", deliveryCost: 0, rating: ratingMatch ? Number(ratingMatch[1]) : 0, url: href, inStock: !/(out of stock|currently unavailable|not available)/i.test(text), specs: { source: "live retailer search", ...(imageUrl ? { image_url: imageUrl } : {}) }, reason: "Live retailer search result matching the shopping request." });
    }
    return out;
  }, { seller: sellerLabel(domain), requestedCurrency: currency });
  return candidates.filter((candidate) => isLikelyProductUrl(domain, candidate.url)).slice(0, 6);
}

async function verifyProductCandidates(session, candidates, opts, maxResults = 3) {
  const verified = [];
  for (const candidate of candidates.slice(0, 6)) {
    try {
      const target = await assertPublicHttpUrl(String(candidate.url || ""), session.allowedDomains, { requireAllowedDomain: true });
      const response = await session.page.goto(target.toString(), { waitUntil: "domcontentloaded", timeout: 10_000 });
      if (response && response.status() >= 400) continue;
      await session.page.waitForTimeout(350).catch(() => {});
      const product = await extractVerifiedProductPage(session.page, candidate);
      await assertPublicHttpUrl(product.url, session.allowedDomains, { requireAllowedDomain: true });
      if (!product.specs?.verified_product_page || !product.specs?.image_url) continue;
      verified.push(product);
      if (verified.length >= maxResults) break;
    } catch (error) { console.warn("[browser-worker] product-page verification skipped:", error instanceof Error ? error.message : error); }
  }
  return normaliseProductCandidates(verified, { ...opts, requireVerified: true });
}

async function searchRetailers(session, params) {
  const query = safeText(params.query || "", 500).trim();
  if (!query) throw new Error("Shopping search query is required");
  const currency = safeText(params.currency || "GBP", 8).toUpperCase();
  const budget = Number(params.budget);
  const domains = supportedRetailerDomains(session.allowedDomains).slice(0, 7);
  if (!domains.length) throw new Error("No supported shopping retailers are present in this agent's allow-list");
  const opts = { budget: Number.isFinite(budget) && budget > 0 ? budget : null, currency };
  const verified = [];
  for (const domain of domains) {
    try {
      const candidates = normaliseProductCandidates(await searchRetailerPage(session, domain, query, currency), opts);
      if (!candidates.length) continue;
      verified.push(...await verifyProductCandidates(session, candidates, opts, 2));
      if (verified.length >= 8) break;
    } catch (error) { console.warn(`[browser-worker] retailer search failed for ${domain}:`, error instanceof Error ? error.message : error); }
  }
  return normaliseProductCandidates(verified, { ...opts, requireVerified: true }).slice(0, 8);
}

async function performAction(session, action, params = {}) {
  switch (action) {
    case "navigate": return navigate(session, params);
    case "read": case "extract": return extract(session, params);
    case "click": await session.page.locator(safeSelector(params.selector)).first().click({ timeout: 10_000 }); return { url: session.page.url() };
    case "type": await session.page.locator(safeSelector(params.selector)).first().fill(safeText(params.text)); return { ok: true };
    case "scroll": { const amount = Math.max(1, Math.min(10, Number(params.amount || 1))); const dy = (params.direction === "up" ? -1 : 1) * 700 * amount; await session.page.evaluate((y) => window.scrollBy(0, y), dy); return { ok: true }; }
    case "screenshot": { const bytes = await session.page.screenshot({ type: "png", fullPage: false }); return { dataUrl: `data:image/png;base64,${bytes.toString("base64")}` }; }
    case "back": await session.page.goBack({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => null); return { url: session.page.url(), title: await session.page.title() };
    case "forward": await session.page.goForward({ waitUntil: "domcontentloaded", timeout: 15_000 }).catch(() => null); return { url: session.page.url(), title: await session.page.title() };
    case "wait": await session.page.waitForTimeout(Math.max(0, Math.min(30_000, Number(params.ms || 0)))); return { ok: true };
    case "fill_form": { const url = String(params.url || session.page.url()); if (url && url !== session.page.url()) await navigate(session, { url }); const fields = params.fields && typeof params.fields === "object" ? params.fields : {}; for (const [selector, value] of Object.entries(fields).slice(0, 30)) await session.page.locator(safeSelector(selector)).first().fill(safeText(value, 5000)); return { ok: true }; }
    case "search": return { offers: await searchRetailers(session, params) };
    case "prepare_checkout": return { ...params.offer, paymentAuthorised: false };
    case "compare": return { offers: Array.isArray(params.offers) ? params.offers : [] };
    case "storage_state": return filterStorageState(await session.context.storageState(), session.allowedDomains);
    case "close": await closeSession(session.id); return { ok: true };
    default: throw new Error(`Unsupported browser action: ${action}`);
  }
}

const cleanupTimer = setInterval(() => { const now = Date.now(); for (const [id, session] of sessions) if (session.expiresAt <= now) void closeSession(id); }, 60_000); cleanupTimer.unref();
const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "POST required" });
    if (!bearerAuthorised(req.headers, TOKEN)) return json(res, 401, { ok: false, error: "Unauthorised" });
    const path = new URL(req.url || "/", "http://worker.local").pathname;
    if (path === "/health") return json(res, 200, { ok: true, service: "palladium-playwright-worker", sessions: sessions.size });
    const body = await readBody(req);
    if (path === "/session") { const session = await createSession(body.allowedDomains, body.storageState); return json(res, 200, { sessionId: session.id }); }
    if (path === "/action") { const session = await sessionFor(body.sessionId); const data = await performAction(session, String(body.action || ""), body.params || {}); return json(res, 200, { ok: true, data }); }
    return json(res, 404, { ok: false, error: "Not found" });
  } catch (error) { const message = error instanceof Error ? error.message : "Browser worker error"; return json(res, 400, { ok: false, error: message.slice(0, 500) }); }
});
server.listen(PORT, "0.0.0.0", () => console.log(`Palladium Playwright worker listening on :${PORT}`));
async function shutdown() { server.close(); for (const id of [...sessions.keys()]) await closeSession(id); try { if (browserPromise) await (await browserPromise).close(); } catch {} process.exit(0); }
process.on("SIGTERM", shutdown); process.on("SIGINT", shutdown);
