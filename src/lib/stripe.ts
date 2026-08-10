import { loadStripe, type Stripe } from '@stripe/stripe-js';

type StripeEnv = 'sandbox' | 'live';

const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'] as string | undefined;

function paymentsEnvironment(): StripeEnv {
  if (clientToken?.startsWith('pk_test_')) return 'sandbox';
  if (clientToken?.startsWith('pk_live_')) return 'live';
  throw new Error(
    'Payments are not configured for this build. Complete payments go-live in your Lovable project to enable production checkout.',
  );
}

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    paymentsEnvironment();
    stripePromise = loadStripe(clientToken as string);
  }
  return stripePromise;
}

export function getStripeEnvironment(): StripeEnv {
  return paymentsEnvironment();
}

// Plan code -> price ids (human-readable lookup keys created in the payments catalog).
export const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  pro: { monthly: 'pro_monthly', yearly: 'pro_yearly' },
  business: { monthly: 'business_monthly', yearly: 'business_yearly' },
  enterprise: { monthly: 'enterprise_monthly', yearly: 'enterprise_yearly' },
};

export function priceIdFor(planCode: string, cycle: 'monthly' | 'yearly' = 'monthly'): string | null {
  const entry = PLAN_PRICES[planCode?.toLowerCase?.()];
  return entry ? entry[cycle] : null;
}
