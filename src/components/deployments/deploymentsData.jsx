// Mock data for the Deployments page. Backend ready.

export const PROJECTS = [
  { id: 'palladium-app', name: 'Palladium App', env: 'production', deployments: 142 },
  { id: 'palladium-api', name: 'Palladium API', env: 'staging', deployments: 68 },
  { id: 'marketing-site', name: 'Marketing Site', env: 'preview', deployments: 31 },
  { id: 'docs-portal', name: 'Docs Portal', env: 'development', deployments: 12 },
];

export const ENVIRONMENTS = [
  { id: 'development', name: 'Development', color: 'sky', desc: 'Internal testing & PR previews', deployments: 8 },
  { id: 'preview', name: 'Preview', color: 'violet', desc: 'Branch previews for review', deployments: 5 },
  { id: 'staging', name: 'Staging', color: 'amber', desc: 'Pre-production release candidate', deployments: 3 },
  { id: 'production', name: 'Production', color: 'emerald', desc: 'Live customer-facing', deployments: 2 },
];

export const ENV_COLOR = {
  development: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  preview: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
  staging: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  production: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
};

export const STATUS_STYLE = {
  Building: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Deploying: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  Live: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Failed: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  Cancelled: 'text-zinc-400 bg-white/5 border-white/10',
};

export const STATUS_DOT = { Building: 'bg-amber-400', Deploying: 'bg-sky-400', Live: 'bg-emerald-400', Failed: 'bg-rose-400', Cancelled: 'bg-zinc-500' };

export const DEPLOYMENTS = [
  { id: 'dpl_8f2', version: 'v2.4.1', commit: 'a1b2c3d', msg: 'feat: kanban drag-and-drop', author: 'Aria', time: '2m ago', duration: '1m 42s', status: 'Building', env: 'production', project: 'palladium-app' },
  { id: 'dpl_8f1', version: 'v2.4.0', commit: '4e5f6a7', msg: 'fix: auth session cookie', author: 'Devon', time: '14m ago', duration: '1m 38s', status: 'Deploying', env: 'staging', project: 'palladium-api' },
  { id: 'dpl_8e9', version: 'v2.3.9', commit: '8b9c0d1', msg: 'chore: bump recharts', author: 'Finn', time: '1h ago', duration: '1m 30s', status: 'Live', env: 'production', project: 'palladium-app' },
  { id: 'dpl_8e8', version: 'v2.3.8', commit: '2c3d4e5', msg: 'feat: dark mode toggle', author: 'Aria', time: '2h ago', duration: '2m 04s', status: 'Live', env: 'preview', project: 'marketing-site' },
  { id: 'dpl_8e7', version: 'v2.3.7', commit: '9f0a1b2', msg: 'feat: search index', author: 'Devon', time: '3h ago', duration: '0m 58s', status: 'Failed', env: 'development', project: 'docs-portal' },
  { id: 'dpl_8e6', version: 'v2.3.6', commit: '5d6e7f8', msg: 'fix: footer overlap', author: 'Finn', time: '5h ago', duration: '1m 12s', status: 'Cancelled', env: 'staging', project: 'palladium-api' },
  { id: 'dpl_8e5', version: 'v2.3.5', commit: '1a2b3c4', msg: 'feat: agent templates', author: 'Aria', time: '6h ago', duration: '1m 49s', status: 'Live', env: 'preview', project: 'palladium-app' },
];

export const BUILDS = [
  { id: 'bld_201', project: 'palladium-app', commit: 'a1b2c3d', time: '2m ago', duration: '42s', status: 'Building', size: '14.2 MB' },
  { id: 'bld_200', project: 'palladium-app', commit: '4e5f6a7', time: '14m ago', duration: '38s', status: 'Success', size: '14.1 MB' },
  { id: 'bld_199', project: 'palladium-api', commit: '4e5f6a7', time: '14m ago', duration: '29s', status: 'Success', size: '8.4 MB' },
  { id: 'bld_198', project: 'marketing-site', commit: '8b9c0d1', time: '1h ago', duration: '51s', status: 'Success', size: '3.8 MB' },
  { id: 'bld_197', project: 'docs-portal', commit: '9f0a1b2', time: '3h ago', duration: '22s', status: 'Failed', size: '—' },
  { id: 'bld_196', project: 'palladium-api', commit: '5d6e7f8', time: '5h ago', duration: '12s', status: 'Cancelled', size: '—' },
];

export const BUILD_STATUS_STYLE = {
  Building: 'text-amber-400', Success: 'text-emerald-400', Failed: 'text-rose-400', Cancelled: 'text-zinc-400',
};

export const DOMAINS = [
  { domain: 'palladium.ai', ssl: 'Active', sslExpiry: '62 days', dns: 'Configured', status: 'Live', primary: true },
  { domain: 'app.palladium.ai', ssl: 'Active', sslExpiry: '54 days', dns: 'Configured', status: 'Live', primary: false },
  { domain: 'api.palladium.ai', ssl: 'Active', sslExpiry: '48 days', dns: 'Configured', status: 'Live', primary: false },
  { domain: 'staging.palladium.ai', ssl: 'Renewing', sslExpiry: '3 days', dns: 'Pending', status: 'Warning', primary: false },
  { domain: 'preview.palladium.ai', ssl: 'None', sslExpiry: '—', dns: 'Misconfigured', status: 'Failed', primary: false },
];

export const DOMAIN_STATUS_STYLE = {
  Live: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Failed: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

export const SSL_STYLE = { Active: 'text-emerald-400', Renewing: 'text-amber-400', None: 'text-rose-400' };
export const DNS_STYLE = { Configured: 'text-emerald-400', Pending: 'text-amber-400', Misconfigured: 'text-rose-400' };

export const DEPLOYMENT_ACTIONS = ['Deploy', 'Rollback', 'Redeploy', 'Cancel'];