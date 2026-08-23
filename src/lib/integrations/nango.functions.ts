import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getNangoGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { nangoConfigured, getOwnedNangoGitHubConnection, NANGO_GITHUB_INTEGRATION } =
      await import("./nango.server");
    if (!nangoConfigured())
      return { configured: false, connected: false, integrationId: NANGO_GITHUB_INTEGRATION };
    const connection = await getOwnedNangoGitHubConnection(context.userId);
    const persisted = connection?.persisted;
    return {
      configured: true,
      connected: Boolean(connection) && persisted?.status !== "error",
      reconnectRequired: persisted?.status === "error",
      integrationId: NANGO_GITHUB_INTEGRATION,
      connectionId: connection?.connection_id || connection?.id || null,
      accountLabel:
        persisted?.account_label ||
        connection?.metadata?.display_name ||
        connection?.connection_config?.username ||
        null,
      createdAt: persisted?.connected_at || connection?.created_at || null,
      lastError: persisted?.last_error || null,
    };
  });

export const startNangoGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { createNangoGitHubConnectSession } = await import("./nango.server");
    const email = typeof context.claims?.email === "string" ? context.claims.email : null;
    return createNangoGitHubConnectSession({ id: context.userId, email });
  });

export const testNangoGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { testOwnedNangoGitHubConnection } = await import("./nango.server");
    const result = await testOwnedNangoGitHubConnection(context.userId);
    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      message: result.login
        ? `Nango reached GitHub successfully as ${result.login}.`
        : "Nango reached GitHub successfully.",
    };
  });

export const disconnectNangoGitHubConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disconnectOwnedNangoGitHubConnection } = await import("./nango.server");
    return disconnectOwnedNangoGitHubConnection(context.userId);
  });
