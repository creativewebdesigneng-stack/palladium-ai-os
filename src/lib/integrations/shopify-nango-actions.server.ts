import {
  getOwnedNangoConnection,
  proxyOwnedNangoRequest,
  type SafeNangoRequest,
} from "./nango.server";

export type ShopifyNangoActionRisk = "low" | "medium" | "high";

export type ShopifyNangoCapability = {
  provider: "shopify";
  action: string;
  description: string;
  risk: ShopifyNangoActionRisk;
  requiresApproval: boolean;
  deployed: true;
  inputSchema: Record<string, unknown>;
};

type ShopifyActionDefinition = ShopifyNangoCapability & {
  buildRequest(input: Record<string, unknown>): SafeNangoRequest;
  mutation?: boolean;
};

const SHOPIFY_GRAPHQL_PATH = "/admin/api/2026-07/graphql.json";
const SHOPIFY_PROXY_URL = `https://nango.invalid${SHOPIFY_GRAPHQL_PATH}`;
const CREDENTIAL_KEY = /(token|secret|password|authorization|api[_-]?key|cookie)/i;

function objectSchema(
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> {
  return { type: "object", properties, required, additionalProperties: false };
}

function boundedString(
  input: Record<string, unknown>,
  key: string,
  max: number,
  required = false,
): string | undefined {
  const raw = input[key];
  if (raw === undefined || raw === null) {
    if (required) throw new Error(`${key} is required.`);
    return undefined;
  }
  if (typeof raw !== "string") throw new Error(`${key} must be a string.`);
  const value = raw.trim();
  if (required && !value) throw new Error(`${key} is required.`);
  if (value.length > max) throw new Error(`${key} exceeds the ${max} character limit.`);
  return value || undefined;
}

function boundedLimit(input: Record<string, unknown>, fallback = 25): number {
  const raw = input["limit"];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 50) {
    throw new Error("limit must be an integer between 1 and 50.");
  }
  return value;
}

function boundedCursor(input: Record<string, unknown>): string | undefined {
  const cursor = boundedString(input, "after", 2_000);
  if (cursor && !/^[A-Za-z0-9+/=_-]+$/.test(cursor)) throw new Error("Invalid Shopify cursor.");
  return cursor;
}

function boundedBoolean(input: Record<string, unknown>, key: string, fallback = false): boolean {
  const raw = input[key];
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw !== "boolean") throw new Error(`${key} must be a boolean.`);
  return raw;
}

type ShopifyGidType = "Product" | "Order" | "FulfillmentOrder" | "FulfillmentOrderLineItem";

function shopifyGid(value: unknown, type: ShopifyGidType): string {
  const raw = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (/^\d{1,24}$/.test(raw)) return `gid://shopify/${type}/${raw}`;
  const pattern = new RegExp(`^gid://shopify/${type}/\\d{1,24}$`);
  if (pattern.test(raw)) return raw;
  const key = type.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  throw new Error(`${key}_id must be a numeric ID or Shopify ${type} GID.`);
}

function safeTags(input: Record<string, unknown>): string[] | undefined {
  const raw = input["tags"];
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length > 50) throw new Error("tags must be an array with at most 50 items.");
  return raw.map((value, index) => {
    if (typeof value !== "string") throw new Error(`tags[${index}] must be a string.`);
    const tag = value.trim();
    if (!tag || tag.length > 255) throw new Error(`tags[${index}] must be 1-255 characters.`);
    return tag;
  });
}

function safeFulfillmentLineItems(input: Record<string, unknown>) {
  const raw = input["line_items"];
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 50) {
    throw new Error("line_items must contain between 1 and 50 fulfillment-order line items.");
  }
  return raw.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`line_items[${index}] must be an object.`);
    }
    const row = item as Record<string, unknown>;
    const allowed = new Set(["id", "quantity"]);
    if (Object.keys(row).some((key) => !allowed.has(key))) {
      throw new Error(`line_items[${index}] contains an unsupported field.`);
    }
    const quantity = Number(row["quantity"]);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10_000) {
      throw new Error(`line_items[${index}].quantity must be an integer between 1 and 10000.`);
    }
    return {
      id: shopifyGid(row["id"], "FulfillmentOrderLineItem"),
      quantity,
    };
  });
}

function safeTrackingInfo(input: Record<string, unknown>) {
  const company = boundedString(input, "tracking_company", 100);
  const number = boundedString(input, "tracking_number", 200);
  const url = boundedString(input, "tracking_url", 2_000);
  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("tracking_url must be an absolute HTTPS URL.");
    }
    if (parsed.protocol !== "https:") throw new Error("tracking_url must use HTTPS.");
  }
  if (!company && !number && !url) return undefined;
  return {
    ...(company ? { company } : {}),
    ...(number ? { number } : {}),
    ...(url ? { url } : {}),
  };
}

function assertNoCredentials(value: unknown) {
  let count = 0;
  const visit = (item: unknown, depth: number) => {
    if (depth > 8) throw new Error("Shopify input is nested too deeply.");
    if (Array.isArray(item)) {
      if (item.length > 200) throw new Error("Shopify input contains too many array items.");
      for (const child of item) visit(child, depth + 1);
      return;
    }
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item as Record<string, unknown>)) {
      count += 1;
      if (count > 200) throw new Error("Shopify input contains too many fields.");
      if (CREDENTIAL_KEY.test(key)) throw new Error("Credentials cannot be supplied in Shopify action input.");
      visit(child, depth + 1);
    }
  };
  visit(value, 0);
}

function graphQLRequest(query: string, variables: Record<string, unknown> = {}): SafeNangoRequest {
  return {
    url: SHOPIFY_PROXY_URL,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  };
}

const SHOP_QUERY = `query PalladiumShop { shop { name myshopifyDomain currencyCode primaryDomain { host url } } }`;
const PRODUCTS_QUERY = `query PalladiumProducts($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
    nodes { id title handle status vendor productType updatedAt totalInventory tracksInventory }
    pageInfo { hasNextPage endCursor }
  }
}`;
const ORDERS_QUERY = `query PalladiumOrders($first: Int!, $after: String, $query: String) {
  orders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
    nodes {
      id name createdAt updatedAt displayFinancialStatus displayFulfillmentStatus
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      customer { displayName email }
      lineItems(first: 20) { nodes { id name quantity sku } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;
const PRODUCT_QUERY = `query PalladiumProduct($id: ID!) {
  product(id: $id) {
    id title handle descriptionHtml status vendor productType tags updatedAt totalInventory tracksInventory
    variants(first: 50) { nodes { id title sku price inventoryQuantity inventoryItem { id tracked } } }
  }
}`;
const LOCATIONS_QUERY = `query PalladiumLocations($first: Int!, $after: String, $query: String, $includeInactive: Boolean!) {
  locations(first: $first, after: $after, query: $query, includeInactive: $includeInactive) {
    nodes {
      id name isActive fulfillsOnlineOrders hasActiveInventory
      address { address1 address2 city provinceCode countryCode zip }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;
const FULFILLMENT_ORDERS_QUERY = `query PalladiumFulfillmentOrders($first: Int!, $after: String, $query: String, $includeClosed: Boolean!) {
  fulfillmentOrders(first: $first, after: $after, query: $query, includeClosed: $includeClosed, sortKey: UPDATED_AT, reverse: true) {
    nodes {
      id status requestStatus createdAt updatedAt
      assignedLocation { location { id name } }
      order { id name }
      destination { firstName lastName company city province countryCode zip }
      lineItems(first: 50) {
        nodes { id totalQuantity remainingQuantity lineItem { id name sku quantity } }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;
const CREATE_PRODUCT = `mutation PalladiumCreateProduct($product: ProductCreateInput!) {
  productCreate(product: $product) {
    product { id title handle status vendor productType tags }
    userErrors { field message }
  }
}`;
const UPDATE_PRODUCT = `mutation PalladiumUpdateProduct($product: ProductUpdateInput!) {
  productUpdate(product: $product) {
    product { id title handle status vendor productType tags updatedAt }
    userErrors { field message }
  }
}`;
const CREATE_FULFILLMENT = `mutation PalladiumCreateFulfillment($fulfillment: FulfillmentInput!, $message: String) {
  fulfillmentCreate(fulfillment: $fulfillment, message: $message) {
    fulfillment { id status createdAt updatedAt trackingInfo { company number url } }
    userErrors { field message }
  }
}`;

const SHOPIFY_ACTIONS: readonly ShopifyActionDefinition[] = [
  {
    provider: "shopify",
    action: "shopify_shop_get",
    description: "Read the connected Shopify store identity and currency.",
    risk: "low",
    requiresApproval: false,
    deployed: true,
    inputSchema: objectSchema({}),
    buildRequest: () => graphQLRequest(SHOP_QUERY),
  },
  {
    provider: "shopify",
    action: "shopify_products_list",
    description: "List recently updated Shopify products, optionally using a bounded Shopify search query.",
    risk: "low",
    requiresApproval: false,
    deployed: true,
    inputSchema: objectSchema({
      limit: { type: "integer", minimum: 1, maximum: 50 },
      after: { type: "string", maxLength: 2_000 },
      query: { type: "string", maxLength: 300 },
    }),
    buildRequest(input) {
      return graphQLRequest(PRODUCTS_QUERY, {
        first: boundedLimit(input),
        after: boundedCursor(input) ?? null,
        query: boundedString(input, "query", 300) ?? null,
      });
    },
  },
  {
    provider: "shopify",
    action: "shopify_product_get",
    description: "Read one Shopify product and its first 50 variants.",
    risk: "low",
    requiresApproval: false,
    deployed: true,
    inputSchema: objectSchema({ product_id: { type: "string", minLength: 1, maxLength: 80 } }, ["product_id"]),
    buildRequest(input) {
      return graphQLRequest(PRODUCT_QUERY, { id: shopifyGid(input["product_id"], "Product") });
    },
  },
  {
    provider: "shopify",
    action: "shopify_orders_list",
    description: "List recent Shopify orders for fulfilment, sales and customer-support context.",
    risk: "low",
    requiresApproval: false,
    deployed: true,
    inputSchema: objectSchema({
      limit: { type: "integer", minimum: 1, maximum: 50 },
      after: { type: "string", maxLength: 2_000 },
      query: { type: "string", maxLength: 300 },
    }),
    buildRequest(input) {
      return graphQLRequest(ORDERS_QUERY, {
        first: boundedLimit(input),
        after: boundedCursor(input) ?? null,
        query: boundedString(input, "query", 300) ?? null,
      });
    },
  },
  {
    provider: "shopify",
    action: "shopify_locations_list",
    description: "List Shopify inventory and fulfillment locations with bounded pagination and filtering.",
    risk: "low",
    requiresApproval: false,
    deployed: true,
    inputSchema: objectSchema({
      limit: { type: "integer", minimum: 1, maximum: 50 },
      after: { type: "string", maxLength: 2_000 },
      query: { type: "string", maxLength: 300 },
      include_inactive: { type: "boolean" },
    }),
    buildRequest(input) {
      return graphQLRequest(LOCATIONS_QUERY, {
        first: boundedLimit(input),
        after: boundedCursor(input) ?? null,
        query: boundedString(input, "query", 300) ?? null,
        includeInactive: boundedBoolean(input, "include_inactive"),
      });
    },
  },
  {
    provider: "shopify",
    action: "shopify_fulfillment_orders_list",
    description: "List Shopify fulfillment orders available to the connected app's granted fulfillment scopes.",
    risk: "low",
    requiresApproval: false,
    deployed: true,
    inputSchema: objectSchema({
      limit: { type: "integer", minimum: 1, maximum: 50 },
      after: { type: "string", maxLength: 2_000 },
      query: { type: "string", maxLength: 300 },
      include_closed: { type: "boolean" },
    }),
    buildRequest(input) {
      return graphQLRequest(FULFILLMENT_ORDERS_QUERY, {
        first: boundedLimit(input),
        after: boundedCursor(input) ?? null,
        query: boundedString(input, "query", 300) ?? null,
        includeClosed: boundedBoolean(input, "include_closed"),
      });
    },
  },
  {
    provider: "shopify",
    action: "shopify_product_create_draft",
    description: "Create a Shopify product in DRAFT status with bounded catalogue fields.",
    risk: "medium",
    requiresApproval: true,
    deployed: true,
    mutation: true,
    inputSchema: objectSchema(
      {
        title: { type: "string", minLength: 1, maxLength: 255 },
        description_html: { type: "string", maxLength: 20_000 },
        vendor: { type: "string", maxLength: 255 },
        product_type: { type: "string", maxLength: 255 },
        tags: { type: "array", maxItems: 50, items: { type: "string", maxLength: 255 } },
      },
      ["title"],
    ),
    buildRequest(input) {
      const product: Record<string, unknown> = {
        title: boundedString(input, "title", 255, true),
        status: "DRAFT",
      };
      const descriptionHtml = boundedString(input, "description_html", 20_000);
      const vendor = boundedString(input, "vendor", 255);
      const productType = boundedString(input, "product_type", 255);
      const tags = safeTags(input);
      if (descriptionHtml !== undefined) product["descriptionHtml"] = descriptionHtml;
      if (vendor !== undefined) product["vendor"] = vendor;
      if (productType !== undefined) product["productType"] = productType;
      if (tags !== undefined) product["tags"] = tags;
      return graphQLRequest(CREATE_PRODUCT, { product });
    },
  },
  {
    provider: "shopify",
    action: "shopify_product_update",
    description: "Update bounded Shopify product fields, including changing status between DRAFT and ACTIVE.",
    risk: "medium",
    requiresApproval: true,
    deployed: true,
    mutation: true,
    inputSchema: objectSchema(
      {
        product_id: { type: "string", minLength: 1, maxLength: 80 },
        title: { type: "string", minLength: 1, maxLength: 255 },
        description_html: { type: "string", maxLength: 20_000 },
        vendor: { type: "string", maxLength: 255 },
        product_type: { type: "string", maxLength: 255 },
        status: { type: "string", enum: ["DRAFT", "ACTIVE"] },
        tags: { type: "array", maxItems: 50, items: { type: "string", maxLength: 255 } },
      },
      ["product_id"],
    ),
    buildRequest(input) {
      const product: Record<string, unknown> = { id: shopifyGid(input["product_id"], "Product") };
      const title = boundedString(input, "title", 255);
      const descriptionHtml = boundedString(input, "description_html", 20_000);
      const vendor = boundedString(input, "vendor", 255);
      const productType = boundedString(input, "product_type", 255);
      const status = boundedString(input, "status", 10);
      const tags = safeTags(input);
      if (status && !["DRAFT", "ACTIVE"].includes(status)) throw new Error("status must be DRAFT or ACTIVE.");
      if (title !== undefined) product["title"] = title;
      if (descriptionHtml !== undefined) product["descriptionHtml"] = descriptionHtml;
      if (vendor !== undefined) product["vendor"] = vendor;
      if (productType !== undefined) product["productType"] = productType;
      if (status !== undefined) product["status"] = status;
      if (tags !== undefined) product["tags"] = tags;
      if (Object.keys(product).length === 1) throw new Error("Provide at least one Shopify product field to update.");
      return graphQLRequest(UPDATE_PRODUCT, { product });
    },
  },
  {
    provider: "shopify",
    action: "shopify_fulfillment_create",
    description: "Create a Shopify fulfillment for one fulfillment order, optionally with bounded line items and tracking information.",
    risk: "high",
    requiresApproval: true,
    deployed: true,
    mutation: true,
    inputSchema: objectSchema(
      {
        fulfillment_order_id: { type: "string", minLength: 1, maxLength: 100 },
        line_items: {
          type: "array",
          minItems: 1,
          maxItems: 50,
          items: objectSchema(
            {
              id: { type: "string", minLength: 1, maxLength: 120 },
              quantity: { type: "integer", minimum: 1, maximum: 10_000 },
            },
            ["id", "quantity"],
          ),
        },
        notify_customer: { type: "boolean" },
        tracking_company: { type: "string", maxLength: 100 },
        tracking_number: { type: "string", maxLength: 200 },
        tracking_url: { type: "string", maxLength: 2_000 },
        message: { type: "string", maxLength: 1_000 },
      },
      ["fulfillment_order_id"],
    ),
    buildRequest(input) {
      const fulfillmentOrderId = shopifyGid(input["fulfillment_order_id"], "FulfillmentOrder");
      const lineItems = safeFulfillmentLineItems(input);
      const trackingInfo = safeTrackingInfo(input);
      const message = boundedString(input, "message", 1_000);
      const fulfillment: Record<string, unknown> = {
        lineItemsByFulfillmentOrder: [
          {
            fulfillmentOrderId,
            ...(lineItems ? { fulfillmentOrderLineItems: lineItems } : {}),
          },
        ],
        notifyCustomer: boundedBoolean(input, "notify_customer"),
      };
      if (trackingInfo) fulfillment["trackingInfo"] = trackingInfo;
      return graphQLRequest(CREATE_FULFILLMENT, {
        fulfillment,
        message: message ?? null,
      });
    },
  },
];

export function listShopifyNangoCapabilities(): ShopifyNangoCapability[] {
  return SHOPIFY_ACTIONS.map(({ buildRequest: _buildRequest, mutation: _mutation, ...capability }) => capability);
}

export function isShopifyNangoAction(action: string): boolean {
  return SHOPIFY_ACTIONS.some((definition) => definition.action === action);
}

function definitionFor(action: string): ShopifyActionDefinition {
  const definition = SHOPIFY_ACTIONS.find((item) => item.action === action);
  if (!definition) throw new Error(`Unsupported bounded Shopify action: ${action}.`);
  return definition;
}

async function assertConnected(userId: string) {
  const connection = await getOwnedNangoConnection(userId, "shopify");
  if (!connection || (connection.persisted && connection.persisted.status !== "connected")) {
    throw new Error("Shopify is not connected through Nango.");
  }
}

function errorMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const message = (value as Record<string, unknown>)["message"];
  return typeof message === "string" && message.trim() ? message : fallback;
}

function assertGraphQLSuccess(result: unknown, mutation: boolean) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return;
  const row = result as Record<string, unknown>;
  const topLevelErrors = row["errors"];
  if (Array.isArray(topLevelErrors) && topLevelErrors.length) {
    const message = topLevelErrors
      .map((error) => errorMessage(error, "Shopify GraphQL error"))
      .join("; ");
    throw new Error(message.slice(0, 1_000));
  }
  if (!mutation) return;
  const rawData = row["data"];
  const data = rawData && typeof rawData === "object" && !Array.isArray(rawData)
    ? (rawData as Record<string, unknown>)
    : {};
  for (const payload of Object.values(data)) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) continue;
    const userErrors = (payload as Record<string, unknown>)["userErrors"];
    if (!Array.isArray(userErrors) || !userErrors.length) continue;
    const message = userErrors
      .map((error) => errorMessage(error, "Shopify mutation error"))
      .join("; ");
    throw new Error(message.slice(0, 1_000));
  }
}

export async function prepareShopifyNangoAction(input: {
  userId: string;
  action: string;
  actionInput: Record<string, unknown>;
}) {
  assertNoCredentials(input.actionInput);
  const definition = definitionFor(input.action);
  definition.buildRequest(input.actionInput);
  await assertConnected(input.userId);
  return {
    provider: "shopify" as const,
    action: definition.action,
    description: definition.description,
    risk: definition.risk,
    requiresApproval: definition.requiresApproval,
    input: input.actionInput,
  };
}

export async function executeShopifyNangoAction(input: {
  userId: string;
  action: string;
  actionInput: Record<string, unknown>;
  signal?: AbortSignal;
}) {
  assertNoCredentials(input.actionInput);
  const definition = definitionFor(input.action);
  const request = definition.buildRequest(input.actionInput);
  await assertConnected(input.userId);
  const result = await proxyOwnedNangoRequest(
    input.userId,
    "shopify",
    request,
    input.signal,
  );
  assertGraphQLSuccess(result, Boolean(definition.mutation));
  return { ok: true as const, provider: "shopify" as const, result };
}
