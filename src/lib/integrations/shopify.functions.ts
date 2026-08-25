import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildShopifyAuthorizeUrl, normalizeShopifyDomain, SHOPIFY_SCOPES, shopifyConfigured } from "./shopify.server";

const input = z.object({
  shop: z.string().trim().min(1).max(180),
  origin: z.string().trim().url().max(300).optional(),
});

export const startShopifyOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => input.parse(value))
  .handler(async ({ data, context }) => {
    const shop = normalizeShopifyDomain(data.shop);
    if (!shop) throw new Error("Enter a valid Shopify store, for example mystore.myshopify.com.");
    if (!shopifyConfigured())
      throw new Error("Shopify is not available yet: the workspace owner needs to add SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET.");

    const { createState, safeOrigin } = await import("./oauth.server");
    const origin = safeOrigin(data.origin);
    const callbackPath = "/api/public/integrations/shopify-callback";
    const state = createState({
      userId: context.userId,
      provider: `shopify:${shop}`,
      origin,
    });

    const sb = context.supabase as any;
    const { error } = await sb.from("integrations").upsert(
      {
        user_id: context.userId,
        org_id: null,
        provider: "shopify",
        name: "Shopify",
        integration_type: "oauth_native",
        status: "pending",
        scopes: [...SHOPIFY_SCOPES],
        account_label: shop,
        config: { shop_domain: shop },
        last_error: null,
      },
      { onConflict: "user_id,provider" },
    );
    if (error) throw new Error(error.message);

    return {
      shop,
      authorizeUrl: buildShopifyAuthorizeUrl({
        shop,
        state,
        redirectUri: `${origin}${callbackPath}`,
      }),
    };
  });
