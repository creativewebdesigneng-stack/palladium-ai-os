// Canonical PalladiumAI marketing pricing — single source of truth for plan
// names, prices, features and limits. PalladiumAI is a paid product: Builder,
// Business, and Enterprise. The stable plan ids remain unchanged so existing
// billing/webhook/entitlement mappings stay backwards compatible.

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
    monthly: 3500,
    yearly: 35700,
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
  return [...FREEMIUM_PLANS, ...PLANS];
}

// Kept under the historical export name to avoid breaking existing imports.
// It now contains only the paid entry tier; Explorer is legacy-only and is no
// longer offered to new customers.
export const FREEMIUM_PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'Builder',
    description: 'Build and deploy your own AI workforce.',
    tagline: 'Build and deploy your own AI agents',
    monthly: 150,
    yearly: 1530,
    currency: '£',
    cta: 'Get Started',
    ctaTo: '/payment?plan=pro',
    highlight: true,
    popular: true,
    grad: 'from-violet-500 to-indigo-500',
    features: [
      'Full PalladiumAI platform access',
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