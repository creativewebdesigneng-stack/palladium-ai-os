import { useEffect, useState } from 'react';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { createCheckoutSession } from '@/utils/payments.functions';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  priceId: string;
  orgId?: string;
  returnUrl?: string;
}

export default function PalladiumCheckout({ priceId, orgId, returnUrl }: Props) {
  // Checkout requires a signed-in session — the server function is auth-gated,
  // so mounting it without a bearer token throws "No authorization header".
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          priceId,
          ...(orgId ? { orgId } : {}),
          returnUrl:
            returnUrl ||
            `${window.location.origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          environment: getStripeEnvironment(),
        },
      });
      if ('error' in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error('Checkout did not return a client secret');
      return result.clientSecret;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start checkout';
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
        Sign in to continue to secure checkout.{' '}
        <a href={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`} className="font-semibold underline">
          Sign in
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[.08] p-4 text-sm text-rose-200">{error}</div>
    );
  }

  return (
    <div id="checkout" className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.02] p-2">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
