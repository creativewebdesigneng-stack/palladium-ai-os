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
