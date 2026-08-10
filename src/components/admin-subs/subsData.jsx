// Mock data for the PalladiumAI Admin Subscription Management — illustrative, backend-ready.
// Plans mirror the public pricing (Free, Pro, Business, Enterprise). All amounts in GBP (£).

export const METRICS = [
  { label: 'Active Plans', value: '4', detail: 'Free → Enterprise', icon: 'layers' },
  { label: 'Subscribers', value: '1,284', detail: '+42 this month', icon: 'users' },
  { label: 'Total Revenue', value: '£942,600', detail: 'All time', icon: 'pound' },
  { label: 'MRR', value: '£182,540', detail: '+4.1% MoM', icon: 'trending' },
  { label: 'Churn Rate', value: '2.1%', detail: '-0.3% MoM', icon: 'arrow-down' },
  { label: 'Upgrades', value: '64', detail: 'This month', icon: 'arrow-up' },
  { label: 'Downgrades', value: '18', detail: 'This month', icon: 'arrow-down' },
  { label: 'Renewals Due', value: '37', detail: '12 this week', icon: 'clock' },
];

export const PLAN_DEFAULTS = [
  { id: 'free', name: 'Free', price: 0, users: 1, projects: 0, agents: 0, storage: 1, usage: 0, features: ['1 user', 'Browse marketplace', 'View agents', 'View public workflows'] },
  { id: 'pro', name: 'Pro', price: 20, users: 1, projects: 5, agents: 5, storage: 5, usage: 500, features: ['1 user', '5 agents', 'Agent Builder', 'Basic workflows'] },
  { id: 'business', name: 'Business', price: 1500, users: 15, projects: 50, agents: 50, storage: 100, usage: 50000, features: ['Team workspace', '50 agents', 'Advanced workflows', 'API access'] },
  { id: 'enterprise', name: 'Enterprise', price: 3000, users: null, projects: null, agents: 200, storage: 500, usage: 250000, features: ['Unlimited teams', '200+ agents', 'Advanced security', 'Priority infrastructure'] },
];

export const SUBSCRIPTIONS = [
  { id: 's1', customer: 'Sarah Chen', email: 'sarah@palladium.ai', org: 'Palladium Studio', plan: 'Enterprise', price: 3000, status: 'active', started: '2024-05-30', renews: '2026-09-30', method: 'Invoice', mrr: 3000 },
  { id: 's2', customer: 'Maya Patel', email: 'maya@acme.com', org: 'Acme Corp', plan: 'Business', price: 1500, status: 'active', started: '2024-11-04', renews: '2026-11-04', method: 'Visa •••• 4242', mrr: 1500 },
  { id: 's3', customer: 'James Lee', email: 'james@globex.io', org: 'Globex', plan: 'Pro', price: 20, status: 'past_due', started: '2025-01-22', renews: '2026-08-22', method: 'Mastercard •••• 8800', mrr: 20 },
  { id: 's4', customer: 'Lina Garcia', email: 'lina@initech.com', org: 'Initech', plan: 'Enterprise', price: 3000, status: 'active', started: '2024-07-18', renews: '2026-10-18', method: 'Invoice', mrr: 3000 },
  { id: 's5', customer: 'Tom Wright', email: 'tom@umbrella.org', org: 'Umbrella', plan: 'Free', price: 0, status: 'active', started: '2025-04-02', renews: '—', method: '—', mrr: 0 },
  { id: 's6', customer: 'Aisha Khan', email: 'aisha@soylent.co', org: 'Soylent', plan: 'Business', price: 1500, status: 'active', started: '2025-07-14', renews: '2026-08-14', method: 'Visa •••• 4242', mrr: 1500 },
  { id: 's7', customer: 'Ben Carter', email: 'ben@hooli.com', org: 'Hooli', plan: 'Pro', price: 20, status: 'active', started: '2025-07-28', renews: '2026-08-28', method: 'Visa •••• 4242', mrr: 20 },
  { id: 's8', customer: 'Nora Fields', email: 'nora@palladium.ai', org: 'Palladium Studio', plan: 'Enterprise', price: 3000, status: 'canceled', started: '2024-03-12', renews: '—', method: 'Invoice', mrr: 0 },
  { id: 's9', customer: 'Ivy Stone', email: 'ivy@bright.io', org: 'Bright Labs', plan: 'Pro', price: 20, status: 'active', started: '2025-05-10', renews: '2026-09-10', method: 'Visa •••• 1190', mrr: 20 },
  { id: 's10', customer: 'Owen Park', email: 'owen@initech.com', org: 'Initech', plan: 'Business', price: 1500, status: 'active', started: '2025-02-01', renews: '2026-09-01', method: 'Amex •••• 3300', mrr: 1500 },
];