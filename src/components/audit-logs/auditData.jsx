// Mock audit log entries for the PalladiumAI Admin Audit Logs — illustrative, backend-ready.

export const AUDIT_EVENTS = [
  { id: 'AUD-20482', timestamp: '2026-08-07T12:28:00', user: 'maya@palladium.ai', org: 'Palladium Studio', action: 'agent.deploy', resource: 'Agent: Atlas Research v2.4', ip: '104.28.12.90', result: 'success', meta: { version: '2.4.1', environment: 'production', model: 'Claude Sonnet 4.6', tokens: 18420 } },
  { id: 'AUD-20481', timestamp: '2026-08-07T12:24:11', user: 'admin@palladium.ai', org: 'Palladium Studio', action: 'user.role.update', resource: 'User: leo@brightlabs.io', ip: '104.28.12.90', result: 'success', meta: { from: 'user', to: 'admin', actor: 'admin@palladium.ai' } },
  { id: 'AUD-20480', timestamp: '2026-08-07T12:18:42', user: 'service-bot', org: 'Acme Corp', action: 'api.key.rotate', resource: 'API key k_live_4f2', ip: '198.51.100.7', result: 'success', meta: { expires: '2026-11-07', scopes: ['read', 'write'] } },
  { id: 'AUD-20479', timestamp: '2026-08-07T12:14:03', user: 'noah@hooli.com', org: 'Hooli', action: 'billing.plan.upgrade', resource: 'Subscription #SUB-9921', ip: '192.0.2.50', result: 'success', meta: { from: 'Pro', to: 'Enterprise', amount: 2400, currency: 'USD' } },
  { id: 'AUD-20478', timestamp: '2026-08-07T12:09:55', user: 'unknown', org: 'Globex', action: 'auth.login', resource: 'Session', ip: '203.0.113.44', result: 'failure', meta: { reason: 'invalid_password', attempts: 6 } },
  { id: 'AUD-20477', timestamp: '2026-08-07T12:05:20', user: 'maya@palladium.ai', org: 'Palladium Studio', action: 'workflow.create', resource: 'Workflow: Inbound Router', ip: '104.28.12.90', result: 'success', meta: { nodes: 7, trigger: 'webhook' } },
  { id: 'AUD-20476', timestamp: '2026-08-07T11:58:14', user: 'leo@brightlabs.io', org: 'Bright Labs', action: 'file.upload', resource: 'File: quarterly-brief.pdf', ip: '192.0.2.88', result: 'success', meta: { size: 4820000, mime: 'application/pdf' } },
  { id: 'AUD-20475', timestamp: '2026-08-07T11:51:33', user: 'admin@palladium.ai', org: 'Palladium Studio', action: 'org.member.invite', resource: 'Invite: dev@acme.com', ip: '104.28.12.90', result: 'success', meta: { role: 'user', team: 'Engineering' } },
  { id: 'AUD-20474', timestamp: '2026-08-07T11:44:09', user: 'service-bot', org: 'Initech', action: 'integration.connect', resource: 'Slack Bot', ip: '198.51.100.7', result: 'success', meta: { workspace: 'initech-main', channel: '#ai-alerts' } },
  { id: 'AUD-20473', timestamp: '2026-08-07T11:38:51', user: 'maya@palladium.ai', org: 'Palladium Studio', action: 'model.default.set', resource: 'Model: Gemini 2.5 Pro', ip: '104.28.12.90', result: 'success', meta: { previous: 'GPT-5', scope: 'workspace' } },
  { id: 'AUD-20472', timestamp: '2026-08-07T11:30:02', user: 'unknown', org: 'Globex', action: 'auth.login', resource: 'Session', ip: '203.0.113.44', result: 'failure', meta: { reason: 'mfa_challenge_failed', attempts: 3 } },
  { id: 'AUD-20471', timestamp: '2026-08-07T11:24:18', user: 'noah@hooli.com', org: 'Hooli', action: 'billing.invoice.paid', resource: 'Invoice #PI-2048', ip: '192.0.2.50', result: 'success', meta: { amount: 1200, method: 'card_4242' } },
  { id: 'AUD-20470', timestamp: '2026-08-07T11:18:40', user: 'admin@palladium.ai', org: 'Palladium Studio', action: 'security.policy.update', resource: 'Policy: MFA enforcement', ip: '104.28.12.90', result: 'success', meta: { required: true, scope: 'all_members' } },
  { id: 'AUD-20469', timestamp: '2026-08-07T11:10:27', user: 'leo@brightlabs.io', org: 'Bright Labs', action: 'agent.delete', resource: 'Agent: Legacy Bot', ip: '192.0.2.88', result: 'failure', meta: { reason: 'permission_denied', required: 'admin' } },
  { id: 'AUD-20468', timestamp: '2026-08-07T11:04:55', user: 'maya@palladium.ai', org: 'Palladium Studio', action: 'knowledge.add', resource: 'Source: product-docs.md', ip: '104.28.12.90', result: 'success', meta: { chunks: 128, embeddings: 128 } },
];

export const FILTER_OPTIONS = {
  user: ['All', 'maya@palladium.ai', 'admin@palladium.ai', 'service-bot', 'noah@hooli.com', 'leo@brightlabs.io', 'unknown'],
  org: ['All', 'Palladium Studio', 'Acme Corp', 'Globex', 'Hooli', 'Bright Labs', 'Initech'],
  action: ['All', 'auth.login', 'agent.deploy', 'agent.delete', 'user.role.update', 'api.key.rotate', 'billing.plan.upgrade', 'billing.invoice.paid', 'workflow.create', 'file.upload', 'org.member.invite', 'integration.connect', 'model.default.set', 'security.policy.update', 'knowledge.add'],
  resource: ['All', 'Session', 'Agent', 'User', 'API key', 'Subscription', 'Workflow', 'File', 'Invite', 'Slack Bot', 'Model', 'Invoice', 'Policy', 'Source'],
  result: ['All', 'success', 'failure'],
};