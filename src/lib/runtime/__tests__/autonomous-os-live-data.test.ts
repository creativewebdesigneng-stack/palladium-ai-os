import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const screen = readFileSync(new URL('../../../screens/AutonomousOS.jsx', import.meta.url), 'utf8')

describe('Autonomous OS live portfolio aggregation', () => {
  it('loads goals, runs, fleets, persisted events and operational health through server functions', () => {
    expect(screen).toContain('listAutonomousGoalRuns')
    expect(screen).toContain('listAutonomousFleetAssignments')
    expect(screen).toContain('listAutonomousGoalEvents')
    expect(screen).toContain('getAutonomousOperationsHealth')
    expect(screen).toContain('Promise.all([listFn(), listRunsFn(), listFleetsFn(), listEventsFn(), healthFn()])')
  })

  it('normalises the query result to the object shape consumed by the screen without synthetic events', () => {
    expect(screen).toContain('return { goals, runs, events, fleets, health };')
    expect(screen).not.toContain('return { goals, runs, events: [], fleets };')
    expect(screen).toContain('for (const run of data.runs ?? [])')
    expect(screen).toContain('for (const row of data.fleets ?? [])')
    expect(screen).toContain('Scheduler & guardrail event stream')
  })
})
