import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { decryptToken } from "./oauth.server";

export const SHOPIFY_API_VERSION = "2026-07";
export const SHOPIFY_SCOPES = [
  "write_products",
  "read_orders",
  "write_inventory",
  "read_locations",
] as const;

export type ShopifyRisk = "low" | "medium" | "high";
export type ShopifyCapability = {
  provider: "shopify";
  action: string;
  description: string;
  risk: ShopifyRisk;
  requiresApproval: boolean;
  deployed: true;
  inputSchema: Record<string, unknown>;
  transport: "native";
};

type BoundedShopifyInput = {
  query?: string;
  limit?: number;
  product_id?: string;
  title?: string;
  vendor?: string;
  product_type?: string;
  status?: "ACTIVE" | "DRAFT" | "ARCHIVED";
  tags?: string[];
  inventory_item_id?: string;
  location_id?: string;
  quantity?: number;
  current_quantity?: number;
  reason?: string;
};

const PRODUCT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
const INVENTORY_GID = /^gid:\/\/shopify\/InventoryItem\/\d+$/;
const LOCATION_GID = /^gid:\/\/shopify\/Location\/\d+$/;

export function normalizeShopifyDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let shop = value.trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!shop.includes(".")) shop = `${shop}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) ? shop : null;
}

export function shopifyConfigured(): boolean {
  return Boolean(process.env["SHOPIFY_CLIENT_ID"] && process.env["SHOPIFY_CLIENT_SECRET"]);
}

export function buildShopifyAuthorizeUrl(args: { shop: string; state: string; redirectUri: string }): string {
  const shop = normalizeShopifyDomain(args.shop);
  if (!shop) throw new Error("Enter a valid Shopify store domain, for example mystore.myshopify.com.");
  if (!shopifyConfigured()) throw new Error("Shopify OAuth credentials are not configured.");
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", process.env["SHOPIFY_CLIENT_ID"]!);
  url.searchParams.set("scope", SHOPIFY_SCOPES.join(","));
  url.searchParams.set("redirect_uri", args.redirectUri);
  url.searchParams.set("state", args.state);
  return url.toString();
}

export function verifyShopifyCallbackHmac(params: URLSearchParams): boolean {
  const received = params.get("hmac") ?? "";
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const entries = [...params.entries()]
    .filter(([key]) => key !== "hmac")
    .sort(([a], [b]) => a.localeCompare(b));
  const message = entries.map(([key, value]) => `${key}=${value}`).join("&");
  const expected = createHmac("sha256", process.env["SHOPIFY_CLIENT_SECRET"] ?? "")
    .update(message)
    .digest("hex");
  const a = Buffer.from(received, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function exchangeShopifyCode(args: { shop: string; code: string }) {
  const shop = normalizeShopifyDomain(args.shop);
  if (!shop) throw new Error("Invalid Shopify shop domain.");
  if (!shopifyConfigured()) throw new Error("Shopify OAuth credentials are not configured.");
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: process.env["SHOPIFY_CLIENT_ID"]!,
      client_secret: process.env["SHOPIFY_CLIENT_SECRET"]!,
      code: args.code,
      expiring: "0",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || typeof payload["access_token"] !== "string")
    throw new Error("Shopify token exchange failed. Reconnect the store and try again.");
  const scopes = String(payload["scope"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const granted = new Set(scopes);
  const missing = SHOPIFY_SCOPES.filter((scope) => !granted.has(scope));
  if (missing.length)
    throw new Error(`Shopify did not grant required permissions: ${missing.join(", ")}.`);
  return { accessToken: payload["access_token"] as string, scopes };
}

async function ownedShopifyConnection(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: integration } = await supabaseAdmin
    .from("integrations")
    .select("id,config,status")
    .eq("user_id", userId)
    .eq("provider", "shopify")
    .eq("status", "connected")
    .maybeSingle();
  const shop = normalizeShopifyDomain((integration?.config as any)?.shop_domain);
  if (!integration || !shop) return null;
  const { data: credential } = await supabaseAdmin
    .from("integration_credentials")
    .select("access_token_ciphertext")
    .eq("user_id", userId)
    .eq("provider", "shopify")
    .maybeSingle();
  if (!credential?.access_token_ciphertext) return null;
  return { shop, accessToken: decryptToken(credential.access_token_ciphertext) };
}

async function shopifyGraphql(userId: string, query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal) {
  const connection = await ownedShopifyConnection(userId);
  if (!connection) throw new Error("Shopify is not connected natively or needs to be reconnected.");
  const response = await fetch(`https://${connection.shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Access-Token": connection.accessToken,
    },
    body: JSON.stringify({ query, variables }),
    signal: signal ?? AbortSignal.timeout(20_000),
  });
  const payload = (await response.json().catch(() => ({}))) as any;
  if (!response.ok) throw new Error(`Shopify returned ${response.status}.`);
  if (Array.isArray(payload?.errors) && payload.errors.length)
    throw new Error(String(payload.errors[0]?.message ?? "Shopify GraphQL request failed.").slice(0, 300));
  return payload?.data ?? {};
}

export async function hasNativeShopifyConnection(userId: string): Promise<boolean> {
  return Boolean(await ownedShopifyConnection(userId));
}

export async function listNativeShopifyCapabilities(userId: string): Promise<ShopifyCapability[]> {
  if (!(await hasNativeShopifyConnection(userId))) return [];
  const low = (action: string, description: string, properties: Record<string, unknown> = {}): ShopifyCapability => ({
    provider: "shopify",
    action,
    description,
    risk: "low",
    requiresApproval: false,
    deployed: true,
    transport: "native",
    inputSchema: { type: "object", properties, additionalProperties: false },
  });
  const write = (action: string, description: string, properties: Record<string, unknown>, required: string[]): ShopifyCapability => ({
    provider: "shopify",
    action,
    description,
    risk: "medium",
    requiresApproval: true,
    deployed: true,
    transport: "native",
    inputSchema: { type: "object", properties, required, additionalProperties: false },
  });
  return [
    low("shop_overview", "Read store identity, plan and primary domain."),
    low("products_list", "List or search products.", { query: { type: "string" }, limit: { type: "number" } }),
    low("orders_list", "List recent orders without exposing customer contact fields.", { query: { type: "string" }, limit: { type: "number" } }),
    low("inventory_list", "Read locations and product variant inventory levels.", { query: { type: "string" }, limit: { type: "number" } }),
    write("product_update", "Update bounded product merchandising fields.", {
      product_id: { type: "string" }, title: { type: "string" }, vendor: { type: "string" }, product_type: { type: "string" }, status: { type: "string", enum: ["ACTIVE", "DRAFT", "ARCHIVED"] }, tags: { type: "array", items: { type: "string" } },
    }, ["product_id"]),
    write("inventory_set_on_hand", "Set on-hand inventory at an approved location.", {
      inventory_item_id: { type: "string" }, location_id: { type: "string" }, quantity: { type: "number" }, current_quantity: { type: "number" }, reason: { type: "string" },
    }, ["inventory_item_id", "location_id", "quantity", "current_quantity"]),
  ];
}

function boundedLimit(value: unknown) {
  const n = Number(value ?? 20);
  return Number.isFinite(n) ? Math.max(1, Math.min(50, Math.trunc(n))) : 20;
}
function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function prepareNativeShopifyAction(input: { userId: string; action: string; actionInput: Record<string, unknown> }) {
  const capabilities = await listNativeShopifyCapabilities(input.userId);
  const capability = capabilities.find((item) => item.action === input.action);
  if (!capability) throw new Error(`Native Shopify does not expose action "${input.action}".`);
  const raw = input.actionInput ?? {};
  let bounded: BoundedShopifyInput = {};
  if (input.action === "product_update") {
    const id = text(raw["product_id"], 120);
    if (!PRODUCT_GID.test(id)) throw new Error("A valid Shopify product_id is required.");
    bounded.product_id = id;
    for (const key of ["title", "vendor", "product_type"] as const) {
      const value = text(raw[key], key === "title" ? 255 : 150);
      if (value) bounded[key] = value;
    }
    const status = text(raw["status"], 20).toUpperCase();
    if (status === "ACTIVE" || status === "DRAFT" || status === "ARCHIVED") bounded.status = status;
    if (Array.isArray(raw["tags"])) bounded.tags = raw["tags"].slice(0, 100).map((value) => text(value, 100)).filter(Boolean);
  } else if (input.action === "inventory_set_on_hand") {
    const inventoryItemId = text(raw["inventory_item_id"], 120);
    const locationId = text(raw["location_id"], 120);
    if (!INVENTORY_GID.test(inventoryItemId) || !LOCATION_GID.test(locationId)) throw new Error("Valid Shopify inventory_item_id and location_id values are required.");
    const quantity = Number(raw["quantity"]);
    const currentQuantity = Number(raw["current_quantity"]);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1_000_000 || !Number.isInteger(currentQuantity) || currentQuantity < 0 || currentQuantity > 1_000_000) throw new Error("Inventory quantities must be whole numbers between 0 and 1,000,000.");
    bounded = { inventory_item_id: inventoryItemId, location_id: locationId, quantity, current_quantity: currentQuantity, reason: text(raw["reason"], 80) || "correction" };
  } else {
    bounded = { query: text(raw["query"], 200), limit: boundedLimit(raw["limit"]) };
  }
  return { provider: "shopify" as const, action: capability.action, description: capability.description, risk: capability.risk, requiresApproval: capability.requiresApproval, input: bounded, transport: "native" as const };
}

export async function executeNativeShopifyAction(input: { userId: string; action: string; actionInput: Record<string, unknown>; signal?: AbortSignal }) {
  const prepared = await prepareNativeShopifyAction(input);
  const v: BoundedShopifyInput = prepared.input;
  if (input.action === "shop_overview") {
    const data = await shopifyGraphql(input.userId, `query { shop { name myshopifyDomain primaryDomain { host url } plan { displayName } currencyCode timezoneAbbreviation } }`, {}, input.signal);
    return { ok: true as const, provider: "shopify", result: data.shop };
  }
  if (input.action === "products_list") {
    const data = await shopifyGraphql(input.userId, `query Products($first:Int!,$query:String){ products(first:$first,query:$query,sortKey:UPDATED_AT,reverse:true){ nodes { id title handle vendor productType status updatedAt totalInventory variants(first:20){nodes{id title sku inventoryItem{id} inventoryQuantity}} } } }`, { first: v.limit ?? 20, query: v.query || null }, input.signal);
    return { ok: true as const, provider: "shopify", result: data.products };
  }
  if (input.action === "orders_list") {
    const data = await shopifyGraphql(input.userId, `query Orders($first:Int!,$query:String){ orders(first:$first,query:$query,sortKey:CREATED_AT,reverse:true){ nodes { id name createdAt displayFinancialStatus displayFulfillmentStatus currentTotalPriceSet{shopMoney{amount currencyCode}} lineItems(first:30){nodes{name quantity sku}} } } }`, { first: v.limit ?? 20, query: v.query || null }, input.signal);
    return { ok: true as const, provider: "shopify", result: data.orders };
  }
  if (input.action === "inventory_list") {
    const data = await shopifyGraphql(input.userId, `query Inventory($first:Int!,$query:String){ locations(first:20){nodes{id name isActive}} products(first:$first,query:$query){nodes{id title variants(first:20){nodes{id title sku inventoryItem{id inventoryLevels(first:20){nodes{location{id name} quantities(names:[\"available\",\"on_hand\"]){name quantity}}}}}}}} }`, { first: v.limit ?? 20, query: v.query || null }, input.signal);
    return { ok: true as const, provider: "shopify", result: data };
  }
  if (input.action === "product_update") {
    if (!v.product_id) throw new Error("Prepared Shopify product update is missing product_id.");
    const product: Record<string, unknown> = { id: v.product_id };
    if (v.title) product["title"] = v.title;
    if (v.vendor) product["vendor"] = v.vendor;
    if (v.product_type) product["productType"] = v.product_type;
    if (v.status) product["status"] = v.status;
    if (v.tags) product["tags"] = v.tags;
    const data = await shopifyGraphql(input.userId, `mutation ProductUpdate($product:ProductUpdateInput!){productUpdate(product:$product){product{id title handle vendor productType status tags updatedAt} userErrors{field message}}}`, { product }, input.signal);
    const errors = data.productUpdate?.userErrors ?? [];
    return errors.length ? { ok: false as const, provider: "shopify", error: String(errors[0]?.message ?? "Shopify rejected the product update.") } : { ok: true as const, provider: "shopify", result: data.productUpdate?.product };
  }
  if (input.action === "inventory_set_on_hand") {
    if (!v.inventory_item_id || !v.location_id || v.quantity === undefined || v.current_quantity === undefined)
      throw new Error("Prepared Shopify inventory update is incomplete.");
    const data = await shopifyGraphql(input.userId, `mutation SetInventory($input:InventorySetOnHandQuantitiesInput!,$key:String!){inventorySetOnHandQuantities(input:$input) @idempotent(key:$key){inventoryAdjustmentGroup{createdAt reason changes{name delta}} userErrors{field message}}}`, {
      key: randomUUID(),
      input: { reason: v.reason ?? "correction", setQuantities: [{ inventoryItemId: v.inventory_item_id, locationId: v.location_id, quantity: v.quantity, changeFromQuantity: v.current_quantity }] },
    }, input.signal);
    const errors = data.inventorySetOnHandQuantities?.userErrors ?? [];
    return errors.length ? { ok: false as const, provider: "shopify", error: String(errors[0]?.message ?? "Shopify rejected the inventory change.") } : { ok: true as const, provider: "shopify", result: data.inventorySetOnHandQuantities?.inventoryAdjustmentGroup };
  }
  throw new Error("Unsupported native Shopify action.");
}
