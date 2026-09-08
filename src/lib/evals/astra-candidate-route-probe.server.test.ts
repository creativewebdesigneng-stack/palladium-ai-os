import { describe, expect, it } from 'vitest'
import {
  classifyAstraCandidateChatProbeStatus,
  classifyAstraCandidateRouteProbeStatus,
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

  it('distinguishes chat request-contract and model/path rejection', () => {
    expect(classifyAstraCandidateChatProbeStatus(200)).toBe('candidate_route_reachable_runtime_failure')
    expect(classifyAstraCandidateChatProbeStatus(400)).toBe('candidate_request_rejected')
    expect(classifyAstraCandidateChatProbeStatus(422)).toBe('candidate_request_rejected')
    expect(classifyAstraCandidateChatProbeStatus(404)).toBe('candidate_model_or_chat_route_not_found')
    expect(classifyAstraCandidateChatProbeStatus(401)).toBe('candidate_credentials_rejected')
    expect(classifyAstraCandidateChatProbeStatus(429)).toBe('candidate_rate_limited')
    expect(classifyAstraCandidateChatProbeStatus(503)).toBe('candidate_upstream_unavailable')
    expect(classifyAstraCandidateChatProbeStatus(504)).toBe('candidate_timeout_or_unreachable')
  })
})
