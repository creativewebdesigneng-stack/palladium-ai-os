import { afterEach, describe, expect, it, vi } from 'vitest'
import { falFailureMessage, submitFalThreeDAsset } from './game-foundry-fal-3d.server'

const originalKey = process.env['FAL_API_KEY']
afterEach(() => {
  vi.restoreAllMocks()
  if (originalKey === undefined) delete process.env['FAL_API_KEY']
  else process.env['FAL_API_KEY'] = originalKey
})

describe('FAL rejection classification and secret redaction', () => {
  it('recognizes billing exhaustion even when fal returns HTTP 403 instead of 402', () => {
    const message = falFailureMessage(403, JSON.stringify({
      detail: 'User is locked. Reason: Exhausted balance. Top up your balance at fal.ai/dashboard/billing',
    }))
    expect(message).toMatch(/billing/i)
    expect(message).not.toMatch(/invalid|rejected the server credentials/i)
  })

  it('distinguishes authentication from permissions and model access', () => {
    expect(falFailureMessage(401, '{"detail":"No user found for Key ID and Secret"}')).toMatch(/API key/)
    expect(falFailureMessage(403, '{"detail":"Permission denied for this model"}')).toMatch(/permissions|access/)
    expect(falFailureMessage(403, '{"detail":"User is locked"}')).toMatch(/restricted|locked/)
  })

  it('does not echo raw potentially sensitive provider text to the end user', () => {
    const raw = JSON.stringify({ detail: 'Permission denied for key abc-secret@example.com' })
    expect(falFailureMessage(403, raw)).not.toContain('abc-secret')
  })

  it('reports a gateway method restriction independently of invalid credentials', () => {
    const message = falFailureMessage(403, '<html>CloudFront: This distribution is not configured to allow the HTTP request method.</html>')
    expect(message).toMatch(/gateway/)
    expect(message).not.toMatch(/API key/)
  })

  it('classifies live upstream queue submission denial without exposing the response body', async () => {
    process.env['FAL_API_KEY'] = 'test-placeholder-not-real'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      detail: 'User is locked. Reason: Exhausted balance. Account reference abc-secret@example.com',
    }), { status: 403, headers: { 'content-type': 'application/json' } }))
    await expect(submitFalThreeDAsset({
      sourceKind: 'prompt', prompt: 'Four-wheel racing car', sourceUrl: null,
      outputFormat: 'obj', qualityProfile: 'game_ready',
    })).rejects.toThrow(/billing attention/)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://queue.fal.run/fal-ai/hunyuan3d-v3/text-to-3d')
  })
})
