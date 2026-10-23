import { describe, expect, it } from 'vitest'
import { resolveAstraProvenanceSigningKey } from './astra-provenance-signing-key'

const legacy = 'legacy-service-role-credential'
const dedicated = 'a'.repeat(64)

describe('Astra provenance signing authority', () => {
  it('uses a dedicated high-entropy server-side secret when present', () => {
    expect(resolveAstraProvenanceSigningKey({
      BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY: dedicated,
      SUPABASE_SERVICE_ROLE_KEY: legacy,
    })).toBe(dedicated)
  })

  it('preserves existing signature compatibility for deployments without the new key', () => {
    expect(resolveAstraProvenanceSigningKey({
      SUPABASE_SERVICE_ROLE_KEY: legacy,
    })).toBe(legacy)
  })

  it('permits Preview signing without giving the signer a database administrator key', () => {
    expect(resolveAstraProvenanceSigningKey({
      BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY: dedicated,
    })).toBe(dedicated)
  })

  it('fails closed rather than using a weak dedicated key or silently falling back', () => {
    for (const invalid of ['', 'short', ' '.repeat(40), ' '+dedicated, dedicated+' ']) {
      expect(() => resolveAstraProvenanceSigningKey({
        BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY: invalid,
        SUPABASE_SERVICE_ROLE_KEY: legacy,
      })).toThrow(/signing key is invalid/)
    }
  })

  it('refuses to sign evidence without either server-side secret', () => {
    expect(() => resolveAstraProvenanceSigningKey({})).toThrow(/provenance is unavailable/)
  })
})
