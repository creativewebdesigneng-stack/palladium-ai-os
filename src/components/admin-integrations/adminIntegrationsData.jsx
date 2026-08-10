// Mock platform integrations for the PalladiumAI Admin Integration Management — illustrative, backend-ready.

export const CATEGORIES = ['All', 'AI', 'Storage', 'Business', 'Developer', 'Communication', 'Payments'];
export const STATUSES = ['All', 'Enabled', 'Disabled', 'Update available', 'Beta'];

export const INTEGRATIONS = [
  { id: 'openai', name: 'OpenAI', category: 'AI', status: 'Enabled', users: 18420, requests: 4020133, errors: 24, version: '2026.08', logo: '🟢', desc: 'GPT models for completions and agents.' },
  { id: 'anthropic', name: 'Anthropic', category: 'AI', status: 'Enabled', users: 9210, requests: 1180402, errors: 8, version: '2026.07', logo: '🟣', desc: 'Claude models for reasoning and chat.' },
  { id: 'google-ai', name: 'Google AI', category: 'AI', status: 'Enabled', users: 7340, requests: 880912, errors: 12, version: '2026.08', logo: '🔵', desc: 'Gemini models with multimodal support.' },
  { id: 'mistral', name: 'Mistral AI', category: 'AI', status: 'Beta', users: 1204, requests: 48021, errors: 3, version: '0.9-beta', logo: '🟠', desc: 'Open-weight European models.' },
  { id: 's3', name: 'Amazon S3', category: 'Storage', status: 'Enabled', users: 12800, requests: 2210488, errors: 5, version: '2026.06', logo: '🪣', desc: 'Object storage for uploads and assets.' },
  { id: 'gcs', name: 'Google Cloud Storage', category: 'Storage', status: 'Disabled', users: 0, requests: 0, errors: 0, version: '2026.05', logo: '☁️', desc: 'GCS buckets for asset persistence.' },
  { id: 'azure-blob', name: 'Azure Blob Storage', category: 'Storage', status: 'Update available', users: 980, requests: 120410, errors: 2, version: '2026.04', logo: '🔷', desc: 'Azure object storage integration.' },
  { id: 'dropbox', name: 'Dropbox', category: 'Storage', status: 'Enabled', users: 3120, requests: 48812, errors: 1, version: '2026.06', logo: '📦', desc: 'File sync and sharing.' },
  { id: 'github', name: 'GitHub', category: 'Developer', status: 'Enabled', users: 8820, requests: 940221, errors: 14, version: '2026.08', logo: '🐙', desc: 'Repository sync and Git automation.' },
  { id: 'gitlab', name: 'GitLab', category: 'Developer', status: 'Beta', users: 740, requests: 22810, errors: 4, version: '0.4-beta', logo: '🦊', desc: 'Self-hosted Git and CI pipelines.' },
  { id: 'vercel', name: 'Vercel', category: 'Developer', status: 'Enabled', users: 4120, requests: 120011, errors: 2, version: '2026.07', logo: '▲', desc: 'Edge deployments and previews.' },
  { id: 'linear', name: 'Linear', category: 'Business', status: 'Enabled', users: 2980, requests: 88240, errors: 0, version: '2026.06', logo: '📈', desc: 'Issue tracking and project sync.' },
  { id: 'jira', name: 'Jira', category: 'Business', status: 'Enabled', users: 5210, requests: 210882, errors: 9, version: '2026.07', logo: '🧩', desc: 'Atlassian issue management.' },
  { id: 'notion', name: 'Notion', category: 'Business', status: 'Update available', users: 6140, requests: 318220, errors: 6, version: '2026.05', logo: '📝', desc: 'Docs and workspace sync.' },
  { id: 'hubspot', name: 'HubSpot', category: 'Business', status: 'Disabled', users: 0, requests: 0, errors: 0, version: '2026.03', logo: '🟠', desc: 'CRM and marketing automation.' },
  { id: 'slack', name: 'Slack', category: 'Communication', status: 'Enabled', users: 11280, requests: 1842022, errors: 18, version: '2026.08', logo: '💬', desc: 'Team messaging and alerts.' },
  { id: 'gmail', name: 'Gmail', category: 'Communication', status: 'Enabled', users: 8420, requests: 740221, errors: 7, version: '2026.07', logo: '✉️', desc: 'Outbound and inbound email.' },
  { id: 'teams', name: 'Microsoft Teams', category: 'Communication', status: 'Update available', users: 2810, requests: 142004, errors: 4, version: '2026.04', logo: '👥', desc: 'Enterprise chat and meetings.' },
  { id: 'discord', name: 'Discord', category: 'Communication', status: 'Beta', users: 980, requests: 38820, errors: 1, version: '0.6-beta', logo: '🎮', desc: 'Community chat channels.' },
  { id: 'stripe', name: 'Stripe', category: 'Payments', status: 'Enabled', users: 14200, requests: 882040, errors: 3, version: '2026.08', logo: '💳', desc: 'Subscription billing and payouts.' },
  { id: 'paypal', name: 'PayPal', category: 'Payments', status: 'Disabled', users: 0, requests: 0, errors: 0, version: '2026.02', logo: '🅿️', desc: 'Alternative payment provider.' },
  { id: 'square', name: 'Square', category: 'Payments', status: 'Beta', users: 220, requests: 4820, errors: 0, version: '0.3-beta', logo: '⬛', desc: 'In-person and online payments.' },
];

export const CATEGORY_META = {
  AI: { tone: 'text-violet-300 bg-violet-500/15' },
  Storage: { tone: 'text-cyan-300 bg-cyan-500/15' },
  Business: { tone: 'text-amber-300 bg-amber-500/15' },
  Developer: { tone: 'text-emerald-300 bg-emerald-500/15' },
  Communication: { tone: 'text-pink-300 bg-pink-500/15' },
  Payments: { tone: 'text-blue-300 bg-blue-500/15' },
};

export const STATUS_META = {
  'Enabled': { tone: 'text-emerald-300 bg-emerald-500/15', dot: 'bg-emerald-400' },
  'Disabled': { tone: 'text-zinc-400 bg-white/5', dot: 'bg-zinc-500' },
  'Update available': { tone: 'text-amber-300 bg-amber-500/15', dot: 'bg-amber-400' },
  'Beta': { tone: 'text-sky-300 bg-sky-500/15', dot: 'bg-sky-400' },
};