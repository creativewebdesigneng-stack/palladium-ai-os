import { providerEndpoint } from '@/lib/security/provider-http.server';

/** Connection metadata is not an executable adapter or a successful health check. */
export function getExternalAutomationStatus() {
  return {
    browserUse: {
      label: 'Browser Use',
      configured: false,
      state: 'adapter_required' as const,
      connectionConfigured: Boolean(providerEndpoint(process.env['BROWSER_USE_API_URL']) && process.env['BROWSER_USE_API_KEY']?.trim()),
      detail: 'Browser Use execution requires a deployed and verified adapter. Connection settings alone do not enable browser tasks. Blackstar browser sessions, domain restrictions, approvals and audit remain required.',
    },
    openHands: {
      label: 'OpenHands',
      configured: false,
      state: 'adapter_required' as const,
      connectionConfigured: Boolean(providerEndpoint(process.env['OPENHANDS_SERVER_URL'])),
      detail: 'OpenHands execution requires a deployed and verified adapter. Saved remote-session references do not run coding tasks. Blackstar Git, terminal, approval and deployment controls remain required.',
    },
  };
}
