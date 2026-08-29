import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

function configured(...names: string[]) {
  return names.every((name) => Boolean(process.env[name]?.trim()));
}

export const getAutomationProviderStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    browserUse: {
      configured: configured('BROWSER_USE_API_URL', 'BROWSER_USE_API_KEY'),
      label: 'Browser Use',
      detail: 'Optional agent-driven browser provider. PalladiumAI still applies its existing browser session, domain and tool policy layer.',
    },
    openHands: {
      configured: configured('OPENHANDS_SERVER_URL'),
      label: 'OpenHands',
      detail: 'Optional coding-agent server for repository tasks. PalladiumAI remains the authority for approvals, audit, Git control and deployment.',
    },
    coolify: {
      configured: configured('COOLIFY_API_URL', 'COOLIFY_API_TOKEN'),
      label: 'Coolify',
      detail: 'Self-hosted deployment target for application, service and database lifecycle actions.',
    },
    ntfy: {
      configured: Boolean(process.env['NTFY_BASE_URL']?.trim() || process.env['NTFY_TOKEN']?.trim()),
      label: 'ntfy',
      detail: 'HTTP push delivery channel attached to the existing Notifications Centre.',
    },
  }));
