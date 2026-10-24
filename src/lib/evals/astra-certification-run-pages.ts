/**
 * Read the exact owner/suite's candidate runs in stable, bounded pages.
 * The server does cryptographic verification AFTER fetching. We must not
 * silently drop historical runs because 200 newer rows were evaluated.
 * Exceeding the bounded safety budget is an error, never certification.
 */
export async function collectAstraCertificationRunPages<T>(
  fetchPage: (from: number, to: number) => Promise<readonly T[]>,
  options?: { pageSize?: number; maxPages?: number },
): Promise<T[]> {
  const pageSize = options?.pageSize ?? 200
  const maxPages = options?.maxPages ?? 25
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000 ||
      !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 50) {
    throw new Error('Invalid Astra evidence pagination bounds.')
  }
  const results: T[] = []
  for (let page = 0; page < maxPages; page++) {
    const batch = await fetchPage(page * pageSize, (page + 1) * pageSize - 1)
    if (!Array.isArray(batch) || batch.length > pageSize) {
      throw new Error('Astra evidence retrieval returned an invalid page.')
    }
    results.push(...batch)
    if (batch.length < pageSize) return results
  }
  // Do not claim that omitted older runs failed, passed, or disappeared.
  throw new Error('Astra certification has more historical runs than the safe retrieval budget. Narrow or archive duplicate evaluation history before retrying.')
}


/**
 * Avoid oversized REST IN queries after retrieving paginated candidate runs.
 * Each batch must complete before its evidence can count toward certification.
 * The caller still enforces cryptographic signatures and independent scoring.
 */
export async function collectAstraRunEvidenceBatches<R, S>(
  runIds: readonly string[],
  load: (runIdBatch: string[]) => Promise<{ responses: readonly R[]; scores: readonly S[] }>,
  batchSize = 50,
): Promise<{ responses: R[]; scores: S[] }> {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 100 ||
      runIds.some((id) => !id) || new Set(runIds).size !== runIds.length) {
    throw new Error('Invalid Astra evidence batch input.')
  }
  const responses: R[] = []
  const scores: S[] = []
  for (let i = 0; i < runIds.length; i += batchSize) {
    const evidence = await load(runIds.slice(i, i + batchSize))
    if (!evidence || !Array.isArray(evidence.responses) || !Array.isArray(evidence.scores)) {
      throw new Error('Astra evidence batch returned invalid records.')
    }
    responses.push(...evidence.responses)
    scores.push(...evidence.scores)
  }
  return { responses, scores }
}
