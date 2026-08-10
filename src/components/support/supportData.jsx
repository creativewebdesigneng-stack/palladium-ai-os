// Mock data for the PalladiumAI Customer Support Centre.
// All records are illustrative mock data — not real customer data.

export const DISCLAIMER = 'Figures shown are illustrative mock data and do not represent real customer information.';

export const METRICS = [
  { id: 'open', label: 'Open Tickets', value: '24', delta: '6 new today', tone: 'text-sky-300' },
  { id: 'waiting', label: 'Waiting', value: '12', delta: '3 over SLA', tone: 'text-amber-300' },
  { id: 'resolved', label: 'Resolved (7d)', value: '148', delta: '+18%', tone: 'text-emerald-300' },
  { id: 'csat', label: 'CSAT', value: '94%', delta: '+1.2pt', tone: 'text-emerald-300' },
  { id: 'response', label: 'Avg Response', value: '2h 14m', delta: '-12m', tone: 'text-emerald-300' },
  { id: 'queue', label: 'Live Chat Queue', value: '5', delta: '2 unassigned', tone: 'text-fuchsia-300' },
];

export const NAV = [
  { id: 'tickets', label: 'Tickets', icon: 'Ticket' },
  { id: 'customers', label: 'Customers', icon: 'Users' },
  { id: 'agents', label: 'Agents', icon: 'Headset' },
  { id: 'chat', label: 'Live Chat', icon: 'MessagesSquare' },
  { id: 'kb', label: 'Knowledge Base', icon: 'BookOpen' },
  { id: 'automation', label: 'Automation', icon: 'Workflow' },
];

export const STATUS_STYLE = {
  new: 'text-sky-300 bg-sky-400/10 border-sky-400/20',
  open: 'text-violet-300 bg-violet-400/10 border-violet-400/20',
  waiting: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
  resolved: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  closed: 'text-zinc-400 bg-white/5 border-white/10',
};

export const PRIORITY_STYLE = {
  urgent: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
  high: 'text-amber-300 bg-amber-400/10 border-amber-400/20',
  normal: 'text-sky-300 bg-sky-400/10 border-sky-400/20',
  low: 'text-zinc-400 bg-white/5 border-white/10',
};

export const STATUS_FILTERS = ['all', 'new', 'open', 'waiting', 'resolved', 'closed'];

export const TICKETS = [
  { id: 'TK-2048', customer: 'Aurora Bank', subject: 'SSO integration failing on staging', priority: 'urgent', agent: 'Maya Chen', status: 'open', created: 'Aug 7, 09:14', updated: '12m ago' },
  { id: 'TK-2047', customer: 'Vertex Robotics', subject: 'Invoice PI-2051 not in portal', priority: 'high', agent: 'Sam Okafor', status: 'waiting', created: 'Aug 7, 08:02', updated: '1h ago' },
  { id: 'TK-2046', customer: 'Northwind Labs', subject: 'Bulk import timeout > 5k rows', priority: 'high', agent: 'Unassigned', status: 'new', created: 'Aug 7, 07:40', updated: '2h ago' },
  { id: 'TK-2045', customer: 'Helio Health', subject: 'Webhook retries stuck', priority: 'normal', agent: 'Riya Patel', status: 'open', created: 'Aug 6, 18:22', updated: '5h ago' },
  { id: 'TK-2044', customer: 'Meridian Media', subject: 'Mobile app crash on login', priority: 'urgent', agent: 'Maya Chen', status: 'waiting', created: 'Aug 6, 16:08', updated: '8h ago' },
  { id: 'TK-2043', customer: 'Cobalt Logistics', subject: 'Export CSV encoding issue', priority: 'low', agent: 'Sam Okafor', status: 'resolved', created: 'Aug 6, 12:40', updated: '1d ago' },
  { id: 'TK-2042', customer: 'Aurora Bank', subject: 'Forgot password loop', priority: 'normal', agent: 'Riya Patel', status: 'closed', created: 'Aug 5, 14:10', updated: '2d ago' },
  { id: 'TK-2041', customer: 'Vertex Robotics', subject: 'API rate limit clarification', priority: 'normal', agent: 'Maya Chen', status: 'open', created: 'Aug 5, 11:30', updated: '2d ago' },
];

export const CUSTOMERS = [
  { id: 'cu1', name: 'Aurora Bank', plan: 'Enterprise', tickets: 14, open: 2, tier: 'tier-1' },
  { id: 'cu2', name: 'Vertex Robotics', plan: 'Pro', tickets: 22, open: 3, tier: 'tier-1' },
  { id: 'cu3', name: 'Northwind Labs', plan: 'Pro', tickets: 9, open: 1, tier: 'tier-2' },
  { id: 'cu4', name: 'Helio Health', plan: 'Enterprise', tickets: 18, open: 2, tier: 'tier-1' },
  { id: 'cu5', name: 'Meridian Media', plan: 'Starter', tickets: 7, open: 1, tier: 'tier-2' },
  { id: 'cu6', name: 'Cobalt Logistics', plan: 'Pro', tickets: 11, open: 0, tier: 'tier-2' },
];

export const TIER_STYLE = { 'tier-1': 'text-violet-300 bg-violet-400/10', 'tier-2': 'text-sky-300 bg-sky-400/10' };

export const SUPPORT_AGENTS = [
  { id: 'ag1', name: 'Maya Chen', role: 'Senior Support', active: 6, resolved: 42, csat: 96, online: true },
  { id: 'ag2', name: 'Sam Okafor', role: 'Support Engineer', active: 4, resolved: 38, csat: 94, online: true },
  { id: 'ag3', name: 'Riya Patel', role: 'Support', active: 3, resolved: 26, csat: 92, online: false },
  { id: 'ag4', name: 'Leo Martins', role: 'Onboarding', active: 2, resolved: 19, csat: 95, online: true },
];

export const LIVE_CHATS = [
  { id: 'lc1', customer: 'Aurora Bank · Dana R.', last: 'Can you share the staging logs?', unread: 2, status: 'active' },
  { id: 'lc2', customer: 'Vertex Robotics · Omar T.', last: 'Thanks, that fixed it.', unread: 0, status: 'active' },
  { id: 'lc3', customer: 'Northwind Labs · Priya K.', last: 'Waiting on bulk import...', unread: 1, status: 'queued' },
  { id: 'lc4', customer: 'Meridian Media · Cole W.', last: 'Crash still happens on iOS 17', unread: 3, status: 'queued' },
];

export const CHAT_MESSAGES = [
  { id: 'm1', from: 'customer', text: 'Hi, our SSO on staging keeps redirecting.', time: '09:14' },
  { id: 'm2', from: 'agent', text: 'Thanks for reporting — can you share the IdP and a HAR file?', time: '09:16' },
  { id: 'm3', from: 'customer', text: 'It is Okta. Sending the HAR now.', time: '09:18' },
  { id: 'm4', from: 'agent', text: 'Got it. I see a certificate mismatch — updating the metadata.', time: '09:22' },
  { id: 'm5', from: 'customer', text: 'Can you share the staging logs?', time: '09:24' },
];

export const KB = [
  { id: 'kb1', title: 'Configure SSO with Okta', category: 'Auth', views: 1284, updated: 'Jul 30' },
  { id: 'kb2', title: 'Bulk import limits & timeouts', category: 'Data', views: 642, updated: 'Aug 2' },
  { id: 'kb3', title: 'Webhook retry policy', category: 'Integrations', views: 918, updated: 'Jul 28' },
  { id: 'kb4', title: 'Export CSV encoding guide', category: 'Data', views: 311, updated: 'Aug 5' },
  { id: 'kb5', title: 'Mobile app login troubleshooting', category: 'Mobile', views: 756, updated: 'Aug 1' },
  { id: 'kb6', title: 'API rate limits & best practices', category: 'API', views: 1490, updated: 'Jul 22' },
];

export const AUTOMATIONS = [
  { id: 'au1', name: 'Auto-classify new tickets', trigger: 'On ticket create', action: 'AI classify → priority', on: true },
  { id: 'au2', name: 'SLA escalation', trigger: 'SLA < 1h', action: 'Escalate to senior', on: true },
  { id: 'au3', name: 'Suggest KB article', trigger: 'On reply', action: 'AI search KB', on: true },
  { id: 'au4', name: 'Close resolved after 72h', trigger: 'Resolved > 72h', action: 'Auto-close', on: false },
  { id: 'au5', name: 'Route by language', trigger: 'On create', action: 'Assign agent', on: true },
];

export const AI_TOOLS = [
  { id: 'reply', label: 'AI Reply', desc: 'Draft a suggested response', icon: 'Sparkles', tone: 'from-violet-600/40 to-indigo-600/40' },
  { id: 'summarise', label: 'Summarise Ticket', desc: 'Condense the full thread', icon: 'ScrollText', tone: 'from-sky-600/40 to-blue-600/40' },
  { id: 'classify', label: 'Classify Ticket', desc: 'Auto-priority & category', icon: 'Tags', tone: 'from-fuchsia-600/40 to-pink-600/40' },
  { id: 'search', label: 'Search Knowledge', desc: 'Find relevant KB articles', icon: 'BookOpen', tone: 'from-amber-600/40 to-orange-600/40' },
  { id: 'escalate', label: 'Escalate', desc: 'Route to senior support', icon: 'TrendingUp', tone: 'from-rose-600/40 to-red-600/40' },
];