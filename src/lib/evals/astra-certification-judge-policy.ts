export type AstraCertificationJudge = {
  provider: 'groq' | 'openai'
  model: string
  label: string
}

export const ASTRA_CERTIFICATION_JUDGES: readonly AstraCertificationJudge[] = [
  { provider: 'groq', model: 'openai/gpt-oss-20b', label: 'Groq · GPT-OSS 20B' },
  { provider: 'openai', model: 'gpt-5-mini', label: 'OpenAI · GPT-5 mini' },
] as const

export function isTrustedAstraCertificationJudge(provider: unknown, model: unknown): boolean {
  if (typeof provider !== 'string' || typeof model !== 'string') return false
  const cleanProvider = provider.trim()
  const cleanModel = model.trim()
  return ASTRA_CERTIFICATION_JUDGES.some((judge) =>
    judge.provider === cleanProvider && judge.model === cleanModel,
  )
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
