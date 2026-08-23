import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { findNangoProvider, isSafeNangoProviderId, NANGO_PROVIDERS } from "./nango-providers";

const providerInput = z.object({
  provider: z.string().trim().refine(isSafeNangoProviderId, "Unsupported Nango provider."),
});

export const listNangoConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const server = await import("./nango.server");
    let providers: Awaited<ReturnType<typeof server.listNangoProviderCatalogue>>;
    try {
      providers = await server.listNangoProviderCatalogue();
    } catch {
      providers = NANGO_PROVIDERS.map((provider) => ({
        id: provider.id,
        name: provider.name,
        categories: [provider.category],
        category: provider.category,
        authMode: "OAUTH2",
        logoUrl: null,
        docsUrl: "https://nango.dev/docs/guides/auth/auth-guide",
        curated: true,
      }));
    }
    const persisted = await server.listPersistedNangoConnections(context.userId);
    const capabilities = await import("./nango-capabilities.server")
      .then((module) => module.listNangoAgentCapabilities(context.userId))
      .catch(() => []);
    const capabilitiesByProvider = new Map<string, typeof capabilities>();
    for (const capability of capabilities) {
      const current = capabilitiesByProvider.get(capability.provider) ?? [];
      current.push(capability);
      capabilitiesByProvider.set(capability.provider, current);
    }
    const byProvider = new Map(persisted.map((connection) => [connection.providerId, connection]));
    return providers.map((provider) => {
      const connection = byProvider.get(provider.id);
      const providerCapabilities = capabilitiesByProvider.get(provider.id) ?? [];
      return {
        ...provider,
        configured: server.nangoConfigured(),
        connected: Boolean(connection) && connection?.status !== "error",
        reconnectRequired: connection?.status === "error",
        connectionId: connection?.config?.connection_id || null,
        accountLabel: connection?.account_label || null,
        createdAt: connection?.connected_at || null,
        lastError: connection?.last_error || null,
        agentReady: Boolean(findNangoProvider(provider.id)) || providerCapabilities.length > 0,
        capabilityCount: providerCapabilities.length,
        autonomousActionCount: providerCapabilities.filter((action) => !action.requiresApproval)
          .length,
        approvalActionCount: providerCapabilities.filter((action) => action.requiresApproval).length,
        capabilityError:
          connection && providerCapabilities.length === 0
            ? "No Nango action templates are available for this provider yet."
            : null,
      };
    });
  });

export const startNangoConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { createNangoConnectSession } = await import("./nango.server");
    const email = typeof context.claims?.email === "string" ? context.claims.email : null;
    return createNangoConnectSession({ id: context.userId, email }, data.provider);
  });

export const testNangoConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { testOwnedNangoConnection } = await import("./nango.server");
    const result = await testOwnedNangoConnection(context.userId, data.provider);
    const definition = NANGO_PROVIDERS.find((provider) => provider.id === data.provider);
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: result.label
        ? `Nango reached ${definition?.name || data.provider} successfully as ${result.label}.`
        : `Nango reached ${definition?.name || data.provider} successfully.`,
    };
  });

export const disconnectNangoConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { disconnectOwnedNangoConnection } = await import("./nango.server");
    return disconnectOwnedNangoConnection(context.userId, data.provider);
  });

// Compatibility aliases for the original GitHub pilot.
export const getNangoGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const server = await import("./nango.server");
    if (!server.nangoProviderConfigured("github"))
      return {
        configured: false,
        connected: false,
        integrationId: server.NANGO_GITHUB_INTEGRATION,
      };
    const connection = await server.getOwnedNangoConnection(context.userId, "github");
    const persisted = connection?.persisted;
    return {
      configured: true,
      connected: Boolean(connection) && persisted?.status !== "error",
      reconnectRequired: persisted?.status === "error",
      integrationId: server.NANGO_GITHUB_INTEGRATION,
      connectionId: connection?.connection_id || connection?.id || null,
      accountLabel: persisted?.account_label || null,
      createdAt: persisted?.connected_at || null,
      lastError: persisted?.last_error || null,
    };
  });
export const startNangoGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { createNangoConnectSession } = await import("./nango.server");
    return createNangoConnectSession(
      {
        id: context.userId,
        email: typeof context.claims?.email === "string" ? context.claims.email : null,
      },
      "github",
    );
  });
export const testNangoGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { testOwnedNangoConnection } = await import("./nango.server");
    const result = await testOwnedNangoConnection(context.userId, "github");
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: result.label
        ? `Nango reached GitHub successfully as ${result.label}.`
        : "Nango reached GitHub successfully.",
    };
  });
export const disconnectNangoGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disconnectOwnedNangoConnection } = await import("./nango.server");
    return disconnectOwnedNangoConnection(context.userId, "github");
  });
