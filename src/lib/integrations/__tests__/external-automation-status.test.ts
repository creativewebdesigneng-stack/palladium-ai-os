import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getExternalAutomationStatus } from '../external-automation-status.server';
import { getWebAutomationCapabilities } from '@/lib/web/web-intelligence.server';

beforeEach(() => {
  vi.stubEnv('BROWSER_USE_API_URL', '');
  vi.stubEnv('BROWSER_USE_API_KEY', '');
  vi.stubEnv('OPENHANDS_SERVER_URL', '');
});
afterEach(() => vi.unstubAllEnvs());

describe('external automation execution availability', () => {
  it('reports missing adapters independently of absent connection settings', () => {
    for (const status of Object.values(getExternalAutomationStatus())) {
      expect(status).toMatchObject({ configured: false, connectionConfigured: false, state: 'adapter_required' });
    }
  });

  it('never advertises executable adapters merely because settings exist', () => {
    vi.stubEnv('BROWSER_USE_API_URL', 'https://browser.example/api');
    vi.stubEnv('BROWSER_USE_API_KEY', 'synthetic-private-key');
    vi.stubEnv('OPENHANDS_SERVER_URL', 'https://coding.example');
    const statuses = getExternalAutomationStatus();
    for (const status of Object.values(statuses)) {
      expect(status).toMatchObject({ configured: false, connectionConfigured: true, state: 'adapter_required' });
    }
    expect(getWebAutomationCapabilities().browserUse).toEqual(statuses.browserUse);
    expect(getWebAutomationCapabilities().openHands).toEqual(statuses.openHands);
    expect(JSON.stringify(statuses)).not.toContain('synthetic-private-key');
    expect(JSON.stringify(statuses)).not.toContain('browser.example');
    expect(JSON.stringify(statuses)).not.toContain('coding.example');
  });

  it.each(['http://worker.example', 'https://user:secret@worker.example', 'https://worker.example?secret=value', 'https://worker.example#secret', 'invalid'])('does not count invalid connection metadata as configured: %s', endpoint => {
    vi.stubEnv('BROWSER_USE_API_URL', endpoint);
    vi.stubEnv('BROWSER_USE_API_KEY', 'synthetic-key');
    vi.stubEnv('OPENHANDS_SERVER_URL', endpoint);
    for (const status of Object.values(getExternalAutomationStatus())) {
      expect(status.connectionConfigured).toBe(false);
      expect(status.configured).toBe(false);
    }
  });

  it('requires a nonempty Browser Use key for connection metadata', () => {
    vi.stubEnv('BROWSER_USE_API_URL', 'https://browser.example');
    vi.stubEnv('BROWSER_USE_API_KEY', ' ');
    expect(getExternalAutomationStatus().browserUse.connectionConfigured).toBe(false);
  });
});
