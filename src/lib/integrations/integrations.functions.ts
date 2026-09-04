/**
 * Integration connections.
 *
 * Connections are authorised with OAuth only — PalladiumAI has no field for a
 * third-party password. Access and refresh tokens are encrypted and stored in
 * `integration_credentials`, which is readable only by trusted server code, so
 * they are never returned to the browser by any function in this file.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { INTEGRATION_PROVIDERS, findProvider } from "./providers";
import { assessIntegrationHealth } from "./integration-health";

type Sb = { from: (t: string) => any };

const providerInput = z.object({
  provider: z.string().trim().min(2).max(60),
  name: z.string().trim().max(80).optional(),
});

const startInput = z.object({
  provider: z.string().trim().min(2).max(60),
  origin: z.string().trim().url().max(300).optional(),
});

/** Provider catalogue plus this user's connection state and safe health summary. */
export const listIntegrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb
      .from("integrations")
      .select(
        "id,provider,name,status,scopes,granted_scopes,account_label,integration_type,last_error,connected_at,last_sync_at,expires_at,created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const [{ providerConfigured }, { supabaseAdmin }] = await Promise.all([
      import("./oauth.server"),
      import("@/integrations/supabase/client.server"),
    ]);
    const { data: credentials } = await supabaseAdmin
      .from("integration_credentials")
      .select("provider,refresh_token_ciphertext,expires_at")
      .eq("user_id", context.userId);
    const credentialsByProvider = new Map(
      (credentials ?? []).map((row: any) => [String(row.provider), row]),
    );

    const catalogue = INTEGRATION_PROVIDERS.map((provider) => {
      const connection = (rows ?? []).find((r: any) => r.provider === provider.id) ?? null;
      const credential: any = credentialsByProvider.get(provider.id);
      const health = assessIntegrationHealth({
        providerName: provider.name,
        requiredScopes: provider.scopes,
        status: connection?.status ?? null,
        grantedScopes: connection?.granted_scopes ?? [],
        expiresAt: credential?.expires_at ?? connection?.expires_at ?? null,
        hasRefreshToken: Boolean(credential?.refresh_token_ciphertext),
        lastError: connection?.last_error ?? null,
      });
      return {
        id: provider.id,
        name: provider.name,
        category: provider.category,
        summary: provider.summary,
        scopes: provider.scopes,
        tools: provider.tools,
        docsUrl: provider.docsUrl,
        configured: providerConfigured(provider),
        connection: connection ? { ...connection, health } : null,
      };
    });

    return { integrations: rows ?? [], catalogue };
  });

/**
 * Performs one bounded, read-only provider request to prove the stored
 * credential works now. No external data is written by this health check.
 */
export const testIntegrationConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.pick({ provider: true }).parse(input))
  .handler(async ({ data, context }) => {
    const providerId = data.provider.trim().toLowerCase();
    const checkedAt = new Date().toISOString();

    if (providerId === "shopify") {
      const { executeNativeShopifyAction } = await import("./shopify.server");
      const result = await executeNativeShopifyAction({
        userId: context.userId,
        action: "shop_overview",
        actionInput: {},
        signal: AbortSignal.timeout(12_000),
      });
      if (!result.ok) throw new Error(result.error ?? "Shopify did not respond successfully.");
      return { ok: true, checkedAt, message: "Shopify store responded successfully through the native API." };
    }

    if (providerId === "meta") {
      const { discoverMetaAssets } = await import("./meta-social.server");
      const assets = await discoverMetaAssets(context.userId, AbortSignal.timeout(12_000));
      const instagramCount = assets.filter((asset) => asset.instagramAccount).length;
      return {
        ok: true,
        checkedAt,
        message: `Meta connection is valid. ${assets.length} Facebook Page${assets.length === 1 ? "" : "s"} and ${instagramCount} linked Instagram professional account${instagramCount === 1 ? "" : "s"} are available.`,
      };
    }

    if (providerId === "youtube") {
      const { discoverYouTubeChannels } = await import("./youtube-social.server");
      const channels = await discoverYouTubeChannels(context.userId, AbortSignal.timeout(12_000));
      const label = channels[0]?.title;
      return {
        ok: true,
        checkedAt,
        message: channels.length
          ? `YouTube connection is valid. ${channels.length} channel${channels.length === 1 ? "" : "s"} available${label ? `; primary channel: ${label}.` : "."}`
          : "YouTube token is valid, but no channel is available for this Google account.",
      };
    }

    if (providerId === "linkedin") {
      const provider = findProvider(providerId);
      if (!provider?.identity?.url) throw new Error("LinkedIn identity test is unavailable.");
      const { getIntegrationAccessToken } = await import("./oauth.server");
      const token = await getIntegrationAccessToken(context.userId, providerId);
      if (!token) throw new Error("LinkedIn is not connected, has expired, or needs to be reconnected.");
      const response = await fetch(provider.identity.url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`LinkedIn returned ${response.status}. Reconnect the account and try again.`);
      const profile = await response.json() as Record<string, unknown>;
      const name = typeof profile["name"] === "string" ? profile["name"].slice(0, 120) : "";
      return {
        ok: true,
        checkedAt,
        message: name
          ? `LinkedIn member connection is valid for ${name}. Native posting remains disabled until an approved author URN is available.`
          : "LinkedIn member connection is valid. Native posting remains disabled until an approved author URN is available.",
      };
    }

    if (providerId === "discord") {
      const provider = findProvider(providerId);
      if (!provider?.identity?.url) throw new Error("Discord identity test is unavailable.");
      const { getIntegrationAccessToken } = await import("./oauth.server");
      const token = await getIntegrationAccessToken(context.userId, providerId);
      if (!token) throw new Error("Discord is not connected, has expired, or needs to be reconnected.");
      const response = await fetch(provider.identity.url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`Discord returned ${response.status}. Reconnect the account and try again.`);
      return { ok: true, checkedAt, message: "Discord account token is valid. Agent channel actions are not enabled." };
    }

    const probes: Record<string, { action: string; query?: string; limit?: number }> = {
      google: { action: "calendar_upcoming", limit: 1 },
      microsoft: { action: "calendar_upcoming", limit: 1 },
      slack: { action: "channels_list", limit: 1 },
      hubspot: { action: "contacts_list", limit: 1 },
      salesforce: { action: "accounts_search", query: "a", limit: 1 },
      notion: { action: "search", limit: 1 },
      asana: { action: "workspaces_list", limit: 1 },
      linear: { action: "issues_search", query: "a", limit: 1 },
      github: { action: "repositories_list", limit: 1 },
    };
    const probe = probes[providerId];
    if (!probe) throw new Error("Unknown integration provider.");

    const { readConnectedService } = await import("./connected-service.server");
    const result = await readConnectedService(context.userId, { provider: providerId, ...probe }, AbortSignal.timeout(12_000)) as any;
    if (result?.error) throw new Error(String(result.error).slice(0, 300));
    return { ok: true, checkedAt, message: `${providerId === "github" ? "GitHub" : findProvider(providerId)?.name ?? providerId} responded successfully.` };
  });

/**
 * Step 1 of OAuth: mint a signed state and hand back the provider consent URL.
 * Nothing is trusted from the browser except the return origin, which is
 * validated against the app's own origins.
 */
export const startIntegrationOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startInput.parse(input))
  .handler(async ({ data, context }) => {
    const provider = findProvider(data.provider);
    if (!provider) throw new Error("Unknown integration provider.");

    const { providerConfigured, createState, buildAuthorizeUrl, safeOrigin } =
      await import("./oauth.server");
    if (!providerConfigured(provider)) {
      throw new Error(
        `${provider.name} is not available yet: the workspace owner needs to add its OAuth client credentials.`,
      );
    }

    const origin = safeOrigin(data.origin);
    if (provider.connectMode === "shopify_store") {
      return { authorizeUrl: `${origin}/shopify-connect` };
    }

    const sb = context.supabase as unknown as Sb;
    await sb.from("integrations").upsert(
      {
        user_id: context.userId,
        org_id: null,
        provider: provider.id,
        name: provider.name,
        integration_type: "oauth",
        status: "pending",
        scopes: provider.scopes,
        last_error: null,
      },
      { onConflict: "user_id,provider" },
    );

    return {
      authorizeUrl: buildAuthorizeUrl(provider, {
        origin,
        state: createState({ userId: context.userId, provider: provider.id, origin }),
      }),
    };
  });

/** Drops the connection and destroys the stored tokens. */
export const disconnectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb
      .from("integrations")
      .update({
        status: "disconnected",
        connected_at: null,
        expires_at: null,
        account_label: null,
        granted_scopes: [],
        last_error: null,
      })
      .eq("user_id", context.userId)
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("integration_credentials")
      .delete()
      .eq("user_id", context.userId)
      .eq("provider", data.provider);

    return { ok: true };
  });
