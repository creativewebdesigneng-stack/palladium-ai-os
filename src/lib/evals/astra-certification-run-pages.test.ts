import { describe, expect, it, vi } from 'vitest'
import { collectAstraCertificationRunPages } from './astra-certification-run-pages'

describe('Astra certified evaluation history pagination', () => {
  it('recovers valid historical cases after the newest 200 candidate runs', async () => {
    const records = Array.from({ length: 423 }, (_, i) => ({ id: 'case-run-' + i }))
    const fetch = vi.fn(async (from: number, to: number) => records.slice(from, to + 1))
    const result = await collectAstraCertificationRunPages(fetch)
    expect(result).toHaveLength(423)
    expect(result.at(-1)?.id).toBe('case-run-422')
    expect(fetch.mock.calls).toEqual([[0, 199], [200, 399], [400, 599]])
  })

  it('returns an empty result when there is no candidate evidence', async () => {
    const result = await collectAstraCertificationRunPages(async () => [])
    expect(result).toEqual([])
  })

  it('fails closed when the safe history budget is exhausted instead of silently truncating', async () => {
    await expect(collectAstraCertificationRunPages(async (from, to) =>
      Array.from({ length: to - from + 1 }, (_, i) => from + i),
    { pageSize: 2, maxPages: 3 })).rejects.toThrow(/more historical runs/)
  })

  it('rejects malformed pages and unsafe pagination parameters', async () => {
    await expect(collectAstraCertificationRunPages(async () => [1, 2, 3],
      { pageSize: 2 })).rejects.toThrow(/invalid page/)
    await expect(collectAstraCertificationRunPages(async () => [],
      { pageSize: 0 })).rejects.toThrow(/bounds/)
  })
})
