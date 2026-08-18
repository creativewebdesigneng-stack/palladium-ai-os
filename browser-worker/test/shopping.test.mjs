import test from "node:test";
import assert from "node:assert/strict";
import {
  isLikelyProductUrl,
  normaliseProductCandidates,
  retailerSearchUrl,
  sellerLabel,
  supportedRetailerDomains,
} from "../shopping.mjs";

test("builds real search URLs only for supported allowlisted retailers", () => {
  assert.match(retailerSearchUrl("amazon.co.uk", "wireless headphones"), /^https:\/\/www\.amazon\.co\.uk\/s\?k=/);
  assert.match(retailerSearchUrl("johnlewis.com", "coffee machine"), /^https:\/\/www\.johnlewis\.com\/search/);
  assert.equal(retailerSearchUrl("example.com", "gift"), null);
  assert.deepEqual(
    supportedRetailerDomains(["www.amazon.co.uk", "example.com", "argos.co.uk", "amazon.co.uk"]),
    ["amazon.co.uk", "argos.co.uk"],
  );
  assert.equal(sellerLabel("currys.co.uk"), "Currys");
});

test("recognises direct retailer product URLs and rejects search/category URLs", () => {
  assert.equal(isLikelyProductUrl("amazon.co.uk", "https://www.amazon.co.uk/dp/B0ABC12345?th=1"), true);
  assert.equal(isLikelyProductUrl("amazon.co.uk", "https://www.amazon.co.uk/s?k=chair"), false);
  assert.equal(isLikelyProductUrl("johnlewis.com", "https://www.johnlewis.com/example-chair/p1234567"), true);
  assert.equal(isLikelyProductUrl("argos.co.uk", "https://www.argos.co.uk/product/1234567"), true);
  assert.equal(isLikelyProductUrl("currys.co.uk", "https://www.currys.co.uk/products/example-chair-10200000.html"), true);
  assert.equal(isLikelyProductUrl("ikea.com", "https://www.ikea.com/gb/en/p/markus-office-chair-vissle-dark-grey-70261150/"), true);
  assert.equal(isLikelyProductUrl("tesco.com", "https://www.tesco.com/groceries/en-GB/products/123456789"), true);
  assert.equal(isLikelyProductUrl("amazon.co.uk", "https://example.com/dp/B0ABC12345"), false);
});

test("normalises, ranks and budget-filters retailer products", () => {
  const results = normaliseProductCandidates([
    { product: "Premium headphones", price: 120, seller: "Shop A", url: "https://shop.test/premium", rating: 4.9, inStock: true },
    { product: "Budget headphones", price: 45, seller: "Shop B", url: "https://shop.test/budget", rating: 4.4, inStock: true, specs: { image_url: "https://cdn.shop.test/budget.jpg" } },
    { product: "Budget headphones", price: 45, seller: "Shop B", url: "https://shop.test/budget", rating: 4.4, inStock: true },
    { product: "Unavailable headphones", price: 39, seller: "Shop C", url: "https://shop.test/oos", rating: 5, inStock: false },
    { product: "Broken", price: 0, seller: "Shop D", url: "https://shop.test/broken" },
  ], { budget: 80, currency: "GBP" });

  assert.equal(results.length, 2);
  assert.equal(results[0].product, "Budget headphones");
  assert.equal(results[0].currency, "GBP");
  assert.equal(results[0].specs.image_url, "https://cdn.shop.test/budget.jpg");
  assert.equal(results[1].inStock, false);
  assert.ok(results.every((item) => item.price <= 80));
});

test("verified Explorer mode rejects placeholders without a verified product page and image", () => {
  const results = normaliseProductCandidates([
    { product: "Search page placeholder", price: 50, seller: "Shop A", url: "https://shop.test/search?q=headphones", specs: { image_url: "https://cdn.shop.test/search.jpg" } },
    { product: "Verified without image", price: 55, seller: "Shop A", url: "https://shop.test/product/no-image", specs: { verified_product_page: true } },
    { product: "Verified headphones", price: 60, seller: "Shop A", url: "https://shop.test/product/headphones", specs: { verified_product_page: true, image_url: "https://cdn.shop.test/headphones.jpg", canonical_url: "https://shop.test/product/headphones" } },
  ], { budget: 80, currency: "GBP", requireVerified: true });

  assert.equal(results.length, 1);
  assert.equal(results[0].product, "Verified headphones");
  assert.equal(results[0].specs.verified_product_page, true);
  assert.match(results[0].specs.image_url, /^https:\/\//);
  assert.match(results[0].url, /\/product\/headphones$/);
});
