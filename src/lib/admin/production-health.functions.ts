import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformAdmin } from "@/lib/marketplace/marketplace.server";
import { probeBrowserProvider } from "@/lib/mission/browser-agent";
import { getServerStripeEnvironment } from "@/lib/stripe.server";

type Sb = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

const present = (name: string) => Boolean(process.env[name]?.trim());

/**
 * Admin-only, non-sensitive launch readiness snapshot.
 *
 * This endpoint deliberately returns booleans and mode labels only. Secret
 * values, provider tokens and URLs are never returned to the browser.
 */
export const getProductionCapabilities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as unknown as Sb;
    if (!(await isPlatformAdmin(sb, context.userId))) return { forbidden: true as const };

    const playwrightConfigured = present("PLAYWRIGHT_BROWSER_ENDPOINT");
    const playwrightProbe = playwrightConfigured
      ? await probeBrowserProvider("playwright")
      : { ok: false, error: "Not configured" };

    let paymentsMode: "sandbox" | "live" | "invalid" = "invalid";
    try {
      paymentsMode = getServerStripeEnvironment();
    } catch {
      paymentsMode = "invalid";
    }

    const stripeSandboxConfigured =
      present("STRIPE_SANDBOX_API_KEY") && present("PAYMENTS_SANDBOX_WEBHOOK_SECRET");
    const stripeLiveConfigured =
      present("STRIPE_LIVE_API_KEY") && present("PAYMENTS_LIVE_WEBHOOK_SECRET");

    return {
      forbidden: false as const,
      checkedAt: new Date().toISOString(),
      capabilities: {
        googleShopping: {
          configured: present("SERPAPI_API_KEY"),
          label: "Google Shopping",
        },
        googleRoutes: {
          configured: present("GOOGLE_MAPS_API_KEY"),
          label: "Google Routes",
        },
        playwright: {
          configured: playwrightConfigured,
          healthy: playwrightProbe.ok,
          label: "Playwright browser",
        },
        stripeSandbox: {
          configured: stripeSandboxConfigured,
          active: paymentsMode === "sandbox",
          label: "Stripe sandbox",
        },
        stripeLive: {
          configured: stripeLiveConfigured,
          active: paymentsMode === "live",
          label: "Stripe live",
        },
        ai: {
          label: "AI providers",
          lovable: present("LOVABLE_API_KEY"),
          groq: present("GROQ_API_KEY"),
          openai: present("OPENAI_API_KEY"),
          anthropic: present("ANTHROPIC_API_KEY"),
        },
      },
    };
  });
