import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function FoundingPilotPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const startCheckout = async () => {
    setBusy(true); setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setMessage("Please sign in or create an account before starting checkout."); return; }
      const response = await fetch("/api/launch/checkout", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error ?? "Checkout could not be started.");
      window.location.assign(result.url);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Checkout could not be started."); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto flex min-h-[75vh] max-w-3xl items-center px-6 py-16">
    <section className="w-full rounded-3xl border border-violet-300/15 bg-zinc-950/80 p-8 shadow-2xl md:p-12">
      <p className="text-xs font-semibold uppercase tracking-[.25em] text-violet-300">Invite-only · Founding Pilot</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Build with Blackstar.</h1>
      <p className="mt-4 max-w-2xl text-zinc-300">Join the first group of paying pilot customers. Your account receives access only to launch-approved features, with additional beta capabilities enabled individually.</p>
      <ul className="mt-7 space-y-2 text-sm text-zinc-300"><li>• One-off setup fee plus monthly subscription</li><li>• Secure Stripe Checkout</li><li>• Manage or cancel your subscription through the billing portal</li></ul>
      <button disabled={busy} onClick={startCheckout} className="mt-9 rounded-xl bg-violet-500 px-6 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:opacity-50">{busy ? "Opening secure checkout…" : "Become a founding pilot"}</button>
      {message && <p role="alert" className="mt-4 text-sm text-amber-300">{message}</p>}
      {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "success" && <p className="mt-4 text-sm text-emerald-300">Payment received. Your access will activate once Stripe confirms the subscription.</p>}
      {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "cancelled" && <p className="mt-4 text-sm text-zinc-400">Checkout was cancelled. No subscription was created.</p>}
    </section>
  </main>;
}
export const Route = createFileRoute("/founding-pilot")({ component: FoundingPilotPage });
