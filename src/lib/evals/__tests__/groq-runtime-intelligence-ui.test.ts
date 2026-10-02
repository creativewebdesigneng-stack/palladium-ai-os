import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const functions = readFileSync(new URL('../groq-evaluation.functions.ts', import.meta.url), 'utf8')
const panel = readFileSync(new URL('../../../components/models/GroqEvidencePanel.jsx', import.meta.url), 'utf8')
const models = readFileSync(new URL('../../../screens/Models.jsx', import.meta.url), 'utf8')

describe('Groq runtime intelligence UI and live catalogue contract', () => {
  it('discovers active models from Groq server-side without exposing the key', () => {
    expect(functions).toContain("process.env['GROQ_API_KEY']")
    expect(functions).toContain('https://api.groq.com/openai/v1/models')
    expect(functions).toContain('Authorization:')
    expect(functions).toContain('Bearer')
    expect(functions).not.toContain('return { apiKey')
  })

  it('filters retired Compound identifiers from the live catalogue', () => {
    expect(functions).toContain("'groq/compound'")
    expect(functions).toContain("'compound-beta'")
    expect(functions).toContain('!isRetiredGroqModel(id)')
  })

  it('keeps Groq evidence-qualified and provider-neutral', () => {
    expect(functions).toContain('minimumSamplesPerClass: 20')
    expect(functions).toContain('qualityFloor: 0.75')
    expect(functions).toContain('toolUseFloor: 0.9')
    expect(functions).toContain('providerNeutral: true')
    expect(functions).toContain('evidenceRequired: true')
  })

  it('surfaces evidence status in Runtime Models without claiming automatic superiority', () => {
    expect(models).toContain('GroqEvidencePanel')
    expect(panel).toContain('Fast provider, evidence-qualified routing')
    expect(panel).toContain('low latency alone never qualifies routing')
    expect(panel).toContain('Retired Compound identifiers are blocked before execution')
  })
})
