// Central mock data store for the Notifications Centre.
// Placeholder data — replace with backend reads when ready.

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'Inbox', grad: 'from-violet-500 to-indigo-500' },
  { id: 'agents', label: 'Agents', icon: 'Bot', grad: 'from-sky-500 to-cyan-500' },
  { id: 'projects', label: 'Projects', icon: 'FolderKanban', grad: 'from-indigo-500 to-purple-500' },
  { id: 'workflows', label: 'Workflows', icon: 'Workflow', grad: 'from-fuchsia-500 to-pink-500' },
  { id: 'security', label: 'Security', icon: 'ShieldCheck', grad: 'from-rose-500 to-red-500' },
  { id: 'team', label: 'Team', icon: 'Users', grad: 'from-emerald-500 to-teal-500' },
  { id: 'billing', label: 'Billing', icon: 'CreditCard', grad: 'from-amber-500 to-orange-500' },
  { id: 'system', label: 'System', icon: 'Server', grad: 'from-zinc-500 to-zinc-700' },
];

export const FILTERS = [
  { id: 'unread', label: 'Unread', icon: 'Mail' },
  { id: 'important', label: 'Important', icon: 'Star' },
  { id: 'mentions', label: 'Mentions', icon: 'AtSign' },
  { id: 'failures', label: 'Failures', icon: 'XCircle' },
  { id: 'success', label: 'Success', icon: 'CheckCircle2' },
];

export const NOTIFICATIONS = [
  { id: 'n1', category: 'agents', icon: 'Bot', grad: 'from-sky-500 to-cyan-500', title: 'Research Agent completed', desc: 'Market brief for Q3 SaaS trends is ready for review.', time: '2 min ago', timestamp: 2, priority: 'high', read: false, related: { type: 'Agent', label: 'Research Agent', path: '/agents/research' }, tags: ['success', 'important'] },
  { id: 'n2', category: 'workflows', icon: 'Workflow', grad: 'from-fuchsia-500 to-pink-500', title: 'Workflow run failed', desc: 'GitHub deployment workflow “Release v2.4.1” failed at the build step.', time: '14 min ago', timestamp: 14, priority: 'critical', read: false, related: { type: 'Workflow', label: 'Release v2.4.1', path: '/automation' }, tags: ['failures', 'important'] },
  { id: 'n3', category: 'security', icon: 'ShieldCheck', grad: 'from-rose-500 to-red-500', title: 'New sign-in detected', desc: 'Sign-in from London, UK on Chrome · macOS. If this wasn’t you, review your sessions.', time: '1 hour ago', timestamp: 60, priority: 'high', read: false, related: { type: 'Security', label: 'Active sessions', path: '/security' }, tags: ['important'] },
  { id: 'n4', category: 'team', icon: 'Users', grad: 'from-emerald-500 to-teal-500', title: 'Maya mentioned you', desc: '“@alex can you review the agent workforce plan before Friday?”', time: '2 hours ago', timestamp: 120, priority: 'medium', read: false, related: { type: 'Team', label: 'Workforce plan', path: '/team' }, tags: ['mentions'] },
  { id: 'n5', category: 'billing', icon: 'CreditCard', grad: 'from-amber-500 to-orange-500', title: 'Invoice PI-2048 was paid', desc: 'Your Professional plan renewed successfully — $79.00 charged to Visa •••• 4242.', time: '5 hours ago', timestamp: 300, priority: 'low', read: true, related: { type: 'Invoice', label: 'PI-2048', path: '/billing' }, tags: ['success'] },
  { id: 'n6', category: 'projects', icon: 'FolderKanban', grad: 'from-indigo-500 to-purple-500', title: 'Atlas Analytics deployed', desc: 'Version 1.8.0 is now live in production with zero downtime.', time: '6 hours ago', timestamp: 360, priority: 'medium', read: true, related: { type: 'Project', label: 'Atlas Analytics', path: '/projects' }, tags: ['success'] },
  { id: 'n7', category: 'agents', icon: 'Bot', grad: 'from-sky-500 to-cyan-500', title: 'Agent approval needed', desc: 'Code Agent is requesting permission to run a destructive shell command.', time: '7 hours ago', timestamp: 420, priority: 'high', read: false, related: { type: 'Agent', label: 'Code Agent', path: '/agents/code' }, tags: ['important'] },
  { id: 'n8', category: 'system', icon: 'Server', grad: 'from-zinc-500 to-zinc-700', title: 'Scheduled maintenance', desc: 'PalladiumAI will undergo a 15-minute maintenance window on 9 Aug at 02:00 BST.', time: '8 hours ago', timestamp: 480, priority: 'low', read: true, related: { type: 'System', label: 'Status page', path: '/docs' }, tags: [] },
  { id: 'n9', category: 'workflows', icon: 'Workflow', grad: 'from-fuchsia-500 to-pink-500', title: 'Workflow succeeded', desc: '“Daily Sales Digest” completed and posted to the #sales Slack channel.', time: '10 hours ago', timestamp: 600, priority: 'low', read: true, related: { type: 'Workflow', label: 'Daily Sales Digest', path: '/automation' }, tags: ['success'] },
  { id: 'n10', category: 'team', icon: 'Users', grad: 'from-emerald-500 to-teal-500', title: 'New team member joined', desc: 'Jordan Lee accepted the invitation and joined the Engineering team.', time: '1 day ago', timestamp: 1440, priority: 'low', read: true, related: { type: 'Team', label: 'Team members', path: '/team' }, tags: [] },
  { id: 'n11', category: 'billing', icon: 'CreditCard', grad: 'from-amber-500 to-orange-500', title: 'Payment method expiring soon', desc: 'Your Visa card ending 4242 expires in 30 days. Add a new card to avoid disruption.', time: '1 day ago', timestamp: 1500, priority: 'medium', read: false, related: { type: 'Billing', label: 'Payment methods', path: '/billing' }, tags: ['important'] },
  { id: 'n12', category: 'agents', icon: 'Bot', grad: 'from-sky-500 to-cyan-500', title: 'Support Agent escalated', desc: 'Ticket #4821 escalated to a human — customer requested live assistance.', time: '2 days ago', timestamp: 2880, priority: 'medium', read: true, related: { type: 'Agent', label: 'Support Agent', path: '/agents/support' }, tags: ['failures'] },
];

export const CHANNEL_SETTINGS = [
  { key: 'email', label: 'Email', desc: 'Receive notifications by email.', icon: 'Mail', grad: 'from-sky-500 to-cyan-500' },
  { key: 'push', label: 'Push', desc: 'Mobile push notifications.', icon: 'Bell', grad: 'from-violet-500 to-indigo-500' },
  { key: 'desktop', label: 'Desktop', desc: 'Browser desktop notifications.', icon: 'Monitor', grad: 'from-emerald-500 to-teal-500' },
  { key: 'sms', label: 'SMS', desc: 'Text messages for critical alerts.', icon: 'MessageSquare', grad: 'from-amber-500 to-orange-500' },
  { key: 'inapp', label: 'In-App', desc: 'Notifications inside PalladiumAI.', icon: 'LayoutGrid', grad: 'from-fuchsia-500 to-pink-500' },
];

export const OVERVIEW = [
  { label: 'Unread', value: 6, detail: 'across all categories', grad: 'from-violet-500 to-indigo-500', icon: 'Bell' },
  { label: 'Important', value: 5, detail: 'needs attention', grad: 'from-rose-500 to-red-500', icon: 'Star' },
  { label: 'Mentions', value: 1, detail: '@you', grad: 'from-emerald-500 to-teal-500', icon: 'AtSign' },
  { label: 'Failures', value: 2, detail: 'workflows + agents', grad: 'from-amber-500 to-orange-500', icon: 'XCircle' },
];