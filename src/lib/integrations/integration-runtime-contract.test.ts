import { describe, expect, it } from 'vitest';
import { CONNECTED_SERVICE_ACTIONS } from './connected-service.server';
import { INTEGRATION_PROVIDERS } from './providers';

describe('integration catalogue runtime contract', () => {
  it('backs every provider advertising connected_service with an executable read adapter', () => {
    const advertised = INTEGRATION_PROVIDERS
      .filter((provider) => provider.tools.includes('connected_service'))
      .map((provider) => provider.id)
      .sort();

    for (const providerId of advertised) {
      expect(CONNECTED_SERVICE_ACTIONS[providerId], `${providerId} is advertised but not executable`).toBeDefined();
      expect(CONNECTED_SERVICE_ACTIONS[providerId]?.length).toBeGreaterThan(0);
    }
  });

  it('exposes Salesforce account and opportunity search through the shared agent connector', () => {
    expect(CONNECTED_SERVICE_ACTIONS['salesforce']).toEqual([
      'accounts_search',
      'opportunities_search',
    ]);
    expect(INTEGRATION_PROVIDERS.find((provider) => provider.id === 'salesforce')?.tools)
      .toContain('connected_service');
  });

  it('does not advertise Discord agent execution before a bounded adapter exists', () => {
    const discord = INTEGRATION_PROVIDERS.find((provider) => provider.id === 'discord');
    expect(discord).toBeDefined();
    expect(discord?.tools).toEqual([]);
    expect(CONNECTED_SERVICE_ACTIONS['discord']).toBeUndefined();
  });
});
