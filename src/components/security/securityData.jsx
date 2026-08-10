import {
  ShieldCheck, MonitorSmartphone, Laptop, Monitor, Smartphone, Tablet,
  KeyRound, Plug, Bell, History, Clock, Lock, Fingerprint, ScanFace,
  RefreshCw, Database, Download, Trash2, Activity, AlertTriangle, Bot,
  Globe, ShieldAlert, BarChart3,
} from 'lucide-react';

export const OVERVIEW = [
  { label: 'Security Score', value: '86', detail: 'Good', grad: 'from-emerald-500 to-teal-500', icon: ShieldCheck, trend: [70, 74, 78, 80, 82, 84, 85, 86] },
  { label: 'Active Sessions', value: '7', detail: '2 suspicious', grad: 'from-sky-500 to-blue-500', icon: MonitorSmartphone, trend: [3, 4, 5, 5, 6, 6, 7, 7] },
  { label: 'Connected Devices', value: '5', detail: '3 trusted', grad: 'from-violet-500 to-indigo-500', icon: Laptop, trend: [2, 3, 3, 4, 4, 5, 5, 5] },
  { label: 'API Keys', value: '12', detail: '2 expiring', grad: 'from-amber-500 to-orange-500', icon: KeyRound, trend: [6, 7, 8, 9, 10, 11, 12, 12] },
  { label: 'Active Integrations', value: '9', detail: 'All reviewed', grad: 'from-fuchsia-500 to-purple-500', icon: Plug, trend: [3, 4, 5, 6, 7, 8, 9, 9] },
  { label: 'Security Alerts', value: '3', detail: '1 critical', grad: 'from-rose-500 to-red-500', icon: Bell, trend: [1, 2, 2, 3, 3, 2, 3, 3] },
  { label: 'Audit Events', value: '1,284', detail: 'last 30 days', grad: 'from-cyan-500 to-sky-500', icon: History, trend: [800, 880, 940, 1020, 1100, 1160, 1220, 1284] },
  { label: 'Last Security Check', value: '4h ago', detail: 'Passed', grad: 'from-emerald-500 to-teal-500', icon: Clock, trend: [2, 2, 3, 3, 4, 4, 4, 4] },
];

export const SCORE_BREAKDOWN = [
  { label: 'Password Security', value: 92, grad: 'from-emerald-500 to-teal-500', icon: Lock, note: 'Strong · last changed 21 days ago' },
  { label: 'MFA', value: 100, grad: 'from-violet-500 to-indigo-500', icon: Fingerprint, note: 'Authenticator + passkey enabled' },
  { label: 'Sessions', value: 78, grad: 'from-amber-500 to-orange-500', icon: MonitorSmartphone, note: '2 sessions inactive > 14 days' },
  { label: 'API Security', value: 84, grad: 'from-sky-500 to-blue-500', icon: KeyRound, note: '2 keys expire within 7 days' },
  { label: 'Integration Security', value: 80, grad: 'from-fuchsia-500 to-purple-500', icon: Plug, note: '1 integration needs re-auth' },
  { label: 'Organisation Security', value: 82, grad: 'from-cyan-500 to-sky-500', icon: ShieldCheck, note: 'SSO enforced for admins' },
];

export const AUTH_METHODS = [
  { id: 'pwd', name: 'Password', icon: Lock, grad: 'from-emerald-500 to-teal-500', status: 'enabled', desc: 'Last changed 21 days ago · strength: strong', actions: ['Change'] },
  { id: 'mfa', name: 'Two-Factor Authentication', icon: ShieldCheck, grad: 'from-violet-500 to-indigo-500', status: 'enabled', desc: 'SMS + authenticator app active', actions: ['Manage'] },
  { id: 'auth', name: 'Authenticator App', icon: Smartphone, grad: 'from-sky-500 to-blue-500', status: 'enabled', desc: 'Google Authenticator · 2 backup codes', actions: ['Reconfigure'] },
  { id: 'recovery', name: 'Recovery Codes', icon: KeyRound, grad: 'from-amber-500 to-orange-500', status: 'enabled', desc: '8 of 10 codes remaining', actions: ['Download', 'Regenerate'] },
  { id: 'passkey', name: 'Passkeys', icon: ScanFace, grad: 'from-fuchsia-500 to-purple-500', status: 'enabled', desc: '2 passkeys registered (Touch ID, YubiKey)', actions: ['Manage'] },
  { id: 'sso', name: 'Single Sign-On', icon: Globe, grad: 'from-cyan-500 to-sky-500', status: 'enabled', desc: 'Google Workspace · enforced for admins', actions: ['Configure'] },
];

export const SESSIONS = [
  { id: 's1', device: 'MacBook Pro 16"', icon: Laptop, browser: 'Chrome 126', os: 'macOS Sonoma', location: 'London, UK', ip: '82.14.220.91', lastActive: 'Current session', current: true, grad: 'from-violet-500 to-indigo-500' },
  { id: 's2', device: 'iPhone 15 Pro', icon: Smartphone, browser: 'Safari Mobile', os: 'iOS 17.5', location: 'London, UK', ip: '82.14.220.91', lastActive: '12 min ago', current: false, grad: 'from-sky-500 to-blue-500' },
  { id: 's3', device: 'Windows Desktop', icon: Monitor, browser: 'Edge 126', os: 'Windows 11', location: 'Manchester, UK', ip: '92.40.198.17', lastActive: '3 hr ago', current: false, grad: 'from-emerald-500 to-teal-500' },
  { id: 's4', device: 'iPad Air', icon: Tablet, browser: 'Safari', os: 'iPadOS 17', location: 'London, UK', ip: '82.14.220.91', lastActive: '1 day ago', current: false, grad: 'from-amber-500 to-orange-500' },
  { id: 's5', device: 'Chromebook', icon: Laptop, browser: 'Chrome 125', os: 'ChromeOS', location: 'Edinburgh, UK', ip: '51.6.44.210', lastActive: '3 days ago', current: false, grad: 'from-fuchsia-500 to-purple-500' },
  { id: 's6', device: 'Unknown Device', icon: Monitor, browser: 'Firefox 124', os: 'Linux', location: 'Frankfurt, DE', ip: '193.99.144.85', lastActive: '5 days ago', current: false, suspicious: true, grad: 'from-rose-500 to-red-500' },
  { id: 's7', device: 'Android Phone', icon: Smartphone, browser: 'Chrome Mobile', os: 'Android 14', location: 'Birmingham, UK', ip: '86.132.11.40', lastActive: '14 days ago', current: false, suspicious: true, grad: 'from-cyan-500 to-sky-500' },
];

export const API_SECURITY = {
  keys: [
    { id: 'k1', name: 'Production Server', prefix: 'pk_live_••••••••', created: 'Jan 12, 2026', lastUsed: '2 min ago', scope: 'Full access', status: 'active' },
    { id: 'k2', name: 'Analytics Pipeline', prefix: 'pk_live_••••••••', created: 'Feb 03, 2026', lastUsed: '1 hr ago', scope: 'Read only', status: 'active' },
    { id: 'k3', name: 'Mobile App', prefix: 'pk_live_••••••••', created: 'Mar 19, 2026', lastUsed: '4 hr ago', scope: 'Scoped', status: 'active' },
    { id: 'k4', name: 'Webhook Signer', prefix: 'pk_test_••••••••', created: 'Apr 28, 2026', lastUsed: '2 days ago', scope: 'Webhooks', status: 'expiring' },
    { id: 'k5', name: 'Legacy CLI', prefix: 'pk_test_••••••••', created: 'Nov 02, 2025', lastUsed: '12 days ago', scope: 'Full access', status: 'expiring' },
  ],
  tokens: [
    { id: 't1', name: 'CI Deploy Token', prefix: 'tok_••••••••••••', scope: 'Deploy', expires: 'in 30 days', status: 'active' },
    { id: 't2', name: 'Reporting Token', prefix: 'tok_••••••••••••', scope: 'Read', expires: 'in 90 days', status: 'active' },
  ],
  oauth: [
    { id: 'o1', name: 'Google Workspace', prefix: 'ya29.••••••••••', scope: 'email, profile, drive', status: 'connected' },
    { id: 'o2', name: 'GitHub', prefix: 'gho_••••••••••', scope: 'repo, workflow', status: 'connected' },
    { id: 'o3', name: 'Slack', prefix: 'xoxb-••••••••', scope: 'channels, chat', status: 'needs_reauth' },
  ],
  webhooks: [
    { id: 'w1', name: 'Payment Events', url: 'https://hooks.palladiumai.com/pay', status: 'active', events: 1240 },
    { id: 'w2', name: 'Agent Status', url: 'https://hooks.palladiumai.com/agents', status: 'active', events: 8420 },
  ],
  serviceAccounts: [
    { id: 'sa1', name: 'data-pipeline', prefix: 'svc_••••••••••', role: 'Developer', status: 'active' },
    { id: 'sa2', name: 'audit-sync', prefix: 'svc_••••••••••', role: 'Analyst', status: 'active' },
  ],
};

export const ALERTS = [
  { id: 'al1', title: 'New login detected', detail: 'MacBook Pro · London, UK · Chrome 126', severity: 'info', icon: Monitor, grad: 'from-sky-500 to-blue-500', time: '12 min ago' },
  { id: 'al2', title: 'API key created', detail: 'pk_live_•••• created by Maya Chen', severity: 'info', icon: KeyRound, grad: 'from-violet-500 to-indigo-500', time: '1 hr ago' },
  { id: 'al3', title: 'Unusual activity detected', detail: 'Login from Frankfurt, DE · new location', severity: 'critical', icon: AlertTriangle, grad: 'from-rose-500 to-red-500', time: '5 hr ago' },
  { id: 'al4', title: 'Integration permission changed', detail: 'Slack connector scopes updated', severity: 'warning', icon: Plug, grad: 'from-amber-500 to-orange-500', time: '8 hr ago' },
  { id: 'al5', title: 'Failed authentication attempt', detail: '3 failed 2FA attempts on account', severity: 'warning', icon: ShieldAlert, grad: 'from-amber-500 to-orange-500', time: '1 day ago' },
];

export const AUDIT = [
  { id: 'au1', user: 'Maya Chen', action: 'login', resource: 'Dashboard', ip: '82.14.220.91', time: 'Aug 7, 09:44', result: 'success' },
  { id: 'au2', user: 'Liam Patel', action: 'api_key.create', resource: 'pk_live_••••', ip: '82.14.220.91', time: 'Aug 7, 08:51', result: 'success' },
  { id: 'au3', user: 'Sofia Rossi', action: 'integration.update', resource: 'Slack connector', ip: '92.40.198.17', time: 'Aug 7, 07:30', result: 'success' },
  { id: 'au4', user: 'unknown', action: 'login', resource: '—', ip: '193.99.144.85', time: 'Aug 6, 23:12', result: 'failed' },
  { id: 'au5', user: 'Zara Ali', action: 'role.update', resource: 'Analyst → Export Data', ip: '51.6.44.210', time: 'Aug 6, 18:05', result: 'success' },
  { id: 'au6', user: 'Kai Owens', action: 'session.revoke', resource: 's7 · Android Phone', ip: '86.132.11.40', time: 'Aug 6, 15:22', result: 'success' },
  { id: 'au7', user: 'Maya Chen', action: 'settings.update', resource: 'Org SSO enforcement', ip: '82.14.220.91', time: 'Aug 6, 11:10', result: 'success' },
  { id: 'au8', user: 'Ethan Costa', action: 'webhook.create', resource: 'Agent Status', ip: '82.14.220.91', time: 'Aug 5, 16:48', result: 'success' },
];

export const PRIVACY = [
  { id: 'p1', name: 'Data Retention', icon: Clock, grad: 'from-violet-500 to-indigo-500', value: '90 days', desc: 'Workspace data retained for 90 days after deletion', enabled: true },
  { id: 'p2', name: 'AI Training Preferences', icon: Bot, grad: 'from-fuchsia-500 to-purple-500', value: 'Opted out', desc: 'Your data is not used to train shared models', enabled: false },
  { id: 'p3', name: 'Data Export', icon: Download, grad: 'from-sky-500 to-blue-500', value: 'On demand', desc: 'Export all workspace data as JSON / CSV', enabled: true },
  { id: 'p4', name: 'Data Deletion', icon: Trash2, grad: 'from-rose-500 to-red-500', value: 'Manual', desc: 'Permanently delete account and all records', enabled: false },
  { id: 'p5', name: 'Activity Tracking', icon: Activity, grad: 'from-amber-500 to-orange-500', value: 'Anonymised', desc: 'Usage analytics anonymised before storage', enabled: true },
  { id: 'p6', name: 'Analytics Preferences', icon: BarChart3, grad: 'from-emerald-500 to-teal-500', value: 'Essential only', desc: 'Only essential product analytics collected', enabled: true },
];

export const BACKUP = {
  lastBackup: 'Aug 7, 2026 · 03:00',
  status: 'Healthy',
  size: '4.8 GB',
  frequency: 'Daily · 03:00 UTC',
  storage: 'Encrypted · EU-West region',
  options: [
    { name: 'Full Restore', icon: RefreshCw, grad: 'from-emerald-500 to-teal-500', desc: 'Restore entire workspace from snapshot' },
    { name: 'Partial Restore', icon: Database, grad: 'from-sky-500 to-blue-500', desc: 'Restore selected entities or files' },
    { name: 'Point-in-Time', icon: Clock, grad: 'from-violet-500 to-indigo-500', desc: 'Restore to a specific timestamp (last 30 days)' },
  ],
};

export const RECOMMENDATIONS = [
  { id: 'r1', title: 'Enable MFA for all members', icon: Fingerprint, grad: 'from-violet-500 to-indigo-500', impact: 'High', detail: '12 members still rely on password-only auth', action: 'Enforce MFA' },
  { id: 'r2', title: 'Remove unused API keys', icon: KeyRound, grad: 'from-amber-500 to-orange-500', impact: 'Medium', detail: '2 keys unused for 12+ days', action: 'Review' },
  { id: 'r3', title: 'Review connected integrations', icon: Plug, grad: 'from-fuchsia-500 to-purple-500', impact: 'Medium', detail: 'Slack connector needs re-authorisation', action: 'Review' },
  { id: 'r4', title: 'Sign out old sessions', icon: MonitorSmartphone, grad: 'from-sky-500 to-blue-500', impact: 'Low', detail: '2 sessions inactive for 5+ days', action: 'Sign out' },
  { id: 'r5', title: 'Rotate recovery codes', icon: KeyRound, grad: 'from-rose-500 to-red-500', impact: 'Medium', detail: 'Codes last regenerated 6 months ago', action: 'Regenerate' },
];

export const RIGHT_SIDEBAR = {
  alerts: ALERTS.slice(0, 3),
  usage: { total: '86', delta: '+4 pts', trend: [70, 74, 78, 80, 82, 84, 85, 86] },
  recent: [
    { who: 'Maya Chen', target: 'enabled SSO enforcement', icon: ShieldCheck, grad: 'from-violet-500 to-indigo-500', time: '2h' },
    { who: 'Kai Owens', target: 'revoked a suspicious session', icon: MonitorSmartphone, grad: 'from-sky-500 to-blue-500', time: '8h' },
    { who: 'Liam Patel', target: 'created an API key', icon: KeyRound, grad: 'from-amber-500 to-orange-500', time: '1h' },
    { who: 'Sofia Rossi', target: 'updated Slack scopes', icon: Plug, grad: 'from-fuchsia-500 to-purple-500', time: '7h' },
  ],
  quickActions: [
    { icon: Fingerprint, grad: 'from-violet-500 to-indigo-500', label: 'Enable MFA' },
    { icon: KeyRound, grad: 'from-amber-500 to-orange-500', label: 'New Key' },
    { icon: MonitorSmartphone, grad: 'from-sky-500 to-blue-500', label: 'Sessions' },
    { icon: Download, grad: 'from-emerald-500 to-teal-500', label: 'Export' },
  ],
};

export const TABS = ['Overview', 'Security Score', 'Authentication', 'Sessions', 'API Security', 'Alerts', 'Audit Log', 'Privacy', 'Backup'];