// Mock data for the PalladiumAI Admin Platform Analytics — illustrative, backend-ready.

export const METRICS = [
  { label: 'Total Users', value: '1,284', change: '+8.2%', trend: 'up', icon: 'users' },
  { label: 'Revenue', value: '$148,920', change: '+12.4%', trend: 'up', icon: 'dollar' },
  { label: 'AI Requests', value: '2.4M', change: '+18.6%', trend: 'up', icon: 'sparkles' },
  { label: 'Agent Runs', value: '184,210', change: '+9.1%', trend: 'up', icon: 'bot' },
  { label: 'Projects', value: '642', change: '+4.3%', trend: 'up', icon: 'folder' },
  { label: 'Integrations', value: '312', change: '+2.1%', trend: 'up', icon: 'plug' },
  { label: 'Workflows', value: '1,048', change: '+6.7%', trend: 'up', icon: 'git' },
  { label: 'Errors', value: '1,284', change: '-3.4%', trend: 'down', icon: 'alert' },
];

export const RANGES = ['Daily', 'Weekly', 'Monthly', 'Yearly'];

// Series per metric, per range. Labels are the x-axis ticks.
export const SERIES = {
  users: {
    Daily:   { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], values: [120, 142, 138, 168, 190, 88, 104] },
    Weekly:  { labels: ['W1','W2','W3','W4'], values: [820, 940, 1010, 1180] },
    Monthly: { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'], values: [640, 720, 810, 880, 940, 1010, 1100, 1180] },
    Yearly:  { labels: ['2022','2023','2024','2025','2026'], values: [180, 420, 760, 1040, 1284] },
  },
  revenue: {
    Daily:   { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], values: [4200, 4800, 4500, 5400, 6200, 3100, 3800] },
    Weekly:  { labels: ['W1','W2','W3','W4'], values: [22400, 24800, 26100, 29200] },
    Monthly: { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'], values: [18200, 20100, 21400, 22800, 24100, 25600, 27200, 28800] },
    Yearly:  { labels: ['2022','2023','2024','2025','2026'], values: [12000, 48000, 88000, 124000, 148920] },
  },
  requests: {
    Daily:   { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], values: [120, 142, 168, 190, 220, 88, 104].map(v => v * 8) },
    Weekly:  { labels: ['W1','W2','W3','W4'], values: [4200, 4880, 5120, 5980] },
    Monthly: { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'], values: [180, 210, 240, 268, 290, 312, 340, 360].map(v => v * 1000) },
    Yearly:  { labels: ['2022','2023','2024','2025','2026'], values: [180000, 920000, 1480000, 1980000, 2400000] },
  },
  errors: {
    Daily:   { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], values: [42, 38, 48, 30, 36, 22, 28] },
    Weekly:  { labels: ['W1','W2','W3','W4'], values: [320, 290, 260, 244] },
    Monthly: { labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'], values: [240, 220, 210, 190, 180, 170, 160, 150] },
    Yearly:  { labels: ['2022','2023','2024','2025','2026'], values: [2200, 1900, 1600, 1400, 1284] },
  },
};

export const REGIONS = ['All', 'North America', 'Europe', 'Asia Pacific', 'Middle East', 'Latin America'];
export const PLANS = ['All', 'Free', 'Starter', 'Pro', 'Team', 'Business', 'Enterprise'];
export const ORGS = ['All', 'Palladium Studio', 'Acme Corp', 'Globex', 'Initech', 'Hooli', 'Bright Labs'];
export const AGENTS = ['All', 'Atlas Research', 'Insight Agent', 'Marketing Agent', 'Support Agent', 'CodePilot', 'Knowledge Agent'];
export const MODELS = ['All', 'GPT-5', 'Claude Sonnet 4.6', 'Gemini 2.5 Pro', 'Llama 3.1', 'Mistral Large'];

export const AI_INSIGHTS = [
  { tone: 'up', title: 'Revenue growth accelerating', body: 'MRR grew 12.4% MoM driven by Enterprise upgrades — Initech (+$1,400) and Palladium Studio renewals. Consider proactive outreach to 14 trial accounts expiring within 7 days.' },
  { tone: 'down', title: 'Error rate declining', body: 'Platform errors dropped 3.4% this week, concentrated in the Agent Runs pipeline. Gemini 2.5 Pro error share fell to 1.1% — recommend promoting it as the default for new agents.' },
  { tone: 'warn', title: 'Globex at risk of churn', body: 'Globex (Pro plan) shows 3 failed logins, 0 sessions in 3 days, and past-due billing. Flag for retention outreach before the renewal window closes.' },
  { tone: 'up', title: 'AI Requests scaling fast', body: 'Requests up 18.6% with Asia Pacific contributing 34% of new volume. Provisioning an additional inference lane is advised to keep p95 latency under 800ms.' },
];