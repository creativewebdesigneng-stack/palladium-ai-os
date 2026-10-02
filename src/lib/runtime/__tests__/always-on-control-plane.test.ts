import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const scheduler = readFileSync(new URL('../autonomous-os.scheduler.server.ts', import.meta.url), 'utf8')
const manual = readFileSync(new URL('../autonomous-os.manual.functions.ts', import.meta.url), 'utf8')
const control = readFileSync(new URL('../autonomous-control-plane.functions.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('../../../screens/AutonomousOS.jsx', import.meta.url), 'utf8')
const migration = readFileSync(new URL('../../../../supabase/migrations/20261002113000_autonomous_runtime_control_plane.sql', import.meta.url), 'utf8')

describe('Always-on Autonomous OS control plane', () => {
  it('adds a user-owned master runtime control behind RLS', () => {
    expect(migration).toContain('create table if not exists public.autonomous_runtime_controls')
    expect(migration).toContain('enable row level security')
    expect(migration).toContain("using ((select auth.uid()) = user_id)")
    expect(migration).toContain('with check ((select auth.uid()) = user_id)')
  })

  it('blocks scheduler claims while the master stop is engaged', () => {
    expect(scheduler).toContain('autonomousRuntimeEnabled')
    expect(scheduler).toContain('autonomous_runtime_controls')
    expect(scheduler).toContain('if (!(await autonomousRuntimeEnabled(db, candidate.user_id)))')
  })

  it('blocks manual Run now while the master stop is engaged', () => {
    expect(manual).toContain('autonomous_runtime_controls')
    expect(manual).toContain('if (control?.enabled === false)')
    expect(manual).toContain('master stop')
  })

  it('requests cancellation for active workflow runs and closes autonomous runs', () => {
    expect(control).toContain('cancel_requested: true')
    expect(control).toContain("status: 'cancelled'")
    expect(control).toContain('Autonomous OS master stop engaged by the operator.')
    expect(control).toContain("action: data.enabled ? 'autonomous_runtime.master_start' : 'autonomous_runtime.master_stop'")
  })

  it('exposes bounded operational health without a duplicate worker', () => {
    expect(control).toContain('staleWorkflowRuns')
    expect(control).toContain('latestHeartbeat')
    expect(control).toContain('schedulerErrors')
    expect(screen).toContain('Always-on control plane')
    expect(screen).toContain('Engage master stop')
    expect(screen).toContain('Stale workflows')
  })

  it('preserves existing guardrails and runtime authority', () => {
    expect(screen).toContain('spend/runtime ceilings')
    expect(screen).toContain('does not create a second scheduler')
    expect(control).not.toContain('allowed_tools')
    expect(control).not.toContain('requires_approval')
  })
})
