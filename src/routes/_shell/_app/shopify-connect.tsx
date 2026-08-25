import { FormEvent, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Loader2, ShieldCheck, Store } from "lucide-react";
import { startShopifyOAuth } from "@/lib/integrations/shopify.functions";

export const Route = createFileRoute("/_shell/_app/shopify-connect")({
  head: () => ({
    meta: [
      { title: "Connect Shopify — PalladiumAI" },
      { name: "description", content: "Connect a Shopify store directly to PalladiumAI using Shopify OAuth." },
    ],
  }),
  component: ShopifyConnectScreen,
});

function ShopifyConnectScreen() {
  const [shop, setShop] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await startShopifyOAuth({
        data: { shop, origin: window.location.origin },
      });
      window.location.assign(result.authorizeUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Shopify authorization.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/Integrations"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Integrations
      </Link>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-2xl backdrop-blur-xl">
        <div className="border-b border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 p-6 sm:p-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10">
            <Store className="h-6 w-6 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Connect Shopify directly</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            PalladiumAI will connect to your store through Shopify's native Admin API. Nango and other connector providers remain optional fallbacks; your agent is not locked to them.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5 p-6 sm:p-8">
          <div>
            <label htmlFor="shopify-store" className="text-sm font-medium text-zinc-200">Shopify store domain</label>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Enter the permanent <span className="font-mono text-zinc-400">myshopify.com</span> address, not your customer-facing custom domain.
            </p>
            <div className="mt-3 flex rounded-2xl border border-white/10 bg-white/[0.03] focus-within:border-emerald-400/40">
              <input
                id="shopify-store"
                value={shop}
                onChange={(event) => setShop(event.target.value)}
                placeholder="mystore.myshopify.com"
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.04] p-4">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <div className="text-xs leading-5 text-zinc-400">
                <p className="font-medium text-zinc-200">Your Shopify password is never shared with PalladiumAI.</p>
                <p className="mt-1">Shopify handles sign-in and consent. The returned access token is encrypted server-side. Safe reads can run autonomously; product or inventory changes remain approval-gated according to your agent policy.</p>
              </div>
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !shop.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            {busy ? "Opening Shopify…" : "Continue to Shopify"}
          </button>
        </form>
      </section>
    </main>
  );
}
