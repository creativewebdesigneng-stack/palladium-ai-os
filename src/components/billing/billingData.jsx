// Central mock data store for the Billing & Subscription page.
// Plan data is derived from the canonical pricing source so prices stay
// consistent with the public pricing page. Replace mock values with
// Stripe / backend calls when ready.

import { PLANS as PRICING_PLANS } from '@/components/site/pricingPlans';

export const CURRENT_PLAN = {
  name: 'Business',
  price: 1500,
  cycle: 'Monthly',
  renewal: '2026-09-07',
  status: 'active',
  seats: 15,
  seatsUsed: 8,
};

export const PLANS = PRICING_PLANS.map((p) => ({
  id: p.id,
  name: p.name,
  price: p.monthly,
  cycle: 'Monthly',
  grad: p.grad,
  popular: p.popular,
  contactSales: !!p.contactSales,
  limits: p.limits,
}));

export const USAGE_METRICS = [
  { id: 'ai', label: 'AI Usage', value: 112000, max: 150000, unit: 'credits', grad: 'from-violet-500 to-indigo-500' },
  { id: 'agents', label: 'Agent Runs', value: 18400, max: 25000, unit: 'runs', grad: 'from-sky-500 to-cyan-500' },
  { id: 'workflows', label: 'Workflow Runs', value: 9200, max: 25000, unit: 'runs', grad: 'from-fuchsia-500 to-pink-500' },
  { id: 'storage', label: 'Storage', value: 168, max: 250, unit: 'GB', grad: 'from-amber-500 to-orange-500' },
  { id: 'api', label: 'API Requests', value: 428000, max: 500000, unit: 'req', grad: 'from-emerald-500 to-teal-500' },
  { id: 'sessions', label: 'Browser Sessions', value: 42, max: 100, unit: 'sessions', grad: 'from-rose-500 to-red-500' },
  { id: 'files', label: 'File Processing', value: 3400, max: 5000, unit: 'files', grad: 'from-cyan-500 to-blue-500' },
  { id: 'knowledge', label: 'Knowledge Searches', value: 12800, max: 20000, unit: 'searches', grad: 'from-indigo-500 to-purple-500' },
];

export const PAYMENT_METHOD = {
  brand: 'Visa',
  masked: '•••• •••• •••• 4242',
  expiry: '08 / 28',
  name: 'Alex Mercer',
  isDefault: true,
};

export const INVOICES = [
  { id: 'PI-2048', date: '2026-08-07', amount: 350.0, status: 'paid' },
  { id: 'PI-2031', date: '2026-07-07', amount: 350.0, status: 'paid' },
  { id: 'PI-2014', date: '2026-06-07', amount: 350.0, status: 'paid' },
  { id: 'PI-1998', date: '2026-05-07', amount: 350.0, status: 'paid' },
  { id: 'PI-1976', date: '2026-04-07', amount: 350.0, status: 'failed' },
  { id: 'PI-1952', date: '2026-03-07', amount: 350.0, status: 'paid' },
];

export const PAYMENT_HISTORY = [
  { id: 'PAY-9921', date: '2026-08-07', amount: 350.0, method: 'Visa •••• 4242', status: 'success' },
  { id: 'PAY-9887', date: '2026-07-07', amount: 350.0, method: 'Visa •••• 4242', status: 'success' },
  { id: 'PAY-9844', date: '2026-06-07', amount: 350.0, method: 'Visa •••• 4242', status: 'success' },
  { id: 'PAY-9801', date: '2026-05-07', amount: 350.0, method: 'Visa •••• 4242', status: 'success' },
  { id: 'PAY-9763', date: '2026-04-07', amount: 350.0, method: 'Visa •••• 4242', status: 'failed' },
  { id: 'PAY-9742', date: '2026-04-08', amount: 350.0, method: 'Visa •••• 4242', status: 'success' },
];

export const SUBSCRIPTION_HISTORY = [
  { date: '2026-07-15', event: 'Account created', plan: 'Free' },
  { date: '2026-07-20', event: 'Started Free Explorer plan', plan: 'Free' },
];

export const USAGE_BREAKDOWN = {
  byAgent: [
    { name: 'Research Agent', value: 38, color: 'bg-violet-500' },
    { name: 'Support Agent', value: 24, color: 'bg-sky-500' },
    { name: 'Code Agent', value: 18, color: 'bg-emerald-500' },
    { name: 'Sales Agent', value: 12, color: 'bg-amber-500' },
    { name: 'Other', value: 8, color: 'bg-zinc-500' },
  ],
  byProject: [
    { name: 'Atlas Analytics', value: 34, color: 'bg-indigo-500' },
    { name: 'Nova Support', value: 28, color: 'bg-cyan-500' },
    { name: 'Orbit Commerce', value: 22, color: 'bg-fuchsia-500' },
    { name: 'Internal Tools', value: 16, color: 'bg-rose-500' },
  ],
  byTeam: [
    { name: 'Engineering', value: 42, color: 'bg-violet-500' },
    { name: 'Product', value: 26, color: 'bg-sky-500' },
    { name: 'Marketing', value: 18, color: 'bg-emerald-500' },
    { name: 'Operations', value: 14, color: 'bg-amber-500' },
  ],
  byIntegration: [
    { name: 'OpenAI', value: 36, color: 'bg-emerald-500' },
    { name: 'Anthropic', value: 28, color: 'bg-amber-500' },
    { name: 'Google AI', value: 20, color: 'bg-sky-500' },
    { name: 'Slack', value: 10, color: 'bg-fuchsia-500' },
    { name: 'Other', value: 6, color: 'bg-zinc-500' },
  ],
};

export const RECOMMENDATION = {
  title: 'Your organisation is approaching its agent execution limit.',
  body: 'You have used 73% of your monthly Agent Runs (18,400 / 25,000). Based on current growth, you will exceed your limit in ~9 days. Upgrading to the Business plan removes the ceiling and adds team management.',
  suggestedPlan: 'business',
  confidence: 'High',
};

export const COMPARISON_ROWS = [
  { feature: 'Price', key: 'price' },
  { feature: 'Projects', key: 'projects' },
  { feature: 'AI Agents', key: 'agents' },
  { feature: 'AI Usage', key: 'aiUsage' },
  { feature: 'Storage', key: 'storage' },
  { feature: 'Team Members', key: 'members' },
  { feature: 'Integrations', key: 'integrations' },
  { feature: 'Automation', key: 'automation' },
  { feature: 'Support', key: 'support' },
  { feature: 'SSO', key: 'sso' },
  { feature: 'Advanced Security', key: 'security' },
  { feature: 'SLA', key: 'sla' },
];

export const ENTERPRISE_FEATURES = [
  { icon: 'Headset', title: 'Dedicated Support', desc: 'A named account team and 24/7 priority response.' },
  { icon: 'KeyRound', title: 'SSO', desc: 'SAML / OIDC single sign-on with SCIM provisioning.' },
  { icon: 'ShieldCheck', title: 'Advanced Security', desc: 'Penetration testing, audit exports and data residency.' },
  { icon: 'SlidersHorizontal', title: 'Custom Limits', desc: 'Negotiated ceilings on agents, workflows and storage.' },
  { icon: 'Server', title: 'Private Infrastructure', desc: 'Dedicated, isolated compute for your AI workloads.' },
  { icon: 'FileSignature', title: 'SLA', desc: '99.99% uptime guarantee with contractual credits.' },
];

export const OVERVIEW = [
  { label: 'Monthly spend', value: '£1,500', detail: 'Business plan', grad: 'from-violet-500 to-indigo-500', trend: '+0% MoM', up: true, spark: [1500, 1500, 1500, 1500, 1500, 1500, 1500] },
  { label: 'Credits used', value: '112k', detail: '74% of 150k', grad: 'from-sky-500 to-cyan-500', trend: '+12% MoM', up: true, spark: [60, 72, 68, 84, 92, 104, 112] },
  { label: 'Active seats', value: '6 / 8', detail: '2 available', grad: 'from-emerald-500 to-teal-500', trend: '+1 MoM', up: true, spark: [4, 4, 5, 5, 6, 6, 6] },
  { label: 'Next invoice', value: '7 Sep', detail: '£350.00', grad: 'from-amber-500 to-orange-500', trend: 'in 31 days', up: false, spark: [350, 350, 350, 350, 350, 350, 350] },
];