// UI option lists for the Notifications Centre. Actual notification content
// and counts always come from the backend — see src/screens/Notifications.jsx.

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

export const CHANNEL_SETTINGS = [
  { key: 'email', label: 'Email', desc: 'Receive notifications by email.', icon: 'Mail', grad: 'from-sky-500 to-cyan-500' },
  { key: 'push', label: 'Push', desc: 'Mobile push notifications.', icon: 'Bell', grad: 'from-violet-500 to-indigo-500' },
  { key: 'desktop', label: 'Desktop', desc: 'Browser desktop notifications.', icon: 'Monitor', grad: 'from-emerald-500 to-teal-500' },
  { key: 'sms', label: 'SMS', desc: 'Text messages for critical alerts.', icon: 'MessageSquare', grad: 'from-amber-500 to-orange-500' },
  { key: 'inapp', label: 'In-App', desc: 'Notifications inside PalladiumAI.', icon: 'LayoutGrid', grad: 'from-fuchsia-500 to-pink-500' },
];

// Maps a notification's real `kind` field to a display category/icon/tags.
// Unknown kinds fall back to "system" rather than inventing a category.
const KIND_META = {
  agent: { category: 'agents', icon: 'Bot', grad: 'from-sky-500 to-cyan-500' },
  project: { category: 'projects', icon: 'FolderKanban', grad: 'from-indigo-500 to-purple-500' },
  workflow: { category: 'workflows', icon: 'Workflow', grad: 'from-fuchsia-500 to-pink-500' },
  security: { category: 'security', icon: 'ShieldCheck', grad: 'from-rose-500 to-red-500' },
  team: { category: 'team', icon: 'Users', grad: 'from-emerald-500 to-teal-500' },
  billing: { category: 'billing', icon: 'CreditCard', grad: 'from-amber-500 to-orange-500' },
  error: { category: 'system', icon: 'Server', grad: 'from-rose-500 to-red-500' },
  failure: { category: 'system', icon: 'Server', grad: 'from-rose-500 to-red-500' },
  success: { category: 'system', icon: 'Server', grad: 'from-emerald-500 to-teal-500' },
  system: { category: 'system', icon: 'Server', grad: 'from-zinc-500 to-zinc-700' },
};

export function metaForKind(kind) {
  return KIND_META[kind] ?? { category: 'system', icon: 'Server', grad: 'from-zinc-500 to-zinc-700' };
}

export function tagsForKind(kind) {
  const tags = [];
  const k = (kind || '').toLowerCase();
  if (/fail|error/.test(k)) tags.push('failures');
  if (/success|complete/.test(k)) tags.push('success');
  if (/mention/.test(k)) tags.push('mentions');
  if (/security|billing|error|fail/.test(k)) tags.push('important');
  return tags;
}

export function priorityForKind(kind) {
  const k = (kind || '').toLowerCase();
  if (/error|fail|security/.test(k)) return 'critical';
  if (/billing|warning/.test(k)) return 'high';
  if (/success|complete/.test(k)) return 'low';
  return 'medium';
}
