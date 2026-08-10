// Central mock data store for the User Settings page.
// Placeholder values — replace with backend reads/writes when ready.

export const PROFILE = {
  name: 'Alex Mercer',
  username: 'alex.mercer',
  email: 'alex@palladiumai.com',
  avatar: null,
  jobTitle: 'Head of AI Operations',
  company: 'PalladiumAI',
  bio: 'Orchestrating autonomous agent fleets and complex workflows for modern teams.',
};

export const ACCOUNT = {
  language: 'English (UK)',
  timezone: 'Europe / London (GMT+0)',
  dateFormat: 'DD / MM / YYYY',
  currency: 'GBP (£)',
};

export const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: 'User' },
  { id: 'account', label: 'Account', icon: 'Globe' },
  { id: 'appearance', label: 'Appearance', icon: 'Palette' },
  { id: 'ai', label: 'AI Preferences', icon: 'Sparkles' },
  { id: 'notifications', label: 'Notifications', icon: 'Bell' },
  { id: 'privacy', label: 'Privacy', icon: 'Lock' },
  { id: 'security', label: 'Security', icon: 'ShieldCheck' },
  { id: 'connected', label: 'Connected Accounts', icon: 'Link2' },
  { id: 'apikeys', label: 'API Keys', icon: 'KeyRound' },
  { id: 'developer', label: 'Developer Settings', icon: 'Code2' },
];

export const AI_MODELS = [
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI' },
  { id: 'claude-opus', name: 'Claude Opus 4.8', provider: 'Anthropic' },
  { id: 'gemini-pro', name: 'Gemini 3.1 Pro', provider: 'Google' },
  { id: 'llama-3', name: 'Llama 3.1 405B', provider: 'Meta' },
];

export const AGENTS = [
  { id: 'research', name: 'Research Agent' },
  { id: 'support', name: 'Support Agent' },
  { id: 'code', name: 'Code Agent' },
];

export const RESPONSE_STYLES = ['Concise', 'Balanced', 'Detailed', 'Creative'];

export const CONNECTED_ACCOUNTS = [
  { id: 'google', name: 'Google', icon: 'Chrome', grad: 'from-amber-500 to-orange-500', connected: true, email: 'alex.mercer@gmail.com' },
  { id: 'microsoft', name: 'Microsoft', icon: 'Grid2x2', grad: 'from-sky-500 to-blue-500', connected: true, email: 'alex@palladiumai.com' },
  { id: 'github', name: 'GitHub', icon: 'Github', grad: 'from-zinc-500 to-zinc-700', connected: true, email: 'alexmercer' },
  { id: 'slack', name: 'Slack', icon: 'MessageSquare', grad: 'from-fuchsia-500 to-purple-500', connected: false, email: null },
  { id: 'discord', name: 'Discord', icon: 'MessagesSquare', grad: 'from-indigo-500 to-violet-500', connected: false, email: null },
];

export const API_KEYS = [
  { id: 'key_1', name: 'Production', prefix: 'pk_live_', masked: '••••••••••••••••', created: '2026-05-12', lastUsed: '2026-08-07', scope: 'Full access' },
  { id: 'key_2', name: 'Analytics Pipeline', prefix: 'pk_live_', masked: '••••••••••••••••', created: '2026-06-01', lastUsed: '2026-08-06', scope: 'Read-only' },
  { id: 'key_3', name: 'CI / CD', prefix: 'pk_test_', masked: '••••••••••••••••', created: '2026-07-20', lastUsed: '2026-08-05', scope: 'Workflows' },
];

export const ACCENT_COLORS = [
  { id: 'violet', value: 'rgb(139,92,246)', grad: 'from-violet-500 to-indigo-500' },
  { id: 'cyan', value: 'rgb(34,211,238)', grad: 'from-cyan-500 to-blue-500' },
  { id: 'emerald', value: 'rgb(16,185,129)', grad: 'from-emerald-500 to-teal-500' },
  { id: 'amber', value: 'rgb(245,158,11)', grad: 'from-amber-500 to-orange-500' },
  { id: 'rose', value: 'rgb(244,63,94)', grad: 'from-rose-500 to-red-500' },
];

export const LANGUAGES = ['English (UK)', 'English (US)', 'Français', 'Deutsch', 'Español', '日本語'];
export const TIMEZONES = ['Europe / London (GMT+0)', 'America / New York (GMT-5)', 'Asia / Tokyo (GMT+9)', 'Australia / Sydney (GMT+10)'];
export const DATE_FORMATS = ['DD / MM / YYYY', 'MM / DD / YYYY', 'YYYY-MM-DD'];
export const CURRENCIES = ['GBP (£)', 'USD ($)', 'EUR (€)', 'JPY (¥)'];