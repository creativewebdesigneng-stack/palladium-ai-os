import { createFileRoute } from "@tanstack/react-router";

function done(origin: string, params: Record<string, string>) {
  const url = new URL(`${origin}/Integrations`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return new Response(null, { status: 302, headers: { Location: url.toString() } });
}

export const Route = createFileRoute("/api/public/integrations/shopify-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const state = url.searchParams.get("state") ?? "";
        const code = url.searchParams.get("code") ?? "";
        const shopParam = url.searchParams.get("shop") ?? "";

        const [{ verifyState, encryptToken }, shopify, { supabaseAdmin }] = await Promise.all([
          import("@/lib/integrations/oauth.server"),
          import("@/lib/integrations/shopify.server"),
          import("@/integrations/supabase/client.server"),
        ]);

        const verified = verifyState(state);
        if (!verified || !verified.provider.startsWith("shopify:"))
          return new Response("Invalid or expired authorization state.", { status: 400 });

        const origin = verified.origin || url.origin;
        const boundShop = shopify.normalizeShopifyDomain(verified.provider.slice("shopify:".length));
        const callbackShop = shopify.normalizeShopifyDomain(shopParam);
        if (!boundShop || !callbackShop || boundShop !== callbackShop)
          return done(origin, { integration_error: "Shopify store verification failed.", provider: "shopify" });

        const fail = async (message: string) => {
          await supabaseAdmin
            .from("integrations")
            .update({ status: "error", last_error: message.slice(0, 300) })
            .eq("user_id", verified.userId)
            .eq("provider", "shopify");
          return done(origin, { integration_error: message.slice(0, 200), provider: "shopify" });
        };

        if (!shopify.verifyShopifyCallbackHmac(url.searchParams))
          return fail("Shopify callback signature verification failed.");
        if (!code) return fail("Shopify authorization code is missing.");

        try {
          const tokens = await shopify.exchangeShopifyCode({ shop: callbackShop, code });
          const { data: connection, error } = await supabaseAdmin
            .from("integrations")
            .upsert(
              {
                user_id: verified.userId,
                provider: "shopify",
                name: "Shopify",
                integration_type: "oauth_native",
                status: "connected",
                scopes: [...shopify.SHOPIFY_SCOPES],
                granted_scopes: tokens.scopes,
                account_label: callbackShop,
                config: { shop_domain: callbackShop, api_version: shopify.SHOPIFY_API_VERSION },
                last_error: null,
                connected_at: new Date().toISOString(),
                expires_at: null,
              },
              { onConflict: "user_id,provider" },
            )
            .select("id")
            .single();
          if (error) throw new Error(error.message);

          const { error: credentialError } = await supabaseAdmin
            .from("integration_credentials")
            .upsert(
              {
                integration_id: connection.id,
                user_id: verified.userId,
                provider: "shopify",
                access_token_ciphertext: encryptToken(tokens.accessToken),
                refresh_token_ciphertext: null,
                token_type: "Shopify",
                scopes: tokens.scopes,
                expires_at: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,provider" },
            );
          if (credentialError) throw new Error(credentialError.message);

          return done(origin, { integration_connected: "shopify" });
        } catch (error) {
          return fail(error instanceof Error ? error.message : "Could not connect Shopify.");
        }
      },
    },
  },
});
