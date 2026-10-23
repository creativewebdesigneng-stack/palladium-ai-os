import { describe, expect, it, vi } from 'vitest'
import { collectAstraCertificationRunPages, collectAstraRunEvidenceBatches } from './astra-certification-run-pages'

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


describe('Astra related evidence REST request batching', () => {
  it('reads 121 run IDs across limited chunks rather than generating a giant IN clause', async () => {
    const runIds = Array.from({ length: 121 }, (_, i) => 'run-' + i)
    const loader = vi.fn(async (ids: string[]) => ({
      responses: ids.map((id) => ({ run_id: id })),
      scores: ids.map((id) => ({ run_id: id, score: 85 })),
    }))
    const result = await collectAstraRunEvidenceBatches(runIds, loader)
    expect(loader.mock.calls.map(([ids]) => ids.length)).toEqual([50, 50, 21])
    expect(result.responses).toHaveLength(121)
    expect(result.scores).toHaveLength(121)
    expect(result.responses.at(-1)?.run_id).toBe('run-120')
  })

  it('stops if an evidence batch fails and does not return a partial trusted record set', async () => {
    let attempted = 0
    await expect(collectAstraRunEvidenceBatches(['r1', 'r2'], async () => {
      attempted++
      if (attempted > 1) throw new Error('Database read failed')
      return { responses: [], scores: [] }
    }, 1)).rejects.toThrow('Database read failed')
    expect(attempted).toBe(2)
  })

  it('rejects duplicate run IDs, empty IDs, unsafe sizes and invalid batch results', async () => {
    const loader = async () => ({ responses: [], scores: [] })
    await expect(collectAstraRunEvidenceBatches(['a', 'a'], loader)).rejects.toThrow(/Invalid/)
    await expect(collectAstraRunEvidenceBatches([''], loader)).rejects.toThrow(/Invalid/)
    await expect(collectAstraRunEvidenceBatches(['a'], loader, 0)).rejects.toThrow(/Invalid/)
    await expect(collectAstraRunEvidenceBatches(['a'], async () => ({ responses: null, scores: [] }) as never)).rejects.toThrow(/invalid records/)
  })
})
