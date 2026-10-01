import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const header = readFileSync(new URL('../../components/palladium/PageHeader.jsx', import.meta.url), 'utf8')
const panel = readFileSync(new URL('../../components/palladium/Panel.jsx', import.meta.url), 'utf8')
const metric = readFileSync(new URL('../../components/palladium/MetricCard.jsx', import.meta.url), 'utf8')
const brand = readFileSync(new URL('../../components/palladium/Brand.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8')

describe('Blackstar shared Experience Layer components', () => {
  it('keeps existing component signatures while adding dimensional structure', () => {
    expect(header).toContain("export default function PageHeader({ eyebrow = 'Blackstar', title, description, action })")
    expect(panel).toContain("export default function Panel({ title, subtitle, children, className = '' })")
    expect(metric).toContain('export default function MetricCard({ label, value, detail, icon: Icon })')
    expect(brand).toContain('export default function Brand({ compact = false })')
  })

  it('adds consistent Blackstar depth details to shared surfaces', () => {
    expect(header).toContain('blackstar-page-header-orbit')
    expect(header).toContain('blackstar-page-header-status')
    expect(panel).toContain('blackstar-panel-scan')
    expect(metric).toContain('blackstar-metric-ring')
    expect(brand).toContain('blackstar-brand-mark-ring')
  })

  it('provides reduced-motion-safe styling for the new animated details', () => {
    expect(css).toContain('.blackstar-panel-scan')
    expect(css).toContain('.blackstar-metric-icon')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('transition: none !important')
  })
})
