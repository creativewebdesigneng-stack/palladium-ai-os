import { describe, expect, it } from 'vitest';
import { buildWorkforceOperatingState } from '../workforce-os';

const base = () => ({
  workforces: [{ id: 'wf-1', status: 'active' }],
  memberships: [{ workforce_id: 'wf-1', agent_id: 'agent-1' }],
  workflowRuns: [{ id: 'run-1', status: 'running' }],
  fleetAssignments: [{ id: 'fleet-1', agent_id: 'agent-1', status: 'active' }],
  approvals: [] as Array<{ id: string; status: string; agent_id: string }>,
  identities: [{ id: 'identity-1', agent_id: 'agent-1', status: 'active' }],
  passports: [{ id: 'passport-1', identity_id: 'identity-1', autonomy_tier: 'guarded', risk_tier: 'medium' }],
  delegations: [{ id: 'grant-1', status: 'active', expires_at: '2027-01-01T00:00:00.000Z' }],
});

describe('buildWorkforceOperatingState', () => {
  it('reports a fully governed workforce', () => {
    const state = buildWorkforceOperatingState(base(), new Date('2026-09-04T10:00:00.000Z'));
    expect(state.stats).toMatchObject({
      workforces: 1,
      activeWorkforces: 1,
      assignedAgents: 1,
      passportCoverage: 100,
      liveWorkflowRuns: 1,
      activeFleetAssignments: 1,
      activeDelegations: 1,
    });
    expect(state.governance.healthy).toBe(true);
    expect(state.governance.uncoveredAgentIds).toEqual([]);
  });

  it('fails workforce coverage when an assigned agent lacks an active passport boundary', () => {
    const input = base();
    input.passports = [];
    const state = buildWorkforceOperatingState(input, new Date('2026-09-04T10:00:00.000Z'));
    expect(state.stats.passportCoverage).toBe(0);
    expect(state.governance.healthy).toBe(false);
    expect(state.governance.uncoveredAgentIds).toEqual(['agent-1']);
    expect(state.governance.risks[0]).toMatchObject({ code: 'IDENTITY_COVERAGE_GAP', severity: 'critical', count: 1 });
  });

  it('does not count expired delegation grants as active', () => {
    const input = base();
    input.delegations = [{ id: 'grant-1', status: 'active', expires_at: '2026-01-01T00:00:00.000Z' }];
    const state = buildWorkforceOperatingState(input, new Date('2026-09-04T10:00:00.000Z'));
    expect(state.stats.activeDelegations).toBe(0);
  });

  it('surfaces approvals and high-risk passports as warnings', () => {
    const input = base();
    input.approvals = [{ id: 'approval-1', status: 'pending', agent_id: 'agent-1' }];
    input.passports = [{ id: 'passport-1', identity_id: 'identity-1', autonomy_tier: 'autonomous', risk_tier: 'critical' }];
    const state = buildWorkforceOperatingState(input, new Date('2026-09-04T10:00:00.000Z'));
    expect(state.stats.pendingApprovals).toBe(1);
    expect(state.stats.highAutonomyPassports).toBe(1);
    expect(state.governance.risks.map((risk) => risk.code)).toEqual(['APPROVAL_QUEUE', 'HIGH_RISK_AUTONOMY']);
    expect(state.governance.healthy).toBe(true);
  });
});
