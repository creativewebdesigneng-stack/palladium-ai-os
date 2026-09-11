import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  'supabase/migrations/20260911123000_harden_autonomous_definer_execute.sql',
  'utf8',
)

describe('Autonomous OS SECURITY DEFINER grants', () => {
  it('makes the global guardrail enforcer service-role only', () => {
    expect(migration).toContain(
      'revoke all on function public.enforce_autonomous_goal_guardrails() from public, anon, authenticated',
    )
    expect(migration).toContain(
      'grant execute on function public.enforce_autonomous_goal_guardrails() to service_role',
    )
  })

  it('removes direct public execution from trigger-only definer functions', () => {
    for (const fn of [
      'finalize_waiting_workflow_cancellation',
      'notify_autonomous_goal_event',
      'propagate_autonomous_run_cancellation',
      'publish_autonomous_fleet_activity',
      'reset_autonomous_recovery_after_success',
      'schedule_autonomous_recovery',
      'sync_autonomous_fleet_step_state',
      'trigger_autonomous_goals_from_notification',
    ]) {
      expect(migration).toContain(
        `revoke all on function public.${fn}() from public, anon, authenticated`,
      )
    }
  })

  it('does not revoke the deliberate published App Studio read RPC', () => {
    expect(migration).not.toMatch(/revoke all on function public\.get_published_app_studio_release/)
  })
})
