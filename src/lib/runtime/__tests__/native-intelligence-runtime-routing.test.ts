import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from './fake-supabase'
import {
  persistNativeIntelligenceRuntimeRouting,
  resolveNativeIntelligenceRuntimeRouting,
} from '../native-intelligence-runtime-routing.server'
import type { PreparedRun } from '../runtime.server'

const USER = 'user-1'
const HASH = 'a'.repeat(64)
const ASTRA_READY = async () => ({ ready: true, reason: 'ready' as const })

function run(overrides: Partial<PreparedRun> = {}): PreparedRun {
  return {
    agent: {
      id: 'agent-1',
      user_id: USER,
      org_id: null,
      org_id_fk: null,
      name: 'Atlas',
      description: null,
      purpose: null,
      personality: null,
      instructions: null,
      system_prompt: null,
      model_provider: 'openai',
      model: 'gpt-5-mini',
      temperature: 0.2,
      max_tokens: 1024,
      memory_enabled: false,
      allowed_tools: [],
      allowed_providers: [],
      requires_approval: false,
      autonomy: 'supervised',
      status: 'active',
      category: 'reasoning',
    },
    orgId: null,
    taskId: 'task-1',
    messages: [{ role: 'user', content: 'Reason carefully about this.' }],
    tools: { defs: [], grants: new Map() },
    provider: 'openai',
    model: 'gpt-5-mini',
    startedAt: Date.now(),
    ...overrides,
  }
}

function certificate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evidence-1',
    user_id: USER,
    organization_id: null,
    model_id: 'blackstar-native-v0.1',
    provider: 'compatible',
    model: 'blackstar-native-v0.1',
    suite_id: 'reasoning-suite-v1',
    task_class: 'reasoning',
    score: 0.94,
    sample_count: 40,
    benchmark_hash: HASH,
    evaluator_hash: 'b'.repeat(64),
    model_config_hash: 'c'.repeat(64),
    completed_at: '2026-09-06T10:00:00.000Z',
    verified_at: '2026-09-06T10:05:00.000Z',
    ...overrides,
  }
}

function astraCertificate(overrides: Record<string, unknown> = {}) {
  return certificate({
    id: 'astra-evidence-1',
    model_id: 'blackstar-astra-v0.1',
    provider: 'compatible',
    model: 'blackstar-astra-v0.1',
    suite_id: 'astra-reasoning-suite-v1',
    score: 0.97,
    sample_count: 60,
    ...overrides,
  })
}

afterEach(() => {
  delete process.env['OPENAI_COMPATIBLE_BASE_URL']
  delete process.env['BLACKSTAR_NATIVE_MODEL']
  delete process.env['BLACKSTAR_ASTRA_MODEL']
  delete process.env['BLACKSTAR_ASTRA_REASONING_MODEL']
  delete process.env['BLACKSTAR_ASTRA_CODING_MODEL']
  delete process.env['BLACKSTAR_ASTRA_AGENTIC_MODEL']
})

describe('Native Intelligence runtime routing', () => {
  it('keeps the agent-selected provider/model as the explicit fallback when no evidence exists', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://native.invalid/v1'
    const sb = createFakeSupabase({ model_eval_verified_evidence: [] }) as any
    const resolved = await resolveNativeIntelligenceRuntimeRouting({ sb, userId: USER, run: run() })

    expect(resolved).toMatchObject({
      provider: 'openai',
      model: 'gpt-5-mini',
      decision: {
        provider: 'openai',
        model: 'gpt-5-mini',
        ownership: 'external',
        source: 'explicit_fallback',
      },
    })
  })

  it('routes to the configured Blackstar native slot only from verified task-class evidence', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://native.invalid/v1'
    const sb = createFakeSupabase({ model_eval_verified_evidence: [certificate()] }) as any
    const resolved = await resolveNativeIntelligenceRuntimeRouting({ sb, userId: USER, run: run() })

    expect(resolved).toMatchObject({
      provider: 'compatible',
      model: 'blackstar-native-v0.1',
      decision: {
        model_id: 'blackstar-native-v0.1',
        ownership: 'blackstar',
        source: 'verified_evaluation',
        evaluation_samples: 40,
      },
    })
    expect(resolved.decision?.evaluation_score).toBeCloseTo(0.94, 10)
  })

  it('routes to Blackstar Astra-class only when its exact serving identity is verified and live', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://blackstar.invalid/v1'
    const sb = createFakeSupabase({ model_eval_verified_evidence: [astraCertificate()] }) as any
    const resolved = await resolveNativeIntelligenceRuntimeRouting({
      sb,
      userId: USER,
      run: run(),
      probeAstraServing: ASTRA_READY,
    })

    expect(resolved).toMatchObject({
      provider: 'compatible',
      model: 'blackstar-astra-v0.1',
      decision: {
        model_id: 'blackstar-astra-v0.1',
        ownership: 'blackstar',
        source: 'verified_evaluation',
        evaluation_samples: 60,
      },
    })
    expect(resolved.decision?.evaluation_score).toBeCloseTo(0.97, 10)
  })

  it('routes reasoning work to a configured Astra specialist only with an exact specialist certificate and live identity', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://blackstar.invalid/v1'
    process.env['BLACKSTAR_ASTRA_REASONING_MODEL'] = 'astra-reasoning-specialist-v1'
    const sb = createFakeSupabase({
      model_eval_verified_evidence: [astraCertificate({ model: 'astra-reasoning-specialist-v1' })],
    }) as any
    const probeAstraServing = vi.fn(ASTRA_READY)
    const resolved = await resolveNativeIntelligenceRuntimeRouting({
      sb,
      userId: USER,
      run: run(),
      probeAstraServing,
    })

    expect(resolved).toMatchObject({
      provider: 'compatible',
      model: 'astra-reasoning-specialist-v1',
      decision: {
        model_id: 'blackstar-astra-v0.1',
        source: 'verified_evaluation',
      },
    })
    expect(probeAstraServing).toHaveBeenCalledWith({ model: 'astra-reasoning-specialist-v1' })
  })

  it('removes Astra from routing when the certified model is not actually being served', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://blackstar.invalid/v1'
    const sb = createFakeSupabase({
      model_eval_verified_evidence: [certificate(), astraCertificate()],
    }) as any
    const probeAstraServing = vi.fn(async () => ({ ready: false, reason: 'model_missing' as const }))
    const resolved = await resolveNativeIntelligenceRuntimeRouting({
      sb,
      userId: USER,
      run: run(),
      probeAstraServing,
    })

    expect(probeAstraServing).toHaveBeenCalledWith({ model: 'blackstar-astra-v0.1' })
    expect(resolved).toMatchObject({
      provider: 'compatible',
      model: 'blackstar-native-v0.1',
      decision: {
        model_id: 'blackstar-native-v0.1',
        source: 'verified_evaluation',
      },
    })
  })

  it('fails back when a certified Astra specialist is rebound to a different model', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://blackstar.invalid/v1'
    process.env['BLACKSTAR_ASTRA_REASONING_MODEL'] = 'astra-reasoning-specialist-v2'
    const sb = createFakeSupabase({
      model_eval_verified_evidence: [astraCertificate({ model: 'astra-reasoning-specialist-v1' })],
    }) as any
    const resolved = await resolveNativeIntelligenceRuntimeRouting({ sb, userId: USER, run: run() })

    expect(resolved.provider).toBe('openai')
    expect(resolved.model).toBe('gpt-5-mini')
    expect(resolved.decision?.source).toBe('explicit_fallback')
  })

  it('does not replay Astra evidence after its serving model is rebound', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://blackstar.invalid/v1'
    process.env['BLACKSTAR_ASTRA_MODEL'] = 'blackstar-astra-v0.2'
    const sb = createFakeSupabase({ model_eval_verified_evidence: [astraCertificate()] }) as any
    const resolved = await resolveNativeIntelligenceRuntimeRouting({ sb, userId: USER, run: run() })

    expect(resolved.provider).toBe('openai')
    expect(resolved.model).toBe('gpt-5-mini')
    expect(resolved.decision?.source).toBe('explicit_fallback')
  })

  it('does not replay a certificate after the native model environment is rebound', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://native.invalid/v1'
    process.env['BLACKSTAR_NATIVE_MODEL'] = 'blackstar-native-v0.2'
    const sb = createFakeSupabase({ model_eval_verified_evidence: [certificate()] }) as any
    const resolved = await resolveNativeIntelligenceRuntimeRouting({ sb, userId: USER, run: run() })

    expect(resolved.provider).toBe('openai')
    expect(resolved.model).toBe('gpt-5-mini')
    expect(resolved.decision?.source).toBe('explicit_fallback')
  })

  it('persists the actual routed provider/model without persisting routing authority metadata', async () => {
    const sb = createFakeSupabase({
      agent_tasks: [{
        id: 'task-1',
        provider: 'openai',
        model: 'gpt-5-mini',
        tool_grants: ['existing-tool'],
        approval_granted: false,
      }],
    }) as any

    await persistNativeIntelligenceRuntimeRouting({
      sb,
      taskId: 'task-1',
      routing: { provider: 'compatible', model: 'blackstar-native-v0.1' },
    })

    expect(sb.tables['agent_tasks'][0]).toEqual({
      id: 'task-1',
      provider: 'compatible',
      model: 'blackstar-native-v0.1',
      tool_grants: ['existing-tool'],
      approval_granted: false,
    })
  })

  it('does not route to the native slot when the native transport is not configured', async () => {
    const sb = createFakeSupabase({ model_eval_verified_evidence: [certificate(), astraCertificate()] }) as any
    const resolved = await resolveNativeIntelligenceRuntimeRouting({ sb, userId: USER, run: run() })

    expect(resolved.provider).toBe('openai')
    expect(resolved.model).toBe('gpt-5-mini')
    expect(resolved.decision?.source).toBe('explicit_fallback')
  })

  it('preserves exact personal scope and ignores another user certificate', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://native.invalid/v1'
    const sb = createFakeSupabase({
      model_eval_verified_evidence: [certificate({ user_id: 'attacker-user' })],
    }) as any
    const resolved = await resolveNativeIntelligenceRuntimeRouting({ sb, userId: USER, run: run() })

    expect(resolved.provider).toBe('openai')
    expect(resolved.decision?.source).toBe('explicit_fallback')
  })

  it('keeps model-routing evidence separate from tools, approvals, identity, and delegation', async () => {
    process.env['OPENAI_COMPATIBLE_BASE_URL'] = 'http://native.invalid/v1'
    const originalRun = run()
    const originalGrants = originalRun.tools.grants
    const sb = createFakeSupabase({
      model_eval_verified_evidence: [astraCertificate({
        tool_grants: ['*'],
        approval_granted: true,
        delegation: 'admin-agent',
        execution_authority: true,
      })],
    }) as any

    const resolved = await resolveNativeIntelligenceRuntimeRouting({
      sb,
      userId: USER,
      run: originalRun,
      probeAstraServing: ASTRA_READY,
    })
    expect(originalRun.tools.grants).toBe(originalGrants)
    expect(originalRun.tools.grants.size).toBe(0)
    expect(JSON.stringify(resolved.decision)).not.toMatch(/tool_grant|approval|delegation|execution_authority/i)
  })
})
