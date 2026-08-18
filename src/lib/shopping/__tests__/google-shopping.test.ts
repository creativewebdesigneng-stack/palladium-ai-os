import { describe, expect, it } from "vitest";
import { normaliseGoogleShoppingRows } from "../google-shopping.server";

describe("normaliseGoogleShoppingRows", () => {
  it("falls back to the display price when extracted_price is missing", () => {
    const offers = normaliseGoogleShoppingRows([
      {
        title: "Ergonomic office chair",
        source: "Example Store",
        price: "£129.99",
        thumbnail: "https://images.example.com/chair.jpg",
        link: "https://example.com/products/chair",
      },
    ], { currency: "GBP" });

    expect(offers).toHaveLength(1);
    expect(offers[0]?.price).toBe(129.99);
    expect(offers[0]?.url).toBe("https://example.com/products/chair");
  });

  it("uses thumbnail arrays and preserves Google product metadata", () => {
    const offers = normaliseGoogleShoppingRows([
      {
        title: "Wireless headphones",
        source: "Audio Shop",
        extracted_price: "79.50",
        thumbnails: ["https://images.example.com/headphones.jpg"],
        product_link: "https://www.google.com/shopping/product/123",
        product_id: "123",
        immersive_product_page_token: "token-abc",
        serpapi_immersive_product_api: "https://serpapi.com/search.json?engine=google_immersive_product&page_token=token-abc",
      },
    ]);

    expect(offers).toHaveLength(1);
    expect(offers[0]?.specs?.["image_url"]).toBe("https://images.example.com/headphones.jpg");
    expect(offers[0]?.specs?.["google_product_id"]).toBe("123");
    expect(offers[0]?.specs?.["google_immersive_token"]).toBe("token-abc");
    expect(offers[0]?.specs?.["source_provider"]).toBe("google-shopping");
  });

  it("filters over-budget and duplicate product ids", () => {
    const rows = [
      {
        title: "Monitor A",
        source: "Store",
        extracted_price: 200,
        thumbnail: "https://images.example.com/a.jpg",
        link: "https://example.com/a",
        product_id: "same-id",
      },
      {
        title: "Monitor A duplicate",
        source: "Store",
        extracted_price: 200,
        thumbnail: "https://images.example.com/a2.jpg",
        link: "https://example.com/a2",
        product_id: "same-id",
      },
      {
        title: "Monitor B",
        source: "Store",
        extracted_price: 500,
        thumbnail: "https://images.example.com/b.jpg",
        link: "https://example.com/b",
        product_id: "b-id",
      },
    ];

    const offers = normaliseGoogleShoppingRows(rows, { budget: 250 });
    expect(offers).toHaveLength(1);
    expect(offers[0]?.product).toBe("Monitor A");
  });

  it("rejects incomplete rows that cannot render a real product card", () => {
    const offers = normaliseGoogleShoppingRows([
      { title: "No image", extracted_price: 20, link: "https://example.com/no-image" },
      { title: "No link", extracted_price: 20, thumbnail: "https://images.example.com/no-link.jpg" },
      { title: "No price", thumbnail: "https://images.example.com/no-price.jpg", link: "https://example.com/no-price" },
    ]);

    expect(offers).toEqual([]);
  });
});
