// UI option lists for the Notifications Centre. Actual notification content
// and counts always come from the backend — see src/screens/Notifications.jsx.
import { NOTIFICATION_TYPE_MAP } from '@/lib/notifications/types';

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'Inbox', grad: 'from-violet-500 to-indigo-500' },
  { id: 'agents', label: 'Agents', icon: 'Bot', grad: 'from-sky-500 to-cyan-500' },
  { id: 'workflows', label: 'Workflows', icon: 'Workflow', grad: 'from-fuchsia-500 to-pink-500' },
  { id: 'security', label: 'Security', icon: 'ShieldCheck', grad: 'from-rose-500 to-red-500' },
  { id: 'billing', label: 'Billing', icon: 'CreditCard', grad: 'from-amber-500 to-orange-500' },
  { id: 'system', label: 'System', icon: 'Server', grad: 'from-zinc-500 to-zinc-700' },
];

export const FILTERS = [
  { id: 'unread', label: 'Unread', icon: 'Mail' },
  { id: 'important', label: 'Important', icon: 'Star' },
  { id: 'failures', label: 'Failures', icon: 'XCircle' },
  { id: 'success', label: 'Success', icon: 'CheckCircle2' },
];

// Category presentation, keyed by the catalogue category in
// src/lib/notifications/types.ts.
const CATEGORY_META = {
  agents: { icon: 'Bot', grad: 'from-sky-500 to-cyan-500' },
  workflows: { icon: 'Workflow', grad: 'from-fuchsia-500 to-pink-500' },
  security: { icon: 'ShieldCheck', grad: 'from-rose-500 to-red-500' },
  billing: { icon: 'CreditCard', grad: 'from-amber-500 to-orange-500' },
  system: { icon: 'Server', grad: 'from-zinc-500 to-zinc-700' },
};

/**
 * Resolves a stored notification `kind` to display metadata. Catalogued types
 * win; anything else falls back to its prefix and finally to "system" rather
 * than inventing a category.
 */
export function metaForKind(kind) {
  const def = NOTIFICATION_TYPE_MAP[kind];
  const category = def?.category
    ?? (String(kind || '').split('.')[0] === 'agent' ? 'agents' : null)
    ?? (String(kind || '').split('.')[0] === 'workflow' ? 'workflows' : null)
    ?? 'system';
  const meta = CATEGORY_META[category] ?? CATEGORY_META.system;
  return { category, icon: meta.icon, grad: meta.grad, label: def?.label ?? null };
}

export function tagsForKind(kind, severity) {
  const tags = [];
  const k = (kind || '').toLowerCase();
  const sev = severity || NOTIFICATION_TYPE_MAP[kind]?.severity || 'info';
  if (sev === 'critical' || /fail|error/.test(k)) tags.push('failures');
  if (sev === 'success' || /success|complete/.test(k)) tags.push('success');
  if (sev === 'critical' || sev === 'warning') tags.push('important');
  return tags;
}

export function priorityForKind(kind, severity) {
  const sev = severity || NOTIFICATION_TYPE_MAP[kind]?.severity || 'info';
  if (sev === 'critical') return 'critical';
  if (sev === 'warning') return 'high';
  if (sev === 'success') return 'low';
  return 'medium';
}
