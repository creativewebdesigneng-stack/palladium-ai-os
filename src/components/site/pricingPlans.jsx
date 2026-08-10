// Canonical PalladiumAI pricing — single source of truth for plan names,
// prices, features and limits. Four plans: Free (Explorer), Pro (Builder),
// Business, and Enterprise. Same shape so it can later be served from a
// backend entity or Stripe Products/Prices.
//
// `FREEMIUM_PLANS` holds the entry tiers (Free + Pro); `PLANS` holds the
// business/enterprise tiers. The billing plan grid merges both arrays.

export const CURRENCY = '£';

export const PLANS = [
  {
    id: 'business',
    name: 'Business',
    description: 'Complete AI workforce infrastructure for teams running real automation.',
    monthly: 1500,
    yearly: 15300,
    currency: '£',
    features: [
      'Everything in Pro',
      'Unlimited agent creation',
      'Team workspace',
      'Advanced workflows',
      'API access',
      'Advanced memory',
      'Private marketplace',
    ],
    cta: 'Get Started',
    ctaTo: '/payment?plan=business',
    highlight: false,
    popular: false,
    grad: 'from-emerald-500 to-teal-500',
    limits: { projects: 'Unlimited', agents: '50', aiUsage: '50,000 runs/mo', storage: '100GB', members: 'Multiple', integrations: 'Custom', automation: 'Advanced', support: 'Priority' },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Enterprise-grade AI workforce with advanced security and priority infrastructure.',
    monthly: 3000,
    yearly: 30600,
    currency: '£',
    features: [
      'Everything in Business',
      'Enterprise AI workforce',
      'Unlimited teams',
      'Advanced security',
      'Custom integrations',
      'Priority infrastructure',
    ],
    cta: 'Get Started',
    ctaTo: '/payment?plan=enterprise',
    highlight: false,
    popular: false,
    grad: 'from-fuchsia-500 to-purple-500',
    limits: { projects: 'Unlimited', agents: '200+', aiUsage: '250,000+ runs/mo', storage: '500GB+', members: 'Unlimited', integrations: 'Custom', automation: 'Unlimited', support: 'Dedicated' },
  },
];

export async function loadPlans() {
  // Placeholder — swap for a backend / Stripe fetch when pricing is served dynamically.
  return [...FREEMIUM_PLANS, ...PLANS];
}

// Entry tiers. `limits` uses the same keys as the premium plans so the billing
// plan grid can render them uniformly.
export const FREEMIUM_PLANS = [
  {
    id: 'free',
    name: 'Free',
    subtitle: 'Explorer',
    description: 'Explore the PalladiumAI marketplace and discover AI agents.',
    tagline: 'Explore the AI workforce marketplace',
    monthly: 0,
    yearly: 0,
    currency: '£',
    cta: 'Get Started',
    ctaTo: '/register?returnTo=/dashboard',
    grad: 'from-zinc-400 to-zinc-600',
    features: [
      'Account creation',
      'Browse the marketplace',
      'View AI agents',
      'View upcoming AI agents',
      'View public workflows',
      'View community content',
    ],
    notIncluded: [
      'Create AI agents',
      'Deploy agents',
      'Advanced workflows',
      'Advanced memory',
    ],
    limits: { projects: '—', agents: 'Browse only', aiUsage: '—', storage: '1GB', members: '1', integrations: '—', automation: '—', support: 'Community' },
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'Builder',
    description: 'Build and deploy your own AI agents.',
    tagline: 'Build and deploy your own AI agents',
    monthly: 20,
    yearly: 204,
    currency: '£',
    cta: 'Upgrade to Pro',
    ctaTo: '/payment?plan=pro',
    highlight: true,
    popular: true,
    grad: 'from-violet-500 to-indigo-500',
    features: [
      'Everything in Free',
      'AI Agent Builder',
      'Create AI agents',
      'Deploy agents',
      'Basic workflows',
      'Basic memory',
      'Marketplace access',
      'Analytics',
    ],
    limits: { projects: '—', agents: '5 active', aiUsage: '500 runs/mo', storage: '5GB', members: '1', integrations: 'Basic', automation: 'Basic', support: 'Standard' },
  },
];