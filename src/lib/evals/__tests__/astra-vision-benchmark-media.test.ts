import { describe, expect, it } from 'vitest'
import { listAstraCertificationBenchmarkCases } from '@/lib/evals/astra-certification-benchmark-suite'
import { getAstraVisionBenchmarkGroundTruth, renderAstraVisionBenchmarkMedia } from '@/lib/evals/astra-vision-benchmark-media.server'

describe('Astra vision benchmark media', () => {
  it('renders deterministic PNG bytes for every trusted vision case', () => {
    const cases = listAstraCertificationBenchmarkCases('vision')
    const digests = cases.map((benchmarkCase) => {
      const first = renderAstraVisionBenchmarkMedia(benchmarkCase.caseId)
      const second = renderAstraVisionBenchmarkMedia(benchmarkCase.caseId)
      expect(first.mediaType).toBe('image/png')
      expect(first.base64.startsWith('iVBORw0KGgo')).toBe(true)
      expect(first.digest).toMatch(/^[a-f0-9]{64}$/)
      expect(second.digest).toBe(first.digest)
      expect(second.base64).toBe(first.base64)
      return first.digest
    })
    expect(new Set(digests).size).toBe(20)
  })

  it('derives a deterministic server-owned answer key from the same case identity', () => {
    const cases = listAstraCertificationBenchmarkCases('vision')
    expect(getAstraVisionBenchmarkGroundTruth(cases[0]!.caseId)).toEqual({
      barCount: 2,
      leftMostBarColor: 'red',
      markerHalf: 'left',
      shortestToTallestPositions: [1, 2],
    })
    expect(getAstraVisionBenchmarkGroundTruth(cases[3]!.caseId)).toEqual({
      barCount: 5,
      leftMostBarColor: 'gold',
      markerHalf: 'right',
      shortestToTallestPositions: [3, 4, 1, 5, 2],
    })
  })

  it('rejects unknown case ids for both image and answer key generation', () => {
    expect(() => renderAstraVisionBenchmarkMedia('forged-case')).toThrow('Unknown Astra vision benchmark case')
    expect(() => getAstraVisionBenchmarkGroundTruth('forged-case')).toThrow('Unknown Astra vision benchmark case')
  })
})
