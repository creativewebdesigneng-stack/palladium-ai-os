import test from "node:test";
import assert from "node:assert/strict";
import {
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