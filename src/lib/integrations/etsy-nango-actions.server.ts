import {
  getOwnedNangoConnection,
  proxyOwnedNangoRequest,
  type SafeNangoRequest,
} from "./nango.server";

export type EtsyNangoActionRisk = "low" | "medium" | "high";

export type EtsyNangoCapability = {
  provider: "etsy";
  action: string;
  description: string;
  risk: EtsyNangoActionRisk;
  requiresApproval: boolean;
  deployed: true;
  inputSchema: Record<string, unknown>;
};

type EtsyActionDefinition = EtsyNangoCapability & {
  buildRequest(input: Record<string, unknown>): SafeNangoRequest;
};

const POSITIVE_ID = { type: "integer", minimum: 1 } as const;
const LIMIT = { type: "integer", minimum: 1, maximum: 100 } as const;
const OFFSET = { type: "integer", minimum: 0, maximum: 10_000 } as const;

function objectSchema(
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

function positiveId(input: Record<string, unknown>, key: string): number {
  const value = Number(input[key]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive Etsy numeric ID.`);
  }
  return value;
}

function boundedInteger(
  input: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = input[key];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${key} must be an integer between ${min} and ${max}.`);
  }
  return value;
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

function boundedNumber(
  input: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  required = false,
): number | undefined {
  const raw = input[key];
  if (raw === undefined || raw === null || raw === "") {
    if (required) throw new Error(`${key} is required.`);
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  return value;
}

function formBody(values: Record<string, string | number | boolean | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) body.set(key, String(value));
  }
  return body.toString();
}

function safeInventory(input: Record<string, unknown>): Record<string, unknown> {
  const inventory = input["inventory"];
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    throw new Error("inventory must be an Etsy inventory object.");
  }
  const serialized = JSON.stringify(inventory);
  if (serialized.length > 48_000) throw new Error("Etsy inventory payload exceeds the 48 KB limit.");
  if (/(token|secret|password|authorization|api[_-]?key)/i.test(serialized)) {
    throw new Error("Credentials cannot be supplied in Etsy inventory input.");
  }
  const row = inventory as Record<string, unknown>;
  if (!Array.isArray(row["products"]) || row["products"].length === 0 || row["products"].length > 400) {
    throw new Error("inventory.products must contain between 1 and 400 products.");
  }
  return row;
}

const ETSY_ACTIONS: readonly EtsyActionDefinition[] = [
  {
    provider: "etsy",
    action: "etsy_shop_listings_list",
    description: "List listings belonging to the connected Etsy shop, optionally filtered by state.",
    risk: "low",
    requiresApproval: false,
    deployed: true,
    inputSchema: objectSchema(
      {
        shop_id: POSITIVE_ID,
        state: { type: "string", enum: ["active", "inactive", "sold_out", "draft", "expired"] },
        limit: LIMIT,
        offset: OFFSET,
      },
      ["shop_id"],
    ),
    buildRequest(input) {
      const shopId = positiveId(input, "shop_id");
      const state = boundedString(input, "state", 20);
      if (state && !["active", "inactive", "sold_out", "draft", "expired"].includes(state)) {
        throw new Error("Unsupported Etsy listing state.");
      }
      const query = new URLSearchParams({
        limit: String(boundedInteger(input, "limit", 25, 1, 100)),
        offset: String(boundedInteger(input, "offset", 0, 0, 10_000)),
      });
      if (state) query.set("state", state);
      return {
        url: `https://api.etsy.com/v3/application/shops/${shopId}/listings?${query}`,
        method: "GET",
      };
    },
  },
  {
    provider: "etsy",
    action: "etsy_listing_get",
    description: "Read one Etsy listing by numeric listing ID.",
    risk: "low",
    requiresApproval: false,
    deployed: true,
    inputSchema: objectSchema({ listing_id: POSITIVE_ID }, ["listing_id"]),
    buildRequest(input) {
      const listingId = positiveId(input, "listing_id");
      return {
        url: `https://api.etsy.com/v3/application/listings/${listingId}`,
        method: "GET",
      };
    },
  },
  {
    provider: "etsy",
    action: "etsy_shop_receipts_list",
    description: "List recent Etsy shop receipts/orders for fulfilment and support context.",
    risk: "low",
    requiresApproval: false,
    deployed: true,
    inputSchema: objectSchema(
      { shop_id: POSITIVE_ID, limit: LIMIT, offset: OFFSET },
      ["shop_id"],
    ),
    buildRequest(input) {
      const shopId = positiveId(input, "shop_id");
      const query = new URLSearchParams({
        limit: String(boundedInteger(input, "limit", 25, 1, 100)),
        offset: String(boundedInteger(input, "offset", 0, 0, 10_000)),
      });
      return {
        url: `https://api.etsy.com/v3/application/shops/${shopId}/receipts?${query}`,
        method: "GET",
      };
    },
  },
  {
    provider: "etsy",
    action: "etsy_draft_listing_create",
    description: "Create a draft Etsy listing. Publishing remains a separate approved update.",
    risk: "medium",
    requiresApproval: true,
    deployed: true,
    inputSchema: objectSchema(
      {
        shop_id: POSITIVE_ID,
        quantity: { type: "integer", minimum: 1, maximum: 999 },
        title: { type: "string", minLength: 1, maxLength: 140 },
        description: { type: "string", minLength: 1, maxLength: 20_000 },
        price: { type: "number", minimum: 0.01, maximum: 1_000_000 },
        who_made: { type: "string", enum: ["i_did", "collective", "someone_else"] },
        when_made: { type: "string", maxLength: 40 },
        taxonomy_id: POSITIVE_ID,
        shipping_profile_id: POSITIVE_ID,
        readiness_state_id: POSITIVE_ID,
      },
      ["shop_id", "quantity", "title", "description", "price", "who_made", "when_made", "taxonomy_id"],
    ),
    buildRequest(input) {
      const shopId = positiveId(input, "shop_id");
      const quantity = boundedInteger(input, "quantity", 1, 1, 999);
      const title = boundedString(input, "title", 140, true)!;
      const description = boundedString(input, "description", 20_000, true)!;
      const price = boundedNumber(input, "price", 0.01, 1_000_000, true)!;
      const whoMade = boundedString(input, "who_made", 20, true)!;
      if (!["i_did", "collective", "someone_else"].includes(whoMade)) {
        throw new Error("Unsupported Etsy who_made value.");
      }
      const whenMade = boundedString(input, "when_made", 40, true)!;
      const taxonomyId = positiveId(input, "taxonomy_id");
      const shippingProfileId = input["shipping_profile_id"] == null
        ? undefined
        : positiveId(input, "shipping_profile_id");
      const readinessStateId = input["readiness_state_id"] == null
        ? undefined
        : positiveId(input, "readiness_state_id");
      return {
        url: `https://api.etsy.com/v3/application/shops/${shopId}/listings`,
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody({
          quantity,
          title,
          description,
          price,
          who_made: whoMade,
          when_made: whenMade,
          taxonomy_id: taxonomyId,
          shipping_profile_id: shippingProfileId,
          readiness_state_id: readinessStateId,
        }),
      };
    },
  },
  {
    provider: "etsy",
    action: "etsy_listing_update",
    description: "Update bounded editable fields on an Etsy listing, including activation/deactivation.",
    risk: "medium",
    requiresApproval: true,
    deployed: true,
    inputSchema: objectSchema(
      {
        listing_id: POSITIVE_ID,
        title: { type: "string", minLength: 1, maxLength: 140 },
        description: { type: "string", maxLength: 20_000 },
        state: { type: "string", enum: ["active", "inactive"] },
      },
      ["listing_id"],
    ),
    buildRequest(input) {
      const listingId = positiveId(input, "listing_id");
      const title = boundedString(input, "title", 140);
      const description = boundedString(input, "description", 20_000);
      const state = boundedString(input, "state", 20);
      if (state && !["active", "inactive"].includes(state)) {
        throw new Error("Etsy listing state updates may only use active or inactive.");
      }
      if (!title && description === undefined && !state) {
        throw new Error("Provide at least one Etsy listing field to update.");
      }
      return {
        url: `https://api.etsy.com/v3/application/listings/${listingId}`,
        method: "PATCH",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody({ title, description, state }),
      };
    },
  },
  {
    provider: "etsy",
    action: "etsy_listing_inventory_update",
    description: "Replace an Etsy listing's inventory products/offerings using a bounded inventory payload.",
    risk: "medium",
    requiresApproval: true,
    deployed: true,
    inputSchema: objectSchema(
      {
        listing_id: POSITIVE_ID,
        inventory: {
          type: "object",
          required: ["products"],
          properties: {
            products: { type: "array", minItems: 1, maxItems: 400 },
            price_on_property: { type: "array", maxItems: 3 },
            quantity_on_property: { type: "array", maxItems: 3 },
            sku_on_property: { type: "array", maxItems: 3 },
            readiness_state_on_property: { type: "array", maxItems: 3 },
          },
          additionalProperties: false,
        },
      },
      ["listing_id", "inventory"],
    ),
    buildRequest(input) {
      const listingId = positiveId(input, "listing_id");
      const inventory = safeInventory(input);
      return {
        url: `https://api.etsy.com/v3/application/listings/${listingId}/inventory`,
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inventory),
      };
    },
  },
] as const;

export function listEtsyNangoCapabilities(): EtsyNangoCapability[] {
  return ETSY_ACTIONS.map(({ buildRequest: _buildRequest, ...capability }) => capability);
}

export function isEtsyNangoAction(action: string): boolean {
  return ETSY_ACTIONS.some((definition) => definition.action === action);
}

function definitionFor(action: string): EtsyActionDefinition {
  const definition = ETSY_ACTIONS.find((item) => item.action === action);
  if (!definition) throw new Error(`Unsupported bounded Etsy action: ${action}.`);
  return definition;
}

async function assertConnected(userId: string) {
  const connection = await getOwnedNangoConnection(userId, "etsy");
  if (!connection || (connection.persisted && connection.persisted.status !== "connected")) {
    throw new Error("Etsy is not connected through Nango.");
  }
}

export async function prepareEtsyNangoAction(input: {
  userId: string;
  action: string;
  actionInput: Record<string, unknown>;
}) {
  const definition = definitionFor(input.action);
  definition.buildRequest(input.actionInput);
  await assertConnected(input.userId);
  return {
    provider: "etsy" as const,
    action: definition.action,
    description: definition.description,
    risk: definition.risk,
    requiresApproval: definition.requiresApproval,
    input: input.actionInput,
  };
}

export async function executeEtsyNangoAction(input: {
  userId: string;
  action: string;
  actionInput: Record<string, unknown>;
  signal?: AbortSignal;
}) {
  const definition = definitionFor(input.action);
  const request = definition.buildRequest(input.actionInput);
  await assertConnected(input.userId);
  const result = await proxyOwnedNangoRequest(
    input.userId,
    "etsy",
    request,
    input.signal,
  );
  return {
    ok: true as const,
    provider: "etsy" as const,
    result,
  };
}
