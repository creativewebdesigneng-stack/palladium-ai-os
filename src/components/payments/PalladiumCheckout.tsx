import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  /** Internal plan code (explorer | builder | business | enterprise, or legacy free/pro). */
  planCode: string;
  interval?: "monthly" | "yearly";
  orgId?: string;
  returnUrl?: string;
}

export default function PalladiumCheckout({
  planCode,
  interval = "monthly",
  orgId,
  returnUrl,
}: Props) {
  // Checkout requires a signed-in session — the server function is auth-gated,
  // so mounting it without a bearer token throws "No authorization header".
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeEnvironment, setStripeEnvironment] = useState<"sandbox" | "live" | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof getStripe> | null>(null);
  const [stripeConfigError, setStripeConfigError] = useState<string | null>(null);
  const [stripeConfigChecked, setStripeConfigChecked] = useState(false);

  useEffect(() => {
    try {
      const environment = getStripeEnvironment();
      setStripeEnvironment(environment);
      setStripePromise(getStripe());
    } catch (e) {
      setStripeConfigError(e instanceof Error ? e.message : "Stripe checkout is not configured for this deployment.");
    } finally {
      setStripeConfigChecked(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthed(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (active) setAuthed(!!session);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const fetchClientSecret = async (): Promise<string> => {
    try {
      const result = await createCheckoutSession({
        data: {
          planCode,
          interval,
          ...(orgId ? { orgId } : {}),
          returnUrl:
            returnUrl ||
            `${window.location.origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          environment: stripeEnvironment ?? getStripeEnvironment(),
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error("Checkout did not return a client secret");
      return result.clientSecret;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start checkout";
      setError(message);
      throw e;
    }
  };

  if (authed === null) {
    return <p className="p-4 text-xs text-zinc-500">Preparing secure checkout…</p>;
  }

  if (!authed) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/[.07] p-4 text-sm text-amber-200">
        Sign in to continue to secure checkout.{" "}
        <a
          href={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
          className="font-semibold underline"
        >
          Sign in
        </a>
      </div>
    );
  }

  if (!stripeConfigChecked) {
    return <p role="status" className="p-4 text-xs text-zinc-500">Checking secure checkout configuration…</p>;
  }

  if (stripeConfigError || !stripePromise) {
    return (
      <div role="status" className="rounded-2xl border border-amber-400/20 bg-amber-500/[.07] p-4 text-sm text-amber-100">
        <p className="font-semibold">Secure checkout is not configured yet.</p>
        <p className="mt-1 text-xs leading-5 text-amber-100/75">{stripeConfigError || "The Stripe client could not be initialised."}</p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">An administrator must configure the Stripe publishable key, matching server-side test credentials, webhook secret and plan prices before checkout can be tested. Live payments must only be enabled after explicit owner approval and a successful test-mode acceptance run.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[.08] p-4 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div
      id="checkout"
      className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.02] p-2"
    >
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
