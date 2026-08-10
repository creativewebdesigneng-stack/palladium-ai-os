// Mock system settings for the PalladiumAI Admin System Settings — illustrative, backend-ready.
// Each setting: { id, name, description, value, type, danger? }
// types: text | number | toggle | select | secret

export const SECTIONS = [
  {
    key: 'general',
    label: 'General',
    icon: 'Settings',
    cards: [
      { id: 'platform_name', name: 'Platform Name', description: 'Display name shown across the workspace and emails.', value: 'PalladiumAI', type: 'text' },
      { id: 'support_email', name: 'Support Email', description: 'Address used for outbound support correspondence.', value: 'support@palladium.ai', type: 'text' },
      { id: 'default_locale', name: 'Default Locale', description: 'Fallback locale for new users and guests.', value: 'en-GB', type: 'select', options: ['en-GB', 'en-US', 'fr-FR', 'de-DE', 'es-ES'] },
      { id: 'timezone', name: 'Default Timezone', description: 'Timezone applied to schedules and reports.', value: 'Europe/London', type: 'select', options: ['Europe/London', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney'] },
      { id: 'maintenance_mode', name: 'Maintenance Mode', description: 'Temporarily disable user access during platform upgrades.', value: false, type: 'toggle', danger: true },
    ],
  },
  {
    key: 'ai-providers',
    label: 'AI Providers',
    icon: 'Cpu',
    cards: [
      { id: 'openai_key', name: 'OpenAI API Key', description: 'Credential used for GPT model calls.', value: 'sk-••••••••••4f2a', type: 'secret' },
      { id: 'anthropic_key', name: 'Anthropic API Key', description: 'Credential used for Claude model calls.', value: 'sk-ant-••••••88c1', type: 'secret' },
      { id: 'google_key', name: 'Google AI Key', description: 'Credential used for Gemini model calls.', value: 'AIza••••••2d9', type: 'secret' },
      { id: 'default_provider', name: 'Default Provider', description: 'Provider used when no model is specified.', value: 'OpenAI', type: 'select', options: ['OpenAI', 'Anthropic', 'Google', 'Mistral', 'Meta'] },
      { id: 'fallback_provider', name: 'Fallback Provider', description: 'Used when the default provider is unavailable.', value: 'Anthropic', type: 'select', options: ['None', 'OpenAI', 'Anthropic', 'Google'] },
    ],
  },
  {
    key: 'models',
    label: 'Models',
    icon: 'Brain',
    cards: [
      { id: 'default_model', name: 'Default Model', description: 'Model used for general-purpose completions.', value: 'gpt-5', type: 'select', options: ['gpt-5', 'claude-sonnet-4.6', 'gemini-2.5-pro', 'llama-3.1-405b'] },
      { id: 'max_tokens', name: 'Max Output Tokens', description: 'Upper bound on tokens returned per completion.', value: 4096, type: 'number' },
      { id: 'temperature', name: 'Default Temperature', description: 'Sampling temperature applied to new sessions.', value: 0.7, type: 'number' },
      { id: 'rate_limit', name: 'Per-User Rate Limit', description: 'Max requests per minute per user.', value: 60, type: 'number' },
      { id: 'allow_local', name: 'Allow Local Models', description: 'Permit self-hosted models in the workspace.', value: true, type: 'toggle' },
    ],
  },
  {
    key: 'email',
    label: 'Email',
    icon: 'Mail',
    cards: [
      { id: 'smtp_host', name: 'SMTP Host', description: 'Outbound mail relay hostname.', value: 'smtp.palladium.ai', type: 'text' },
      { id: 'smtp_port', name: 'SMTP Port', description: 'TLS port for outbound mail.', value: 587, type: 'number' },
      { id: 'smtp_user', name: 'SMTP Username', description: 'Authenticated relay account.', value: 'postmaster@palladium.ai', type: 'text' },
      { id: 'from_name', name: 'From Name', description: 'Sender display name for platform emails.', value: 'PalladiumAI', type: 'text' },
      { id: 'digest_enabled', name: 'Weekly Digest', description: 'Send a weekly activity digest to admins.', value: true, type: 'toggle' },
    ],
  },
  {
    key: 'storage',
    label: 'Storage',
    icon: 'HardDrive',
    cards: [
      { id: 'storage_provider', name: 'Storage Provider', description: 'Backend used for file uploads and assets.', value: 'S3', type: 'select', options: ['S3', 'GCS', 'Azure Blob', 'Local'] },
      { id: 'bucket', name: 'Bucket Name', description: 'Primary object storage bucket.', value: 'palladium-assets-prod', type: 'text' },
      { id: 'region', name: 'Storage Region', description: 'Region where assets are persisted.', value: 'eu-west-1', type: 'select', options: ['eu-west-1', 'us-east-1', 'ap-southeast-1'] },
      { id: 'retention_days', name: 'Retention (days)', description: 'Days before orphaned files are purged.', value: 90, type: 'number' },
      { id: 'encryption', name: 'Encryption at Rest', description: 'Encrypt stored assets with AES-256.', value: true, type: 'toggle' },
    ],
  },
  {
    key: 'security',
    label: 'Security',
    icon: 'ShieldCheck',
    cards: [
      { id: 'mfa_required', name: 'Require MFA', description: 'Force multi-factor auth for all members.', value: true, type: 'toggle' },
      { id: 'sso_enabled', name: 'SSO / SAML', description: 'Enable single sign-on for enterprise orgs.', value: true, type: 'toggle' },
      { id: 'session_timeout', name: 'Session Timeout (min)', description: 'Idle minutes before a session expires.', value: 30, type: 'number' },
      { id: 'ip_allowlist', name: 'IP Allowlist', description: 'Restrict admin access to approved IP ranges.', value: '0.0.0.0/0', type: 'text', danger: true },
      { id: 'data_residency', name: 'Data Residency', description: 'Region where customer data is stored.', value: 'EU', type: 'select', options: ['EU', 'US', 'APAC', 'Global'] },
    ],
  },
  {
    key: 'billing',
    label: 'Billing',
    icon: 'CreditCard',
    cards: [
      { id: 'currency', name: 'Default Currency', description: 'Currency for invoices and pricing.', value: 'USD', type: 'select', options: ['USD', 'EUR', 'GBP', 'JPY'] },
      { id: 'tax_rate', name: 'Default Tax Rate (%)', description: 'Applied to invoiced amounts where applicable.', value: 20, type: 'number' },
      { id: 'grace_days', name: 'Grace Period (days)', description: 'Days before a past-due subscription is suspended.', value: 7, type: 'number' },
      { id: 'auto_invoice', name: 'Auto-Invoice', description: 'Generate invoices automatically on renewal.', value: true, type: 'toggle' },
      { id: 'trial_length', name: 'Trial Length (days)', description: 'Default trial duration for new sign-ups.', value: 14, type: 'number' },
    ],
  },
  {
    key: 'integrations',
    label: 'Integrations',
    icon: 'Plug',
    cards: [
      { id: 'webhooks_enabled', name: 'Outbound Webhooks', description: 'Allow integrations to receive event webhooks.', value: true, type: 'toggle' },
      { id: 'slack_default', name: 'Default Slack Workspace', description: 'Workspace used for platform notifications.', value: 'palladium-main', type: 'text' },
      { id: 'github_org', name: 'Default GitHub Org', description: 'Organisation for synced repositories.', value: 'palladium-ai', type: 'text' },
      { id: 'max_integrations', name: 'Max Integrations / Org', description: 'Cap on connected integrations per organisation.', value: 25, type: 'number' },
    ],
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: 'Bell',
    cards: [
      { id: 'notify_deploy', name: 'Deploy Notifications', description: 'Notify owners when agents are deployed.', value: true, type: 'toggle' },
      { id: 'notify_errors', name: 'Error Alerts', description: 'Alert admins on critical platform errors.', value: true, type: 'toggle' },
      { id: 'notify_billing', name: 'Billing Alerts', description: 'Notify on failed payments and renewals.', value: true, type: 'toggle' },
      { id: 'quiet_hours', name: 'Quiet Hours', description: 'Suppress non-critical alerts during these hours.', value: '22:00-07:00', type: 'text' },
      { id: 'digest_frequency', name: 'Digest Frequency', description: 'How often admin digests are sent.', value: 'Weekly', type: 'select', options: ['Daily', 'Weekly', 'Monthly'] },
    ],
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    icon: 'Wrench',
    cards: [
      { id: 'backup_schedule', name: 'Backup Schedule', description: 'Cron cadence for automated backups.', value: 'Daily 02:00 UTC', type: 'text' },
      { id: 'backup_retention', name: 'Backup Retention (days)', description: 'Days before backups are rotated.', value: 30, type: 'number' },
      { id: 'cache_flush', name: 'Flush Cache', description: 'Clear the platform response cache immediately.', value: false, type: 'toggle', danger: true },
      { id: 'reindex', name: 'Reindex Search', description: 'Rebuild the search index for all entities.', value: false, type: 'toggle', danger: true },
      { id: 'purge_logs', name: 'Purge Old Logs', description: 'Delete audit logs older than retention window.', value: false, type: 'toggle', danger: true },
    ],
  },
];