export type AstraCertificationJudge = {
  provider: 'groq' | 'openai'
  model: string
  label: string
}

export const ASTRA_CERTIFICATION_JUDGES: readonly AstraCertificationJudge[] = [
  { provider: 'groq', model: 'openai/gpt-oss-20b', label: 'Groq · GPT-OSS 20B' },
  { provider: 'openai', model: 'gpt-5-mini', label: 'OpenAI · GPT-5 mini' },
] as const

export function isPinnedFreeLlmCertificationModel(model: unknown): model is string {
  if (typeof model !== 'string') return false
  const clean = model.trim()
  if (!clean) return false
  const lower = clean.toLowerCase()
  return lower !== 'auto' && !lower.startsWith('auto:') && lower !== 'fusion'
}

function configuredFreeLlmJudgeModel(): string | null {
  if (typeof process === 'undefined') return null
  const baseUrl = process.env['FREELLMAPI_BASE_URL']?.trim()
  const model = process.env['FREELLMAPI_MODEL']?.trim()
  return baseUrl && isPinnedFreeLlmCertificationModel(model) ? model : null
}

export function isTrustedAstraCertificationJudge(provider: unknown, model: unknown): boolean {
  if (typeof provider !== 'string' || typeof model !== 'string') return false
  const cleanProvider = provider.trim()
  const cleanModel = model.trim()
  if (ASTRA_CERTIFICATION_JUDGES.some((judge) => judge.provider === cleanProvider && judge.model === cleanModel)) return true
  const freeLlmModel = configuredFreeLlmJudgeModel()
  return cleanProvider === 'freellm' && freeLlmModel !== null && cleanModel === freeLlmModel
}

export function judgeMatchesCandidate(
  judge: { provider: string; model: string },
  candidates: readonly { provider: string; model: string }[],
): boolean {
  return candidates.some((candidate) =>
    candidate.provider.trim() === judge.provider.trim()
      && candidate.model.trim() === judge.model.trim(),
  )
}
