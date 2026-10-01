import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const sharedExperiencePages = [
  ['AIAgents.jsx', 'blackstar-public-agents'],
  ['Features.jsx', 'blackstar-public-features'],
  ['Business.jsx', 'blackstar-public-business'],
  ['Developers.jsx', 'blackstar-public-developers'],
  ['Resources.jsx', 'blackstar-public-resources'],
  ['HelpCentre.jsx', 'blackstar-public-help'],
  ['Legal.jsx', 'blackstar-public-legal'],
  ['Onboarding.jsx', 'blackstar-public-onboarding'],
  ['Payment.jsx', 'blackstar-public-payment'],
  ['Pricing.jsx', 'blackstar-public-pricing'],
  ['AIToolsPublic.jsx', 'blackstar-public-tools'],
] as const

describe('Blackstar public visual coverage', () => {
  it('keeps every major public surface on a named Blackstar visual treatment', () => {
    for (const [file, variant] of sharedExperiencePages) {
      const source = readFileSync(new URL(`../../screens/${file}`, import.meta.url), 'utf8')
      expect(source).toContain('blackstar-public-page')
      expect(source).toContain(variant)
      expect(source).toContain('PublicExperienceBackdrop')
      expect(source).toMatch(/blackstar-style-[a-z-]+/)
    }

    const landing = readFileSync(new URL('../../screens/Landing.jsx', import.meta.url), 'utf8')
    expect(landing).toContain('blackstar-public-page')
    expect(landing).toContain('blackstar-public-landing')
    expect(landing).toContain('BlackstarExperienceField')
  })

  it('uses the shared experience component rather than page-level neural or grid canvases', () => {
    const backdrop = readFileSync(
      new URL('../../components/site/PublicExperienceBackdrop.jsx', import.meta.url),
      'utf8',
    )
    expect(backdrop).toContain('BlackstarExperienceField')

    const pricing = readFileSync(new URL('../../screens/Pricing.jsx', import.meta.url), 'utf8')
    expect(pricing).not.toContain('NeuralNetworkBackground')

    for (const [file] of sharedExperiencePages) {
      const source = readFileSync(new URL(`../../screens/${file}`, import.meta.url), 'utf8')
      expect(source).not.toContain('bg-[linear-gradient(rgba(255,255,255,.03)_1px')
    }
  })

  it('keeps auth on its dedicated cinematic experience', () => {
    const auth = readFileSync(new URL('../../components/AuthLayout.jsx', import.meta.url), 'utf8')
    expect(auth).toContain('blackstar-auth-space')
    expect(auth).toContain('BlackstarExperienceField')
    expect(auth).toContain('blackstar-style-orbital-elegance')
  })
})
