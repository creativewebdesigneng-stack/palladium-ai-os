import { describe, expect, it } from 'vitest'
import { listAstraCertificationBenchmarkCases } from '@/lib/evals/astra-certification-benchmark-suite'
import { renderAstraVisionBenchmarkMedia } from '@/lib/evals/astra-vision-benchmark-media.server'

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

  it('rejects unknown case ids', () => {
    expect(() => renderAstraVisionBenchmarkMedia('forged-case')).toThrow('Unknown Astra vision benchmark case')
  })
})
