/** 
 * Tiny read-only phrase matcher for the Astra Spider prompt preview.
 * It is not a model, evidence verifier, prompt-safety filter or executor.
 * Candidates can only come from the already-authorised Hub inventory.
 */
const STOP_WORDS = new Set(['model', 'tool', 'agent', 'use', 'with', 'workflow', 'inference', 'run', 'the', 'and', 'for', 'please'])

function words(input: string): string[] {
  return [...new Set(input.toLowerCase().match(/[a-z0-9]+/g) ?? [])]
    .filter((value) => value.length >= 3 && !STOP_WORDS.has(value))
}

export interface SpiderPromptSuggestion {
  capability: string
  matchedTerms: string[]
}

/**
 * Only suggest a registry capability when the supplied prompt contains all
 * meaningful words from that capability's label. Do not invent knowledge,
 * infer permissions or claim semantic understanding.
 */
export function suggestSpiderCapability(
  prompt: string,
  availableCapabilities: readonly string[],
): SpiderPromptSuggestion | null {
  if (!prompt.trim() || prompt.length > 1000) return null
  const promptWords = new Set(words(prompt))
  let best: SpiderPromptSuggestion | null = null
  for (const capability of availableCapabilities) {
    const terms = words(capability)
    if (!terms.length || !terms.every((term) => promptWords.has(term))) continue
    if (!best || terms.length > best.matchedTerms.length) {
      best = { capability, matchedTerms: terms }
    }
  }
  return best
}
