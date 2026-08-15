/**
 * OAuth callback for third-party integrations.
 *
 * Public by necessity — providers redirect the browser here — so it trusts
 * nothing but the HMAC-signed `state` it issued itself. The authorisation code
 * is exchanged server-side and the resulting tokens are encrypted before they
 * are stored. No token ever reaches the browser.
 */
import { createFileRoute } from "@tanstack/react-router";

function done(origin: string, params: Record<string, string>) {
  const url = new URL(`${origin}/Integrations`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

export const Route = createFileRoute("/api/public/integrations/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const state = url.searchParams.get("state") ?? "";
        const code = url.searchParams.get("code") ?? "";
        const providerError = url.searchParams.get("error");

        const { verifyState, exchangeCode, encryptToken, fetchAccountLabel, providerConfigured } =
          await import("@/lib/integrations/oauth.server");
        const { findProvider } = await import("@/lib/integrations/providers");

        const verified = verifyState(state);
        if (!verified)
          return new Response("Invalid or expired authorization state.", { status: 400 });

        const provider = findProvider(verified.provider);
        const origin = verified.origin || url.origin;
        if (!provider || !providerConfigured(provider)) {
          return done(origin, { integration_error: "Provider is not available." });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const fail = async (message: string) => {
          await supabaseAdmin
            .from("integrations")
            .update({ status: "error", last_error: message.slice(0, 300) })
            .eq("user_id", verified.userId)
            .eq("provider", provider.id);
          return done(origin, { integration_error: message.slice(0, 200), provider: provider.id });
        };

        if (providerError) return fail(`${provider.name} authorisation was declined.`);
        if (!code) return fail("Authorisation code missing from the provider response.");

        try {
          const tokens = await exchangeCode(provider, { code, origin });
          const label = await fetchAccountLabel(provider, tokens.accessToken);

          const { data: connection, error } = await supabaseAdmin
            .from("integrations")
            .upsert(
              {
                user_id: verified.userId,
                provider: provider.id,
                name: provider.name,
                integration_type: "oauth",
                status: "connected",
                scopes: provider.scopes,
                granted_scopes: tokens.scopes,
                account_label: label,
                config: tokens.providerConfig,
                last_error: null,
                connected_at: new Date().toISOString(),
                expires_at: tokens.expiresAt,
              },
              { onConflict: "user_id,provider" },
            )
            .select("id")
            .single();
          if (error) throw new Error(error.message);

          const { error: credError } = await supabaseAdmin.from("integration_credentials").upsert(
            {
              integration_id: connection.id,
              user_id: verified.userId,
              provider: provider.id,
              access_token_ciphertext: encryptToken(tokens.accessToken),
              refresh_token_ciphertext: tokens.refreshToken
                ? encryptToken(tokens.refreshToken)
                : null,
              token_type: tokens.tokenType,
              scopes: tokens.scopes,
              expires_at: tokens.expiresAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,provider" },
          );
          if (credError) throw new Error(credError.message);

          return done(origin, { integration_connected: provider.id });
        } catch (error) {
          return fail(
            error instanceof Error ? error.message : "Could not complete the connection.",
          );
        }
      },
    },
  },
});
