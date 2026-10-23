import { describe, expect, it } from 'vitest'
import { inspectAstraCertificationPreflight } from './astra-certification-preflight'

const base = {
  OPENAI_COMPATIBLE_BASE_URL: 'https://example.test/v1',
  OPENAI_COMPATIBLE_API_KEY: 'never-return-this-key',
  BLACKSTAR_ASTRA_MODEL: 'candidate',
  BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY: 's'.repeat(64),
  FREELLMAPI_BASE_URL: 'https://judge.example.test/v1',
  FREELLMAPI_API_KEY: 'another-hidden-key',
  FREELLMAPI_MODEL: 'judge-model',
  FREELLMAPI_ROUTED_PROVIDER: 'openai',
  FREELLMAPI_ROUTED_MODEL: 'judge-model',
}

describe('Astra certification configuration-only preflight', () => {
  it('reports missing candidate and judge as blockers without leaking values', () => {
    const result = inspectAstraCertificationPreflight({ taskClass: 'reasoning', candidateModel: 'candidate', env: {} })
    expect(result).toMatchObject({
      canAttemptTextCertification: false, state: 'configuration_missing',
      blockers: ['astra_candidate_route_missing', 'pinned_independent_evaluator_missing', 'astra_provenance_signing_key_missing'],
    })
  })
  it('indicates configured-but-unprobed and never claims completed certification', () => {
    const result = inspectAstraCertificationPreflight({ taskClass: 'coding', candidateModel: 'candidate', env: base })
    expect(result).toMatchObject({
      state: 'configured_unprobed', candidateConfigured: true,
      independentJudgeConfigured: true, provenanceSigningConfigured: true,
      canAttemptTextCertification: true, blockers: [],
    })
    const json = JSON.stringify(result)
    expect(json).not.toContain('never-return-this-key')
    expect(json).not.toContain('another-hidden-key')
    expect(json).not.toContain('example.test')
    expect(json).not.toContain('judge-model')
    expect(json).not.toContain('certified_success')
  })
  it('reports missing or invalid signing authority without leaking the secret', () => {
    for (const patch of [
      { BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY: '' },
      { BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY: 'weak-key' },
      { BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY: 's'.repeat(64) + ' ' },
    ]) {
      const result = inspectAstraCertificationPreflight({
        taskClass: 'coding', candidateModel: 'candidate',
        env: { ...base, SUPABASE_SERVICE_ROLE_KEY: 'legacy-secret', ...patch },
      })
      expect(result).toMatchObject({
        state: 'configuration_missing', provenanceSigningConfigured: false,
        canAttemptTextCertification: false,
      })
      expect(result.blockers).toContain('astra_provenance_signing_key_missing')
      expect(JSON.stringify(result)).not.toContain('legacy-secret')
      expect(JSON.stringify(result)).not.toContain('weak-key')
    }
    const legacy = inspectAstraCertificationPreflight({
      taskClass: 'coding', candidateModel: 'candidate',
      env: { ...base, BLACKSTAR_ASTRA_PROVENANCE_SIGNING_KEY: undefined, SUPABASE_SERVICE_ROLE_KEY: 'legacy-secret' },
    })
    expect(legacy.provenanceSigningConfigured).toBe(true)
    expect(legacy.canAttemptTextCertification).toBe(true)
  })

  it('blocks an unauthenticated candidate even when the model and judge are pinned', () => {
    const result = inspectAstraCertificationPreflight({
      taskClass: 'coding', candidateModel: 'candidate',
      env: { ...base, OPENAI_COMPATIBLE_API_KEY: '' },
    })
    expect(result).toMatchObject({
      candidateConfigured: true, candidateAuthConfigured: false,
      independentJudgeConfigured: true, provenanceSigningConfigured: true,
      canAttemptTextCertification: false, state: 'configuration_missing',
    })
    expect(result.blockers).toContain('astra_candidate_auth_missing')
    expect(JSON.stringify(result)).not.toContain('never-return-this-key')
  })

  it('refuses unpinned or routed-to-the-candidate evaluators', () => {
    for (const patch of [
      { FREELLMAPI_MODEL: 'auto' },
      { FREELLMAPI_ROUTED_PROVIDER: 'local' },
      { FREELLMAPI_ROUTED_MODEL: 'candidate' },
      { FREELLMAPI_API_KEY: '' },
    ]) {
      const result = inspectAstraCertificationPreflight({
        taskClass: 'agentic', candidateModel: 'candidate', env: { ...base, ...patch },
      })
      expect(result.canAttemptTextCertification).toBe(false)
      expect(result.blockers).toContain('pinned_independent_evaluator_missing')
    }
  })
  it('recognises an existing Groq bootstrap as configuration only, not Blackstar-trained weights', () => {
    const { OPENAI_COMPATIBLE_BASE_URL: _route, ...rest } = base
    const result = inspectAstraCertificationPreflight({
      taskClass: 'general', candidateModel: 'qwen/qwen3.8-27b',
      env: { ...rest, GROQ_API_KEY: 'hidden-bootstrap' },
    })
    expect(result.state).toBe('configuration_missing')
    expect(result.candidateConfigured).toBe(false)
    expect(result.canAttemptTextCertification).toBe(false)
    expect(result.blockers).toContain('astra_candidate_route_missing')
    expect(JSON.stringify(result)).not.toContain('hidden-bootstrap')
  })
  it('does not mislabel a text benchmark as a working multimodal vision evaluator', () => {
    const unavailable = inspectAstraCertificationPreflight({ taskClass: 'vision', candidateModel: 'vision', env: base })
    expect(unavailable).toMatchObject({
      state: 'vision_separate_flow', canAttemptTextCertification: false, candidateConfigured: false,
      blockers: ['astra_vision_route_missing'],
    })
    const configured = inspectAstraCertificationPreflight({ taskClass: 'vision', candidateModel: 'vision', env: {
      ...base, BLACKSTAR_ASTRA_VISION_MODEL: 'vision',
    } })
    expect(configured).toMatchObject({ state: 'vision_separate_flow', candidateConfigured: true, blockers: [] })
  })
})
