export const FREELLM_VERIFICATION_MARKER = 'BLACKSTAR_FREELLM_OK'
export const FREELLM_VERIFICATION_TIMEOUT_MS = 30_000
export const FREELLM_VERIFICATION_MAX_TOKENS = 96

export function freeLlmVerificationPrompt(): string {
  return `Reply with exactly ${FREELLM_VERIFICATION_MARKER}`
}

export function isFreeLlmVerificationMarker(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const clean = value
    .replace(/<think>[\s\S]*?<\/think>/gi, ' ')
    .replace(/```(?:text)?/gi, ' ')
    .replace(/```/g, ' ')
    .trim()
  return new RegExp(`(^|[^A-Za-z0-9_])${FREELLM_VERIFICATION_MARKER}([^A-Za-z0-9_]|$)`).test(clean)
}
