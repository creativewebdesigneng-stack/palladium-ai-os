// Mock data for the PalladiumAI Admin Security Dashboard — illustrative, backend-ready.

export const SECURITY_SCORE = { score: 86, label: 'Strong', trend: '+4', detail: 'Improved after MFA enforcement policy' };

export const METRICS = [
  { label: 'Threats', value: '3', detail: '1 critical, 2 medium', icon: 'shield', tone: 'rose' },
  { label: 'Suspicious Activity', value: '18', detail: 'Last 24 hours', icon: 'eye', tone: 'amber' },
  { label: 'Failed Logins', value: '142', detail: '-12% vs last week', icon: 'lock', tone: 'amber' },
  { label: 'API Abuse', value: '7', detail: '2 keys flagged', icon: 'key', tone: 'rose' },
  { label: 'Blocked Requests', value: '2,480', detail: 'Auto-blocked by WAF', icon: 'ban', tone: 'violet' },
  { label: 'Active Sessions', value: '312', detail: 'Across 48 regions', icon: 'users', tone: 'emerald' },
];

export const SECURITY_EVENTS = [
  { id: 'EVT-1042', type: 'Brute force attempt', severity: 'critical', source: '203.0.113.44', target: 'admin@palladium.ai', time: '2 min ago', status: 'open' },
  { id: 'EVT-1041', type: 'Privilege escalation', severity: 'high', source: '198.51.100.7', target: 'service-bot', time: '14 min ago', status: 'investigating' },
  { id: 'EVT-1040', type: 'Unusual download volume', severity: 'medium', source: '192.0.2.88', target: 'maya@acme.com', time: '38 min ago', status: 'open' },
  { id: 'EVT-1039', type: 'Malware signature', severity: 'high', source: '203.0.113.9', target: 'upload-endpoint', time: '1 hr ago', status: 'blocked' },
  { id: 'EVT-1038', type: 'Rate limit breach', severity: 'medium', source: '198.51.100.21', target: 'API key k_live_4f2', time: '2 hr ago', status: 'resolved' },
];

export const IP_ACTIVITY = [
  { ip: '203.0.113.44', region: 'Unknown (VPN)', requests: 1842, risk: 'high', lastSeen: '2 min ago', blocked: false },
  { ip: '198.51.100.7', region: 'Frankfurt, DE', requests: 612, risk: 'high', lastSeen: '14 min ago', blocked: false },
  { ip: '192.0.2.88', region: 'London, UK', requests: 421, risk: 'medium', lastSeen: '38 min ago', blocked: false },
  { ip: '203.0.113.9', region: 'Singapore, SG', requests: 308, risk: 'high', lastSeen: '1 hr ago', blocked: true },
  { ip: '104.28.12.90', region: 'Ashburn, US', requests: 1204, risk: 'low', lastSeen: '4 hr ago', blocked: false },
  { ip: '91.214.5.17', region: 'Lagos, NG', requests: 88, risk: 'low', lastSeen: '6 hr ago', blocked: false },
];

export const AUTH_ACTIVITY = [
  { user: 'maya@palladium.ai', event: 'Login success', method: 'Email + MFA', ip: '104.28.12.90', time: '3 min ago', status: 'ok' },
  { user: 'admin@palladium.ai', event: 'Failed login', method: 'Password', ip: '203.0.113.44', time: '2 min ago', status: 'fail' },
  { user: 'service-bot', event: 'Token revoked', method: 'API key', ip: '198.51.100.7', time: '14 min ago', status: 'warn' },
  { user: 'leo@brightlabs.io', event: 'New device login', method: 'Google OAuth', ip: '192.0.2.50', time: '22 min ago', status: 'ok' },
  { user: 'noah@hooli.com', event: 'MFA challenge', method: 'TOTP', ip: '104.28.12.90', time: '35 min ago', status: 'ok' },
  { user: 'admin@palladium.ai', event: 'Login success', method: 'Password + MFA', ip: '104.28.12.90', time: '52 min ago', status: 'ok' },
];

export const ALERTS = [
  { id: 'AL-201', title: 'Critical: brute force on admin account', tone: 'critical', time: '2 min ago', status: 'open' },
  { id: 'AL-200', title: 'High: privilege escalation attempt on service-bot', tone: 'high', time: '14 min ago', status: 'investigating' },
  { id: 'AL-199', title: 'Medium: bulk data download by maya@acme.com', tone: 'medium', time: '38 min ago', status: 'open' },
  { id: 'AL-198', title: 'Resolved: malware upload blocked at edge', tone: 'low', time: '1 hr ago', status: 'resolved' },
  { id: 'AL-197', title: 'Resolved: rate limit enforced on k_live_4f2', tone: 'low', time: '2 hr ago', status: 'resolved' },
];

export const SCORE_BREAKDOWN = [
  { label: 'MFA coverage', value: 94 },
  { label: 'Password strength', value: 88 },
  { label: 'API key hygiene', value: 79 },
  { label: 'Network posture', value: 82 },
  { label: 'Audit completeness', value: 90 },
];