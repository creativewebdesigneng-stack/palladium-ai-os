// Presentation-only maps for the Security Centre.
//
// No security facts live here. Every number, session, key, alert and audit row
// shown in the UI comes from `getSecurityCentre` (src/lib/security/security.functions.ts),
// which reads the caller's own rows under RLS. This module only decides which
// icon and gradient a given server-provided key renders with.
import {
  ShieldCheck,
  MonitorSmartphone,
  KeyRound,
  Plug,
  Bell,
  History,
  Clock,
  Lock,
  Fingerprint,
  Mail,
  Webhook,
  AlertTriangle,
  ShieldAlert,
  Activity,
  Download,
  Trash2,
  Bot,
  BarChart3,
} from 'lucide-react';

export const TABS = [
  'Overview',
  'Security Score',
  'Authentication',
  'Sessions',
  'API Security',
  'Alerts',
  'Audit Log',
  'Privacy',
  'Backup',
];

/** Metric card styling, keyed by the metric key returned by the server. */
export const METRIC_STYLE = {
  score: { icon: ShieldCheck, grad: 'from-emerald-500 to-teal-500' },
  mfa: { icon: Fingerprint, grad: 'from-violet-500 to-indigo-500' },
  keys: { icon: KeyRound, grad: 'from-amber-500 to-orange-500' },
  integrations: { icon: Plug, grad: 'from-fuchsia-500 to-purple-500' },
  webhooks: { icon: Webhook, grad: 'from-sky-500 to-blue-500' },
  alerts: { icon: Bell, grad: 'from-rose-500 to-red-500' },
  audit: { icon: History, grad: 'from-cyan-500 to-sky-500' },
  denied: { icon: ShieldAlert, grad: 'from-rose-500 to-orange-500' },
};

/** Score breakdown styling, keyed by breakdown key. */
export const SCORE_STYLE = {
  mfa: { icon: Fingerprint, grad: 'from-violet-500 to-indigo-500' },
  email: { icon: Mail, grad: 'from-sky-500 to-blue-500' },
  keys: { icon: KeyRound, grad: 'from-amber-500 to-orange-500' },
  integrations: { icon: Plug, grad: 'from-fuchsia-500 to-purple-500' },
  webhooks: { icon: Webhook, grad: 'from-cyan-500 to-sky-500' },
  activity: { icon: Activity, grad: 'from-emerald-500 to-teal-500' },
};

/** Alert and recommendation styling, keyed by the server's `kind`. */
export const KIND_STYLE = {
  denied: { icon: AlertTriangle, grad: 'from-rose-500 to-red-500' },
  integration: { icon: Plug, grad: 'from-fuchsia-500 to-purple-500' },
  key: { icon: KeyRound, grad: 'from-amber-500 to-orange-500' },
  webhook: { icon: Webhook, grad: 'from-sky-500 to-blue-500' },
  mfa: { icon: Fingerprint, grad: 'from-violet-500 to-indigo-500' },
  email: { icon: Mail, grad: 'from-sky-500 to-blue-500' },
  audit: { icon: History, grad: 'from-cyan-500 to-sky-500' },
  session: { icon: MonitorSmartphone, grad: 'from-violet-500 to-indigo-500' },
  default: { icon: ShieldCheck, grad: 'from-zinc-500 to-zinc-600' },
};

export function kindStyle(kind) {
  return KIND_STYLE[kind] || KIND_STYLE.default;
}

/**
 * Privacy controls describe platform behaviour that is enforced server-side
 * (retention, redaction, export). They are documentation, not toggles, until a
 * per-user preference surface exists for each one.
 */
export const PRIVACY = [
  {
    id: 'p1',
    name: 'Data Retention',
    icon: Clock,
    grad: 'from-violet-500 to-indigo-500',
    value: 'Platform policy',
    desc: 'Workspace records are retained while your account is active and removed on deletion.',
  },
  {
    id: 'p2',
    name: 'AI Training',
    icon: Bot,
    grad: 'from-fuchsia-500 to-purple-500',
    value: 'Never',
    desc: 'Your prompts, memories and documents are never used to train shared models.',
  },
  {
    id: 'p3',
    name: 'Sensitive Data Redaction',
    icon: Lock,
    grad: 'from-emerald-500 to-teal-500',
    value: 'Enforced',
    desc: 'Memory writes are redacted server-side before storage; tool payloads are never logged.',
  },
  {
    id: 'p4',
    name: 'Row-Level Isolation',
    icon: ShieldCheck,
    grad: 'from-sky-500 to-blue-500',
    value: 'Enforced',
    desc: 'Every table is protected by row-level security scoped to your account and organisation.',
  },
  {
    id: 'p5',
    name: 'Memory Controls',
    icon: Trash2,
    grad: 'from-rose-500 to-red-500',
    value: 'Self-service',
    desc: 'Review, prune or delete stored memories and documents from the Memory workspace.',
  },
  {
    id: 'p6',
    name: 'Usage Analytics',
    icon: BarChart3,
    grad: 'from-amber-500 to-orange-500',
    value: 'Metadata only',
    desc: 'Only token counts, costs and timings are recorded — never prompt or response content.',
  },
];

export const BACKUP_FACTS = [
  {
    name: 'Managed Database Backups',
    icon: Download,
    grad: 'from-emerald-500 to-teal-500',
    desc: 'The platform database is backed up by the managed cloud provider; restores are operator-initiated.',
  },
  {
    name: 'Export Your Data',
    icon: History,
    grad: 'from-sky-500 to-blue-500',
    desc: 'Agents, tasks, memories and audit records are readable through the Developer API for export.',
  },
  {
    name: 'Encryption',
    icon: Lock,
    grad: 'from-violet-500 to-indigo-500',
    desc: 'Data is encrypted at rest and in transit; integration tokens use AES-256-GCM envelope encryption.',
  },
];
