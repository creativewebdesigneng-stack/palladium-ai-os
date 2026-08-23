import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NANGO_PROVIDERS } from "./nango-providers";

const providerIds = NANGO_PROVIDERS.map((provider) => provider.id);
const providerInput = z.object({
  provider: z
    .string()
    .trim()
    .refine((id) => providerIds.includes(id as any), "Unsupported Nango provider."),
});

export const listNangoConnections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const server = await import("./nango.server");
    return Promise.all(
      NANGO_PROVIDERS.map(async (provider) => {
        const configured = server.nangoProviderConfigured(provider.id);
        let connection: any = null;
        let loadError: string | null = null;
        if (configured) {
          try {
            connection = await server.getOwnedNangoConnection(context.userId, provider.id);
          } catch (error) {
            loadError = (error as Error).message;
          }
        }
        const persisted = connection?.persisted;
        return {
          id: provider.id,
          name: provider.name,
          category: provider.category,
          configured,
          connected: Boolean(connection) && persisted?.status !== "error",
          reconnectRequired: persisted?.status === "error",
          connectionId: connection?.connection_id || connection?.id || null,
          accountLabel:
            persisted?.account_label ||
            connection?.metadata?.display_name ||
            connection?.connection_config?.username ||
            null,
          createdAt: persisted?.connected_at || connection?.created_at || null,
          lastError: persisted?.last_error || loadError,
        };
      }),
    );
  });

export const startNangoConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { createNangoConnectSession } = await import("./nango.server");
    const email = typeof context.claims?.email === "string" ? context.claims.email : null;
    return createNangoConnectSession({ id: context.userId, email }, data.provider as any);
  });

export const testNangoConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { testOwnedNangoConnection } = await import("./nango.server");
    const result = await testOwnedNangoConnection(context.userId, data.provider as any);
    const definition = NANGO_PROVIDERS.find((provider) => provider.id === data.provider)!;
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: result.label
        ? `Nango reached ${definition.name} successfully as ${result.label}.`
        : `Nango reached ${definition.name} successfully.`,
    };
  });

export const disconnectNangoConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => providerInput.parse(input))
  .handler(async ({ data, context }) => {
    const { disconnectOwnedNangoConnection } = await import("./nango.server");
    return disconnectOwnedNangoConnection(context.userId, data.provider as any);
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
