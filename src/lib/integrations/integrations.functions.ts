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

type Sb = { from: (t: string) => any };

const providerInput = z.object({
  provider: z.string().trim().min(2).max(60),
  name: z.string().trim().max(80).optional(),
});

const startInput = z.object({
  provider: z.string().trim().min(2).max(60),
  origin: z.string().trim().url().max(300).optional(),
});

/** Provider catalogue plus this user's connection state. */
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

    const { providerConfigured } = await import("./oauth.server");
    const catalogue = INTEGRATION_PROVIDERS.map((provider) => ({
      id: provider.id,
      name: provider.name,
      category: provider.category,
      summary: provider.summary,
      scopes: provider.scopes,
      tools: provider.tools,
      docsUrl: provider.docsUrl,
      configured: providerConfigured(provider),
      connection: (rows ?? []).find((r: any) => r.provider === provider.id) ?? null,
    }));

    return { integrations: rows ?? [], catalogue };
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
