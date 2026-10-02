import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const functions = readFileSync(new URL('../autonomous-os.functions.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('../../../screens/AutonomousOS.jsx', import.meta.url), 'utf8')
const guardrails = readFileSync(new URL('../../../../supabase/migrations/20260904001800_autonomous_os_hard_guardrails.sql', import.meta.url), 'utf8')
const cancellation = readFileSync(new URL('../../../../supabase/migrations/20260903225500_autonomous_os_cancel_propagation.sql', import.meta.url), 'utf8')

describe('Always-on AI observability and control', () => {
  it('surfaces owner-scoped persisted events instead of a synthetic event list', () => {
    expect(functions).toContain('listAutonomousGoalEvents')
    expect(functions).toContain('.from("autonomous_goal_events")')
    expect(functions).toContain('.eq("user_id", context.userId)')
    expect(screen).toContain('listAutonomousGoalEvents')
    expect(screen).not.toContain('events: [], fleets')
    expect(screen).toContain('Scheduler & guardrail event stream')
  })

  it('derives operational health from real runs, workflow cost and heartbeats', () => {
    expect(functions).toContain('getAutonomousOperationsHealth')
    expect(functions).toContain('workflow_run_id')
    expect(functions).toContain('worker_heartbeat_at')
    expect(functions).toContain('cost_pence')
    expect(functions).toContain('staleRuns')
    expect(functions).toContain('Health is derived from persisted owner-scoped scheduler, workflow and heartbeat evidence')
    expect(screen).toContain('Stale-heartbeat runs')
    expect(screen).toContain('Observed workflow cost')
  })

  it('keeps the established database hard guardrails authoritative', () => {
    expect(guardrails).toContain('enforce_autonomous_goal_guardrails')
    expect(guardrails).toContain('sum(at.cost_pence)')
    expect(guardrails).toContain('max_runtime_seconds')
    expect(guardrails).toContain("'* * * * *'")
    expect(screen).toContain('hard guardrails')
  })

  it('provides an owner-scoped emergency stop that relies on existing workflow cancellation propagation', () => {
    expect(functions).toContain('emergencyStopAutonomousWork')
    expect(functions).toContain('confirm: z.literal(true)')
    expect(functions).toContain('.eq("user_id", context.userId)')
    expect(functions).toContain('status: "paused"')
    expect(functions).toContain('status: "cancelled"')
    expect(cancellation).toContain('propagate_autonomous_run_cancellation')
    expect(cancellation).toContain('cancel_requested = true')
    expect(screen).toContain('Stop all autonomous work')
  })

  it('does not introduce a second scheduler or worker system', () => {
    expect(functions).not.toContain('cron.schedule')
    expect(screen).toContain('same durable workflow worker')
  })
})
