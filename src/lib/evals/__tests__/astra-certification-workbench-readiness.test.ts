import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

const workbenchFile = new URL('../../../components/models/AstraCertificationWorkbench.jsx', import.meta.url)
const fnFile = new URL('../astra-certification-benchmark.functions.ts', import.meta.url)

describe('Astra operator certification readiness wiring', () => {
  it('requires server-provided independent preflight before enabling text inference', async () => {
    const [ui, fn] = await Promise.all([readFile(workbenchFile, 'utf8'), readFile(fnFile, 'utf8')])
    expect(fn).toContain('return { ...plan, trustedJudges, preflight }')
    expect(ui).toContain("benchmark.data?.preflight?.state === 'configured_unprobed'")
    expect(ui).toContain('benchmark.data?.preflight?.canAttemptTextCertification === true')
    expect(ui).toContain("taskClass !== 'vision' && (benchmark.data?.preflight?.state !== 'configured_unprobed'")
    expect(ui).toContain('role="status"')
    expect(ui).toContain('Routes configured, not yet independently tested')
    expect(ui).toContain("blockers?.includes('astra_candidate_auth_missing')")
  })

  it('explains missing signing authority without exposing credentials', async () => {
    const [ui, fn] = await Promise.all([readFile(workbenchFile, 'utf8'), readFile(fnFile, 'utf8')])
    expect(ui).toContain("blockers?.includes('astra_provenance_signing_key_missing')")
    expect(ui).toContain('Astra provenance signing authority is missing or invalid')
    expect(fn).toContain("code: 'provenance_signing_not_ready'")
    expect(fn).toContain('An operator must configure a dedicated server-side signing key.')
    expect(ui).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  it('requires explicit paid-batch consent in both mutation handlers and both buttons', async () => {
    const ui = await readFile(workbenchFile, 'utf8')
    expect(ui.match(/if \(!batchConsent\)/g)).toHaveLength(2)
    expect(ui).toContain('checked={batchConsent}')
    expect(ui).toContain('onChange={(event) => setBatchConsent(event.target.checked)}')
    expect(ui).toContain("Provider charges may apply")
    expect(ui).toContain('setBatchConsent(false); }, [taskClass]')
    expect(ui.match(/\|\| !batchConsent \|\| runCase\.isPending/g)).toHaveLength(2)
  })
})
