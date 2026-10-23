import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { NATIVE_INTELLIGENCE_MIN_EVAL_SCORE } from '@/lib/ai/native-intelligence-model-platform'

const migration = readFileSync(new URL('../../../../supabase/migrations/20261023030200_harden_astra_certification_rpc.sql', import.meta.url), 'utf8')

describe('Astra DB certification RPC is last-line quality protection', () => {
  it('enforces the existing Native Intelligence score floor BEFORE evidence insertion', () => {
    expect(NATIVE_INTELLIGENCE_MIN_EVAL_SCORE).toBe(0.75)
    expect(migration).toContain('if v_score < 0.75 then')
    expect(migration.indexOf('if v_score < 0.75 then')).toBeLessThan(migration.indexOf('insert into public.model_eval_verified_evidence('))
  })
  it('rejects duplicate case IDs and cross-suite/model/owner run sets before evidence issuance', () => {
    expect(migration).toContain("count(distinct runs.metadata->'astra_activation'->>'case_id')")
    for (const field of ['suite_id', 'task_class', 'provider', 'model', 'provenance_signature', 'server_verified']) {
      expect(migration).toContain("runs.metadata->'astra_activation'->>'" + field + "'")
    }
    expect(migration).toContain('and runs.org_id is not distinct from v_organization_id')
    expect(migration).toContain("scores.evaluator_type='llm_judge'")
  })
  it('preserves existing function permissions and does not expose to anonymous callers', () => {
    expect(migration).toContain('security definer')
    expect(migration).toContain('from public,anon,authenticated')
    expect(migration).toContain('to service_role')
  })
})
