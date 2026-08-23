import { beforeEach, describe, expect, it, vi } from "vitest";

const { persistNangoGitHubConnection, markNangoGitHubConnectionError } = vi.hoisted(() => ({
  persistNangoGitHubConnection: vi.fn(),
  markNangoGitHubConnectionError: vi.fn(),
}));

vi.mock("./nango.server", () => ({
  NANGO_GITHUB_INTEGRATION: "github-getting-started",
  persistNangoGitHubConnection,
  markNangoGitHubConnectionError,
}));

import {
  processNangoWebhook,
  signNangoWebhookBody,
  verifyNangoWebhookRequest,
} from "./nango-webhook.server";

const userId = "123e4567-e89b-42d3-a456-426614174000";

describe("Nango auth webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NANGO_WEBHOOK_SIGNING_KEY", "test-signing-key");
  });

  it("verifies the raw body with Nango's HMAC-SHA256 header", async () => {
    const rawBody = JSON.stringify({ type: "future-webhook", value: "raw bytes matter" });
    const signature = await signNangoWebhookBody(rawBody, "test-signing-key");
    const request = new Request("https://palladium.example/api/public/integrations/nango-webhook", {
      method: "POST",
      body: rawBody,
      headers: { "X-Nango-Hmac-Sha256": signature },
    });

    await expect(verifyNangoWebhookRequest(request)).resolves.toEqual(JSON.parse(rawBody));
  });

  it("rejects missing or forged signatures", async () => {
    const unsigned = new Request("https://palladium.example/webhook", {
      method: "POST",
      body: "{}",
    });
    const forged = new Request("https://palladium.example/webhook", {
      method: "POST",
      body: "{}",
      headers: { "X-Nango-Hmac-Sha256": "0".repeat(64) },
    });

    await expect(verifyNangoWebhookRequest(unsigned)).rejects.toMatchObject({ status: 401 });
    await expect(verifyNangoWebhookRequest(forged)).rejects.toMatchObject({ status: 401 });
  });

  it("persists successful auth events against the tagged Palladium owner", async () => {
    const result = await processNangoWebhook({
      type: "auth",
      operation: "creation",
      connectionId: "nango-connection-1",
      providerConfigKey: "github-getting-started",
      provider: "github",
      environment: "prod",
      authMode: "OAUTH2",
      success: true,
      tags: { end_user_id: userId, end_user_email: "owner@example.com" },
    });

    expect(result).toEqual({ accepted: true, handled: true });
    expect(persistNangoGitHubConnection).toHaveBeenCalledWith(
      expect.objectContaining({ userId, connectionId: "nango-connection-1" }),
    );
  });

  it("marks the matching stored connection for reconnect after an auth failure", async () => {
    markNangoGitHubConnectionError.mockResolvedValue(true);
    const result = await processNangoWebhook({
      type: "auth",
      operation: "refresh",
      connectionId: "nango-connection-1",
      providerConfigKey: "github-getting-started",
      success: false,
      tags: { end_user_id: userId },
      error: { type: "refresh_error", description: "Provider refresh token expired." },
    });

    expect(result).toEqual({ accepted: true, handled: true });
    expect(markNangoGitHubConnectionError).toHaveBeenCalledWith({
      userId,
      connectionId: "nango-connection-1",
      error: "Provider refresh token expired.",
    });
  });

  it("acknowledges unknown, unrelated, and unowned events without writing", async () => {
    await expect(processNangoWebhook({ type: "new-nango-event" })).resolves.toEqual({
      accepted: true,
      handled: false,
    });
    await expect(
      processNangoWebhook({
        type: "auth",
        operation: "creation",
        connectionId: "other",
        providerConfigKey: "slack",
        success: true,
        tags: { end_user_id: userId },
      }),
    ).resolves.toEqual({ accepted: true, handled: false });
    expect(persistNangoGitHubConnection).not.toHaveBeenCalled();
  });
});
