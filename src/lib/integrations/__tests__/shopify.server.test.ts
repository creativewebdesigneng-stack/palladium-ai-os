import { afterEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  buildShopifyAuthorizeUrl,
  normalizeShopifyDomain,
  SHOPIFY_SCOPES,
  verifyShopifyCallbackHmac,
} from "../shopify.server";

const priorId = process.env["SHOPIFY_CLIENT_ID"];
const priorSecret = process.env["SHOPIFY_CLIENT_SECRET"];

afterEach(() => {
  if (priorId === undefined) delete process.env["SHOPIFY_CLIENT_ID"];
  else process.env["SHOPIFY_CLIENT_ID"] = priorId;
  if (priorSecret === undefined) delete process.env["SHOPIFY_CLIENT_SECRET"];
  else process.env["SHOPIFY_CLIENT_SECRET"] = priorSecret;
});

describe("native Shopify security boundary", () => {
  it("canonicalises only anchored myshopify.com store domains", () => {
    expect(normalizeShopifyDomain("Example-Store")).toBe("example-store.myshopify.com");
    expect(normalizeShopifyDomain("https://example-store.myshopify.com/admin")).toBe("example-store.myshopify.com");
    expect(normalizeShopifyDomain("example-store.myshopify.com.attacker.example")).toBeNull();
    expect(normalizeShopifyDomain("myshopify.com")).toBeNull();
    expect(normalizeShopifyDomain("example.com")).toBeNull();
  });

  it("builds a store-scoped consent URL without exposing a client secret", () => {
    process.env["SHOPIFY_CLIENT_ID"] = "client-id";
    process.env["SHOPIFY_CLIENT_SECRET"] = "super-secret";
    const value = buildShopifyAuthorizeUrl({
      shop: "demo-store",
      state: "signed-state",
      redirectUri: "https://app.example/api/public/integrations/shopify-callback",
    });
    const url = new URL(value);
    expect(url.hostname).toBe("demo-store.myshopify.com");
    expect(url.pathname).toBe("/admin/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client-id");
    expect(url.searchParams.get("scope")).toBe(SHOPIFY_SCOPES.join(","));
    expect(value).not.toContain("super-secret");
  });

  it("validates Shopify callback HMAC with constant bounded inputs", () => {
    process.env["SHOPIFY_CLIENT_SECRET"] = "test-secret";
    const params = new URLSearchParams({
      code: "abc123",
      shop: "demo-store.myshopify.com",
      state: "state-value",
      timestamp: "1770000000",
    });
    const message = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    params.set("hmac", createHmac("sha256", "test-secret").update(message).digest("hex"));
    expect(verifyShopifyCallbackHmac(params)).toBe(true);
    params.set("shop", "evil-store.myshopify.com");
    expect(verifyShopifyCallbackHmac(params)).toBe(false);
  });
});
