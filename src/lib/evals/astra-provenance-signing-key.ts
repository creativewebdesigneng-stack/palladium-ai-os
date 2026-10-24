/**
 * A dedicated signing key decouples Astra evaluation provenance from database
 * administrator credentials. Existing deployments retain the historical
 * service-role-key fallback until they explicitly configure a signing key.
 *
 * Rotating the active key invalidates signatures for existing unattested
 * benchmark runs. Plan key rotation together with evaluation re-attestation.
 */
export function resolveAstraProvenanceSigningKey(env: NodeJS.ProcessEnv = process.env): string {
  const dedicated = env['BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY']
  if (dedicated !== undefined) {
    if (Buffer.byteLength(dedicated, 'utf8') < 32 || dedicated.trim() !== dedicated) {
      throw new Error('Astra provenance signing key is invalid: provide a secret of at least 32 bytes without surrounding whitespace.')
    }
    return dedicated
  }
  const legacy = env['SUPABASE_SERVICE_ROLE_KEY']
  if (!legacy) {
    throw new Error('Astra evaluation provenance is unavailable: configure BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY for the server.')
  }
  return legacy
}

/** Configuration-only status; never return signing material to a caller. */
export function hasAstraProvenanceSigningAuthority(env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    resolveAstraProvenanceSigningKey(env)
    return true
  } catch {
    return false
  }
}
