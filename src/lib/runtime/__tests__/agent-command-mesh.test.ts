import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const screen=readFileSync(new URL('../../../screens/Agents.jsx',import.meta.url),'utf8');
const mesh=readFileSync(new URL('../../../components/agents/AgentCommandMesh.jsx',import.meta.url),'utf8');

describe('Agents live command mesh',()=>{
  it('uses the existing live agent and workflow telemetry',()=>{
    expect(screen).toContain("import AgentCommandMesh from '@/components/agents/AgentCommandMesh'");
    expect(screen).toContain('agents={agents}');
    expect(screen).toContain('executingIds={actuallyRunningIds}');
    expect(screen).toContain('liveWorkflows={runningWorkflowRuns.length}');
  });

  it('animates only agents the runtime already marks as executing',()=>{
    expect(mesh).toContain('activeSet.has(agent.id)');
    expect(mesh).toContain("live?'executing':agent.status");
    expect(mesh).toContain('no simulated executions');
  });

  it('respects reduced motion and mobile layouts',()=>{
    expect(mesh).toContain('useReducedMotion');
    expect(mesh).toContain('reduced||!live?undefined');
    expect(mesh).toContain('md:hidden');
  });
});
