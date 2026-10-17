import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { getExternalAutomationStatus } from './external-automation-status.server';

function configured(...names: string[]) {
  return names.every((name) => Boolean(process.env[name]?.trim()));
}

export const getAutomationProviderStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    ...getExternalAutomationStatus(),
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
