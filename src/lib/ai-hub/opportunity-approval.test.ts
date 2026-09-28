import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const approval=readFileSync(new URL('./opportunity-approval.functions.ts',import.meta.url),'utf8');
const screen=readFileSync(new URL('../../../screens/AutonomousOS.jsx',import.meta.url),'utf8');

describe('Autonomous OS governed opportunity approvals',()=>{
  it('recomputes the owner-scoped opportunity before opening an approval',()=>{
    expect(approval).toContain('requireSupabaseAuth');
    expect(approval).toContain("from('autonomous_goals')");
    expect(approval).toContain("from('personal_agents')");
    expect(approval).toContain("from('workflows')");
    expect(approval).toContain('buildOpportunityActionCards');
  });

  it('uses the existing AI Hub approval gate without executing the route',()=>{
    expect(approval).toContain('createAiHubApprovalGate');
    expect(approval).toContain('gate.request(stage.plan');
    expect(approval).not.toContain('.execute(');
    expect(approval).not.toContain("execution_status: 'executing'");
  });

  it('only offers approval for approval-gated recommendations and says no action executed',()=>{
    expect(screen).toContain('requestBlackstarOpportunityApproval');
    expect(screen).toContain("action.routingStatus !== 'waiting_for_approval'");
    expect(screen).toContain('Request Mission Control approval');
    expect(screen).toContain('No action has executed.');
  });
});
