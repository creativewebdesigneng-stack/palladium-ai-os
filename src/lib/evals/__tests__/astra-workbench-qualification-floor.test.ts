import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

describe('Astra qualifying-score UI contract', () => {
  it('uses server-derived verified score floor and disallows misleading case-count-only certification', async () => {
    const source = await readFile(new URL('../../../components/models/AstraCertificationWorkbench.jsx', import.meta.url), 'utf8')
    expect(source).toContain('status.data?.qualityFloorMet === false')
    expect(source).toContain('status.data?.minimumQualifyingScore')
    expect(source).toContain('status.data?.averageScore')
    expect(source).toContain('Quality floor not met')
    expect(source).toContain('Certification evidence cannot be issued.')
    expect(source).toContain("disabled={!status.data?.readyToCertify")
  })
})
