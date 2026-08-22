import { describe, expect, it } from 'vitest';
import { grantedScopesFromTokenPayload } from './oauth.server';
import { INTEGRATION_PROVIDERS } from './providers';

const provider = (id: string) => {
  const found = INTEGRATION_PROVIDERS.find((item) => item.id === id);
  if (!found) throw new Error(`Missing provider ${id}`);
  return found;
};

describe('provider OAuth token grant normalization', () => {
  it('reads HubSpot scopes arrays from successful token responses', () => {
    expect(grantedScopesFromTokenPayload(provider('hubspot'), {
      access_token: 'secret',
      scopes: ['oauth', 'crm.objects.contacts.read', 'crm.objects.contacts.write'],
    })).toEqual(['oauth', 'crm.objects.contacts.read', 'crm.objects.contacts.write']);
  });

  it('reads standard string scopes separated by spaces or commas', () => {
    expect(grantedScopesFromTokenPayload(provider('google'), {
      access_token: 'secret',
      scope: 'openid email profile',
    })).toEqual(['openid', 'email', 'profile']);
    expect(grantedScopesFromTokenPayload(provider('slack'), {
      access_token: 'secret',
      scope: 'channels:read,chat:write',
    })).toEqual(['channels:read', 'chat:write']);
  });

  it('uses the exact requested scopes for a successful Asana exchange when the response omits scope metadata', () => {
    expect(grantedScopesFromTokenPayload(provider('asana'), {
      access_token: 'secret',
      refresh_token: 'refresh',
      expires_in: 3600,
    })).toEqual(provider('asana').scopes);
  });

  it('does not invent grants for other providers when scope metadata is absent', () => {
    expect(grantedScopesFromTokenPayload(provider('microsoft'), {
      access_token: 'secret',
    })).toEqual([]);
  });
});
