import {
  markNangoConnectionError,
  nangoProviderFromIntegrationId,
  persistNangoConnection,
} from "./nango.server";

type NangoAuthWebhook = {
  type: "auth";
  operation: "creation" | "override" | "refresh";
  connectionId: string;
  authMode?: string;
  providerConfigKey: string;
  provider?: string;
  environment?: string;
  success: boolean;
  tags?: Record<string, string>;
  error?: { type?: string; description?: string };
};

export class NangoWebhookError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "NangoWebhookError";
  }
}

function signingKey() {
  const value = process.env["NANGO_WEBHOOK_SIGNING_KEY"]?.trim();
  if (!value) throw new NangoWebhookError("Nango webhook signing key is not configured.", 503);
  return value;
}

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function signNangoWebhookBody(rawBody: string, key = signingKey()) {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(rawBody)));
}

export async function verifyNangoWebhookRequest(request: Request): Promise<unknown> {
  const signature = request.headers.get("X-Nango-Hmac-Sha256")?.trim().toLowerCase();
  if (!signature) throw new NangoWebhookError("Missing Nango webhook signature.", 401);
  const rawBody = await request.text();
  const expected = await signNangoWebhookBody(rawBody);
  if (!constantTimeEqual(signature, expected)) {
    throw new NangoWebhookError("Invalid Nango webhook signature.", 401);
  }
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new NangoWebhookError("Invalid Nango webhook JSON.", 400);
  }
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function isAuthWebhook(value: any): value is NangoAuthWebhook {
  return (
    value?.type === "auth" &&
    ["creation", "override", "refresh"].includes(value.operation) &&
    typeof value.connectionId === "string" &&
    typeof value.providerConfigKey === "string" &&
    typeof value.success === "boolean"
  );
}

export async function processNangoWebhook(payload: unknown) {
  if (!isAuthWebhook(payload)) return { accepted: true, handled: false };
  const definition = nangoProviderFromIntegrationId(payload.providerConfigKey);
  if (!definition) return { accepted: true, handled: false };
  const userId = payload.tags?.["end_user_id"];
  if (!isUuid(userId)) return { accepted: true, handled: false };

  if (payload.success) {
    await persistNangoConnection({
      userId,
      providerId: definition.id,
      connectionId: payload.connectionId,
      integrationId: payload.providerConfigKey,
      ...(payload.provider ? { provider: payload.provider } : {}),
      ...(payload.environment ? { environment: payload.environment } : {}),
      ...(payload.authMode ? { authMode: payload.authMode } : {}),
      ...(payload.tags ? { tags: payload.tags } : {}),
    });
    return { accepted: true, handled: true };
  }

  const description =
    payload.error?.description ||
    (payload.operation === "refresh"
      ? "Nango could not refresh this connection. Reconnect the account."
      : "Nango could not authorize this connection. Try connecting again.");
  const handled = await markNangoConnectionError({
    userId,
    providerId: definition.id,
    connectionId: payload.connectionId,
    error: description,
  });
  return { accepted: true, handled };
}
