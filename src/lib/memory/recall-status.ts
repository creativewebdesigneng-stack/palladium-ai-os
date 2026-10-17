export type MemorySearchStatus = {
  semantic: 'available' | 'partial' | 'unavailable';
  keyword: 'available' | 'partial' | 'unavailable';
  reason: 'configuration' | 'input' | 'provider' | 'quota' | 'rate_limit' | 'authentication' | null;
};

/** Describe the retrieval paths that actually completed, including zero hits. */
export function describeMemoryRecall(status: MemorySearchStatus | null, count: number): string {
  const found = `${count} ${count === 1 ? 'entry' : 'entries'}`;
  if (!status) return `Memory search returned ${found}.`;
  const reason = status.reason === 'quota' ? 'Embedding quota or billing limit reached.'
    : status.reason === 'rate_limit' ? 'Embedding rate limit reached.'
    : status.reason === 'configuration' ? 'Embeddings are not configured.'
    : status.reason === 'authentication' ? 'Embedding provider access was rejected.'
    : 'Semantic recall is unavailable.';
  if (status.semantic === 'unavailable') {
    if (status.keyword === 'unavailable') return 'Memory search is unavailable. Try again later; no complete search result is available.';
    return `Keyword recall found ${found}. ${reason}${status.keyword === 'partial' ? ' Some keyword sources are also unavailable.' : ''}`;
  }
  if (status.semantic === 'partial' || status.keyword !== 'available') {
    return `Memory recall found ${found}. Some retrieval sources are unavailable; results may be incomplete.`;
  }
  return `Hybrid recall found ${found} using semantic and keyword search.`;
}
