import { describe, expect, it } from 'vitest'
import {
  classifyAstraCandidateChatProbeStatus,
  classifyAstraCandidateRouteProbeStatus,
  isAstraCandidateModelListed,
  safeAstraAdvertisedModelIds,
  safeAstraCandidateModelId,
} from './astra-candidate-route-probe-diagnostics'

describe('Astra candidate route probe', () => {
  it('maps bounded route HTTP status without exposing response text', () => {
    expect(classifyAstraCandidateRouteProbeStatus(200)).toBe('candidate_route_reachable_runtime_failure')
    expect(classifyAstraCandidateRouteProbeStatus(204)).toBe('candidate_route_reachable_runtime_failure')
    expect(classifyAstraCandidateRouteProbeStatus(404)).toBe('candidate_route_reachable_runtime_failure')
    expect(classifyAstraCandidateRouteProbeStatus(401)).toBe('candidate_credentials_rejected')
    expect(classifyAstraCandidateRouteProbeStatus(403)).toBe('candidate_credentials_rejected')
    expect(classifyAstraCandidateRouteProbeStatus(429)).toBe('candidate_rate_limited')
    expect(classifyAstraCandidateRouteProbeStatus(500)).toBe('candidate_upstream_unavailable')
    expect(classifyAstraCandidateRouteProbeStatus(502)).toBe('candidate_upstream_unavailable')
    expect(classifyAstraCandidateRouteProbeStatus(503)).toBe('candidate_upstream_unavailable')
    expect(classifyAstraCandidateRouteProbeStatus(504)).toBe('candidate_timeout_or_unreachable')
  })

  it('reduces OpenAI and Ollama model listings to exact identity presence', () => {
    expect(isAstraCandidateModelListed({ data: [{ id: 'qwen3:8b-q4_K_M' }] }, 'qwen3:8b-q4_K_M')).toBe(true)
    expect(isAstraCandidateModelListed({ models: [{ name: 'qwen3:8b-q4_K_M' }] }, 'qwen3:8b-q4_K_M')).toBe(true)
    expect(isAstraCandidateModelListed({ models: [{ model: 'other-model' }] }, 'qwen3:8b-q4_K_M')).toBe(false)
    expect(isAstraCandidateModelListed({ unexpected: [] }, 'qwen3:8b-q4_K_M')).toBeNull()
  })

  it('extracts only bounded identifier-shaped advertised model ids', () => {
    const payload = {
      data: [
        { id: 'qwen3:8b-q4_K_M', url: 'https://secret.example/model', token: 'Bearer should-not-leak' },
        { id: 'qwen3:8b-q4_K_M' },
        { id: 'bad model with spaces' },
        { id: 'model/two' },
        { id: 'model-three' },
        { id: 'model_four' },
        { id: 'model.five' },
        { id: 'sixth-model-is-capped' },
      ],
      error: 'provider body must never be surfaced',
      prompt: 'secret prompt',
    }
    expect(safeAstraAdvertisedModelIds(payload)).toEqual([
      'qwen3:8b-q4_K_M',
      'model/two',
      'model-three',
      'model_four',
      'model.five',
    ])
    expect(safeAstraCandidateModelId(' qwen3:8b-q4_K_M ')).toBe('qwen3:8b-q4_K_M')
    expect(safeAstraCandidateModelId('bad model with spaces')).toBeNull()
    expect(safeAstraCandidateModelId('x'.repeat(129))).toBeNull()
  })

  it('reads Ollama name/model fields without arbitrary response metadata', () => {
    expect(safeAstraAdvertisedModelIds({
      models: [
        { name: 'qwen3:8b-q4_K_M', model: 'qwen3:8b-q4_K_M', digest: 'secret-ish-metadata' },
        { name: 'other:latest' },
      ],
      details: { bearer: 'do-not-return' },
    })).toEqual(['qwen3:8b-q4_K_M', 'other:latest'])
  })

  it('distinguishes chat request-contract, model and route rejection', () => {
    expect(classifyAstraCandidateChatProbeStatus(200)).toBe('candidate_route_reachable_runtime_failure')
    expect(classifyAstraCandidateChatProbeStatus(400)).toBe('candidate_request_rejected')
    expect(classifyAstraCandidateChatProbeStatus(422)).toBe('candidate_request_rejected')
    expect(classifyAstraCandidateChatProbeStatus(404, false)).toBe('candidate_model_not_found')
    expect(classifyAstraCandidateChatProbeStatus(404, true)).toBe('candidate_chat_route_not_found')
    expect(classifyAstraCandidateChatProbeStatus(404)).toBe('candidate_model_or_chat_route_not_found')
    expect(classifyAstraCandidateChatProbeStatus(401)).toBe('candidate_credentials_rejected')
    expect(classifyAstraCandidateChatProbeStatus(429)).toBe('candidate_rate_limited')
    expect(classifyAstraCandidateChatProbeStatus(503)).toBe('candidate_upstream_unavailable')
    expect(classifyAstraCandidateChatProbeStatus(504)).toBe('candidate_timeout_or_unreachable')
  })
})
