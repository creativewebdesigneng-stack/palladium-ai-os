import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const screen=readFileSync(new URL('../../../screens/AutonomousOS.jsx',import.meta.url),'utf8');

describe('Autonomous OS live portfolio aggregation',()=>{
  it('loads goals, runs and fleet assignments through their existing server functions',()=>{
    expect(screen).toContain('listAutonomousGoalRuns');
    expect(screen).toContain('listAutonomousFleetAssignments');
    expect(screen).toContain('Promise.all([listFn(), listRunsFn(), listFleetsFn()])');
  });

  it('normalises the query result to the object shape consumed by the screen',()=>{
    expect(screen).toContain('return { goals, runs, events: [], fleets };');
    expect(screen).toContain('for (const run of data.runs ?? [])');
    expect(screen).toContain('for (const row of data.fleets ?? [])');
  });
});
