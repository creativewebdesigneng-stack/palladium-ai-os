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

const pageConnectorStateInput = z.object({
  providers: z.array(z.string().trim().min(1).max(80)).max(20),
});

export const listIntegrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: rows, error } = await sb
      .from("integrations")
      .select("id,provider,name,status,scopes,granted_scopes,account_label,integration_type,last_error,connected_at,last_sync_at,expires_at,created_at")
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
    const credentialsByProvider = new Map((credentials ?? []).map((row: any) => [String(row.provider), row]));

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

export const getPageConnectorConnectionState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pageConnectorStateInput.parse(input))
  .handler(async ({ data, context }) => {
    const providerIds = Array.from(
      new Set(data.providers.map((provider) => provider.trim().toLowerCase()).filter(Boolean)),
    ).slice(0, 20);
    if (providerIds.length === 0) return { states: [] };

    const sb = context.supabase as unknown as Sb;
    const direct = await sb
      .from("integrations")
      .select("provider,status,account_label,integration_type,granted_scopes,expires_at,last_error")
      .eq("user_id", context.userId)
      .in("provider", providerIds);
    if (direct.error) throw new Error(direct.error.message);

    const [{ supabaseAdmin }, nangoRows] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("./nango.server")
        .then((module) => module.listPersistedNangoConnections(context.userId))
        .catch(() => []),
    ]);
    const credentials = await supabaseAdmin
      .from("integration_credentials")
      .select("provider,refresh_token_ciphertext,expires_at")
      .eq("user_id", context.userId)
      .in("provider", providerIds);
    if (credentials.error) throw new Error(credentials.error.message);
    const directByProvider = new Map(
      (direct.data ?? []).map((row: any) => [String(row.provider).toLowerCase(), row]),
    );
    const nangoByProvider = new Map(
      nangoRows.map((row: any) => [String(row.providerId).toLowerCase(), row]),
    );
    const credentialsByProvider = new Map(
      (credentials.data ?? []).map((row: any) => [String(row.provider).toLowerCase(), row]),
    );

    let githubInstallationValid = false;
    if (providerIds.includes("github")) {
      githubInstallationValid = await import("./github-connected-service.server")
        .then((module) => module.getUserGitHubInstallationId(context.userId))
        .then((installationId) => installationId !== null)
        .catch(() => false);
    }

    const connectionStates = providerIds.map((provider) => {
      const directRow: any = directByProvider.get(provider);
      const nangoRow: any = nangoByProvider.get(provider);
      const credential: any = credentialsByProvider.get(provider);
      const definition = findProvider(provider);
      const directHealth =
        provider === "github"
          ? null
          : definition && directRow
            ? assessIntegrationHealth({
                providerName: definition.name,
                requiredScopes: definition.scopes,
                status: directRow.status,
                grantedScopes: Array.isArray(directRow.granted_scopes)
                  ? directRow.granted_scopes
                  : [],
                expiresAt: credential?.expires_at ?? directRow.expires_at ?? null,
                hasRefreshToken: Boolean(credential?.refresh_token_ciphertext),
                lastError: directRow.last_error ?? null,
              })
            : null;
      const directConnected =
        provider === "github"
          ? directRow?.status === "connected" && githubInstallationValid
          : directHealth?.healthy === true;
      const nangoConnected =
        nangoRow?.status === "connected" && Boolean(nangoRow?.config?.connection_id);

      if (directConnected) {
        return {
          provider,
          connected: true,
          transport:
            provider === "github"
              ? "github_app"
              : String(directRow.integration_type || "oauth"),
          accountLabel:
            typeof directRow.account_label === "string" ? directRow.account_label : null,
        };
      }
      if (nangoConnected) {
        return {
          provider,
          connected: true,
          transport: "nango",
          accountLabel:
            typeof nangoRow.account_label === "string" ? nangoRow.account_label : null,
        };
      }
      return { provider, connected: false, transport: null, accountLabel: null };
    });

    const runtime = await import("./agent-integration-runtime.server").catch(() => null);
    const states = await Promise.all(
      connectionStates.map(async (state) => {
        if (!state.connected) {
          return {
            ...state,
            capabilityState: "not_connected" as const,
            capabilityCount: 0,
            deployedCapabilityCount: 0,
            autonomousCapabilityCount: 0,
            approvalCapabilityCount: 0,
            lanes: [] as string[],
          };
        }
        if (!runtime) {
          return {
            ...state,
            capabilityState: "unavailable" as const,
            capabilityCount: 0,
            deployedCapabilityCount: 0,
            autonomousCapabilityCount: 0,
            approvalCapabilityCount: 0,
            lanes: [] as string[],
          };
        }
        try {
          const capabilities = await runtime.listIntegrationCapabilities(
            context.userId,
            state.provider,
          );
          return {
            ...state,
            capabilityState: "ok" as const,
            capabilityCount: capabilities.length,
            deployedCapabilityCount: capabilities.filter((item) => item.deployed).length,
            autonomousCapabilityCount: capabilities.filter((item) => !item.requiresApproval).length,
            approvalCapabilityCount: capabilities.filter((item) => item.requiresApproval).length,
            lanes: Array.from(new Set(capabilities.map((item) => item.lane))),
          };
        } catch {
          return {
            ...state,
            capabilityState: "unavailable" as const,
            capabilityCount: 0,
            deployedCapabilityCount: 0,
            autonomousCapabilityCount: 0,
            approvalCapabilityCount: 0,
            lanes: [] as string[],
          };
        }
      }),
    );

    return { states };
  });

export const testIntegrationConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.pick({ provider: true }).parse(input))
  .handler(async ({ data, context }) => {
    const providerId = data.provider.trim().toLowerCase();
    const checkedAt = new Date().toISOString();

    if (providerId === "shopify") {
      const { executeNativeShopifyAction } = await import("./shopify.server");
      const result = await executeNativeShopifyAction({ userId: context.userId, action: "shop_overview", actionInput: {}, signal: AbortSignal.timeout(12_000) });
      if (!result.ok) throw new Error(result.error ?? "Shopify did not respond successfully.");
      return { ok: true, checkedAt, message: "Shopify store responded successfully through the native API." };
    }

    if (providerId === "meta") {
      const { discoverMetaAssets } = await import("./meta-social.server");
      const assets = await discoverMetaAssets(context.userId, AbortSignal.timeout(12_000));
      const instagramCount = assets.filter((asset) => asset.instagramAccount).length;
      return { ok: true, checkedAt, message: `Meta connection is valid. ${assets.length} Facebook Page${assets.length === 1 ? "" : "s"} and ${instagramCount} linked Instagram professional account${instagramCount === 1 ? "" : "s"} are available.` };
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
      const response = await fetch(provider.identity.url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
      if (!response.ok) throw new Error(`LinkedIn returned ${response.status}. Reconnect the account and try again.`);
      const profile = await response.json() as Record<string, unknown>;
      const name = typeof profile["name"] === "string" ? profile["name"].slice(0, 120) : "";
      return { ok: true, checkedAt, message: name ? `LinkedIn member connection is valid for ${name}. Native posting remains disabled until an approved author URN is available.` : "LinkedIn member connection is valid. Native posting remains disabled until an approved author URN is available." };
    }

    if (providerId === "pinterest") {
      const { discoverPinterestAccount, discoverPinterestBoards } = await import("./pinterest-social.server");
      const [account, boards] = await Promise.all([
        discoverPinterestAccount(context.userId, AbortSignal.timeout(12_000)),
        discoverPinterestBoards(context.userId, AbortSignal.timeout(12_000)),
      ]);
      return {
        ok: true,
        checkedAt,
        message: `Pinterest connection is valid${account.username ? ` for @${account.username}` : ""}. ${boards.length} board${boards.length === 1 ? "" : "s"} discovered for native publishing.`,
      };
    }

    if (providerId === "tiktok") {
      const { getIntegrationAccessToken } = await import("./oauth.server");
      const token = await getIntegrationAccessToken(context.userId, providerId);
      if (!token) throw new Error("TikTok is not connected, has expired, or needs to be reconnected.");
      const url = new URL("https://open.tiktokapis.com/v2/user/info/");
      url.searchParams.set("fields", "open_id,union_id,avatar_url,display_name");
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      const payload = await response.json() as Record<string, any>;
      if (!response.ok || (payload["error"]?.code && payload["error"].code !== "ok")) {
        const message = typeof payload["error"]?.message === "string" ? payload["error"].message.slice(0, 300) : `TikTok returned ${response.status}.`;
        throw new Error(message);
      }
      const user = payload["data"]?.user && typeof payload["data"].user === "object" ? payload["data"].user as Record<string, unknown> : {};
      const displayName = typeof user["display_name"] === "string" ? user["display_name"].trim().slice(0, 120) : "";
      return {
        ok: true,
        checkedAt,
        message: displayName
          ? `TikTok connection is valid for ${displayName}. Direct Post remains governed by TikTok creator-info/privacy requirements and Blackstar approval.`
          : "TikTok connection is valid. Direct Post remains governed by TikTok creator-info/privacy requirements and Blackstar approval.",
      };
    }

    if (providerId === "discord") {
      const provider = findProvider(providerId);
      if (!provider?.identity?.url) throw new Error("Discord identity test is unavailable.");
      const { getIntegrationAccessToken } = await import("./oauth.server");
      const token = await getIntegrationAccessToken(context.userId, providerId);
      if (!token) throw new Error("Discord is not connected, has expired, or needs to be reconnected.");
      const response = await fetch(provider.identity.url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
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

export const startIntegrationOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startInput.parse(input))
  .handler(async ({ data, context }) => {
    const provider = findProvider(data.provider);
    if (!provider) throw new Error("Unknown integration provider.");

    const { providerConfigured, createState, buildAuthorizeUrl, safeOrigin } = await import("./oauth.server");
    if (!providerConfigured(provider)) throw new Error(`${provider.name} is not available yet: the workspace owner needs to add its OAuth client credentials.`);

    const origin = safeOrigin(data.origin);
    if (provider.connectMode === "shopify_store") return { authorizeUrl: `${origin}/shopify-connect` };

    const sb = context.supabase as unknown as Sb;
    await sb.from("integrations").upsert({
      user_id: context.userId,
      org_id: null,
      provider: provider.id,
      name: provider.name,
      integration_type: "oauth",
      status: "pending",
      scopes: provider.scopes,
      last_error: null,
    }, { onConflict: "user_id,provider" });

    return { authorizeUrl: buildAuthorizeUrl(provider, { origin, state: createState({ userId: context.userId, provider: provider.id, origin }) }) };
  });

export const disconnectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { error } = await sb.from("integrations").update({
      status: "disconnected",
      connected_at: null,
      expires_at: null,
      account_label: null,
      granted_scopes: [],
      last_error: null,
    }).eq("user_id", context.userId).eq("provider", data.provider);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("integration_credentials").delete().eq("user_id", context.userId).eq("provider", data.provider);
    return { ok: true };
  });
