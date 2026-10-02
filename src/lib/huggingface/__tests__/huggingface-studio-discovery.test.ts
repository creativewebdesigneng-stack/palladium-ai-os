import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const server = readFileSync(new URL('../huggingface-studio.server.ts', import.meta.url), 'utf8')
const functions = readFileSync(new URL('../huggingface-studio.functions.ts', import.meta.url), 'utf8')
const panel = readFileSync(new URL('../../../components/huggingface/HuggingFaceModelDiscoveryPanel.jsx', import.meta.url), 'utf8')
const cinema = readFileSync(new URL('../../../screens/CinemaStudio.jsx', import.meta.url), 'utf8')
const threeD = readFileSync(new URL('../../../screens/ThreeDStudio.jsx', import.meta.url), 'utf8')
const game = readFileSync(new URL('../../../screens/GameFoundry.jsx', import.meta.url), 'utf8')

describe('Hugging Face studio discovery', () => {
  it('uses authenticated server functions and keeps tokens server-side', () => {
    expect(functions).toContain('requireSupabaseAuth')
    expect(functions).toContain("await import('./huggingface-studio.server')")
    expect(server).toContain("process.env['HF_TOKEN']")
    expect(server).toContain("process.env['HUGGINGFACE_TOKEN']")
    expect(panel).not.toContain('HF_TOKEN')
    expect(panel).not.toContain('HUGGINGFACE_TOKEN')
  })

  it('supports only the explicit creative task catalogue', () => {
    for (const task of ['text-to-video','image-to-video','text-to-3d','image-to-3d']) {
      expect(server).toContain(task)
      expect(functions).toContain(task)
    }
    expect(server).toContain('Unsupported Hugging Face studio task.')
  })

  it('distinguishes Hub discovery from executable provider readiness', () => {
    expect(server).toContain('inferenceProviderMapping')
    expect(server).toContain('inferenceReady: providers.length > 0')
    expect(server).toContain('Discovery reflects Hugging Face Hub metadata')
    expect(panel).toContain('Discovery only')
    expect(panel).toContain('Blackstar does not mark a model executable merely because it exists on the Hub')
  })

  it('adds discovery to Cinema, 3D Studio and Game Foundry without replacing current workers', () => {
    expect(cinema).toContain('HuggingFaceModelDiscoveryPanel')
    expect(cinema).toContain('Seedream/LTX')
    expect(threeD).toContain('HuggingFaceModelDiscoveryPanel')
    expect(threeD).toContain('Modly-compatible')
    expect(game).toContain('HuggingFaceModelDiscoveryPanel')
    expect(game).toContain('hosted 3D worker')
  })
})
