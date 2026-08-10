import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { getStripe, getStripeEnvironment } from '@/lib/stripe';
import { createCheckoutSession } from '@/utils/payments.functions';

interface Props {
  priceId: string;
  orgId?: string;
  returnUrl?: string;
}

export default function PalladiumCheckout({ priceId, orgId, returnUrl }: Props) {
  const fetchClientSecret = async (): Promise<string> => {
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
  };

  return (
    <div id="checkout" className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.02] p-2">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
