import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

import {
  generateHuggingFaceCinemaPreview,
  getHuggingFaceCinemaCapabilities,
} from '../huggingface-cinema.server'

const originalEndpoint = process.env['HUGGINGFACE_CINEMA_ENDPOINT_URL']
const originalToken = process.env['HF_TOKEN']
const originalAltToken = process.env['HUGGINGFACE_TOKEN']

afterEach(() => {
  vi.restoreAllMocks()
  if (originalEndpoint === undefined) delete process.env['HUGGINGFACE_CINEMA_ENDPOINT_URL']
  else process.env['HUGGINGFACE_CINEMA_ENDPOINT_URL'] = originalEndpoint
  if (originalToken === undefined) delete process.env['HF_TOKEN']
  else process.env['HF_TOKEN'] = originalToken
  if (originalAltToken === undefined) delete process.env['HUGGINGFACE_TOKEN']
  else process.env['HUGGINGFACE_TOKEN'] = originalAltToken
})

describe('Hugging Face Cinema execution lane', () => {
  it('fails closed when a dedicated endpoint is not configured', () => {
    delete process.env['HUGGINGFACE_CINEMA_ENDPOINT_URL']
    delete process.env['HF_TOKEN']
    delete process.env['HUGGINGFACE_TOKEN']
    const capabilities = getHuggingFaceCinemaCapabilities()
    expect(capabilities.configured).toBe(false)
    expect(capabilities.workflow).toBe('text-to-video-preview')
  })

  it('accepts only dedicated huggingface.cloud HTTPS endpoints', () => {
    process.env['HF_TOKEN'] = 'hf_test'
    process.env['HUGGINGFACE_CINEMA_ENDPOINT_URL'] = 'http://example.com/video'
    expect(() => getHuggingFaceCinemaCapabilities()).toThrow('must use HTTPS')

    process.env['HUGGINGFACE_CINEMA_ENDPOINT_URL'] = 'https://example.com/video'
    expect(() => getHuggingFaceCinemaCapabilities()).toThrow('dedicated huggingface.cloud')
  })

  it('rejects non-video endpoint responses before storage', async () => {
    process.env['HF_TOKEN'] = 'hf_test'
    process.env['HUGGINGFACE_CINEMA_ENDPOINT_URL'] = 'https://preview.eu-west-1.aws.endpoints.huggingface.cloud'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'not video' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(generateHuggingFaceCinemaPreview({
      userId: '11111111-1111-4111-8111-111111111111',
      jobId: '22222222-2222-4222-8222-222222222222',
      prompt: 'A cinematic test sequence',
    })).rejects.toThrow('did not return a supported video payload')
  })

  it('keeps output private and owner-signed in the source contract', () => {
    const server = readFileSync(new URL('../huggingface-cinema.server.ts', import.meta.url), 'utf8')
    const functions = readFileSync(new URL('../huggingface-cinema.functions.ts', import.meta.url), 'utf8')
    const migration = readFileSync(new URL('../../../../supabase/migrations/20261002175125_huggingface_cinema_execution.sql', import.meta.url), 'utf8')
    const panel = readFileSync(new URL('../../../components/huggingface/HuggingFaceCinemaExecutionPanel.jsx', import.meta.url), 'utf8')
    const cinema = readFileSync(new URL('../../../screens/CinemaStudio.jsx', import.meta.url), 'utf8')

    expect(server).toContain("HF_CINEMA_BUCKET = 'cinema-hf-outputs'")
    expect(server).toContain('.createSignedUrl(')
    expect(functions).toContain(".eq('user_id', context.userId)")
    expect(functions).toContain("provider: 'huggingface_cinema'")
    expect(migration).toContain("'cinema-hf-outputs'")
    expect(migration).toContain('false')
    expect(migration).not.toContain('create policy')
    expect(panel).not.toContain('HF_TOKEN')
    expect(panel).not.toContain('HUGGINGFACE_TOKEN')
    expect(cinema).toContain('HuggingFaceCinemaExecutionPanel')
    expect(cinema).toContain('HuggingFaceModelDiscoveryPanel')
    expect(cinema).toContain("tasks={['text-to-video','image-to-video']}")
  })

  it('does not replace existing production workers', () => {
    const panel = readFileSync(new URL('../../../components/huggingface/HuggingFaceCinemaExecutionPanel.jsx', import.meta.url), 'utf8')
    expect(panel).toContain('does not replace Seedream, LTX or the Cinema master pipeline')
  })
})
