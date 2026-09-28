import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const screen=readFileSync(new URL('../../../screens/Workforce.jsx',import.meta.url),'utf8');
const scene=readFileSync(new URL('../../../components/workforce/WorkforceConstellation.jsx',import.meta.url),'utf8');

describe('Workforce live constellation',()=>{
  it('is wired to the existing workforce data',()=>{
    expect(screen).toContain("import WorkforceConstellation from '@/components/workforce/WorkforceConstellation'");
    expect(screen).toContain('<WorkforceConstellation agents={wfAgents} tasks={tasks} teams={teams} />');
  });

  it('derives execution from persisted task statuses instead of decorative state',()=>{
    expect(scene).toContain("const LIVE_TASKS=new Set(['running','queued','waiting_for_approval','awaiting_approval'])");
    expect(scene).toContain('activeIds.has(agent.id)');
    expect(scene).toContain("executing?'executing':'ready'");
  });

  it('respects reduced motion and provides a mobile fallback',()=>{
    expect(scene).toContain('useReducedMotion');
    expect(scene).toContain('reduced||!executing?undefined');
    expect(scene).toContain('md:hidden');
  });
});
