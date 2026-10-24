import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { planSixAgentBusinessTeam } from '../six-agent-business-plan';
import type { OrchestratorCandidate } from '@/lib/agents/agent-orchestrator';

const goal = 'Run a review-only evidence-led business validation experiment.';
const make = (id: string, tools: string[]): OrchestratorCandidate => ({
  id,
  name: id,
  allowed_tools: tools,
});
const candidates = [
  make('web-agent', ['web_search']),
  make('data-agent', ['data_analysis']),
  make('delivery-agent', ['file_analysis']),
  make('growth-agent', ['web_fetch']),
  make('support-agent', ['email_draft']),
  make('finance-agent', ['calculator']),
];

const orchestrator = readFileSync(new URL('../orchestrator.server.ts', import.meta.url), 'utf8');
const manual = readFileSync(new URL('../autonomous-os.manual.functions.ts', import.meta.url), 'utf8');
const scheduler = readFileSync(new URL('../autonomous-os.scheduler.server.ts', import.meta.url), 'utf8');
const workflowEngine = readFileSync(new URL('../workforce.server.ts', import.meta.url), 'utf8');

describe('six-agent mission deterministic orchestration', () => {
  it('staffs six distinct eligible agents without model hallucination', () => {
    const plan = planSixAgentBusinessTeam({ providerConfiguredAgentIds: candidates.map((candidate) => candidate.id),  goal, candidates, maxAssignments: 6 });
    expect(plan.version).toBe(1);
    expect(plan.assignments).toHaveLength(6);
    expect(new Set(plan.assignments.map((item) => item.agent_id)).size).toBe(6);
    expect(new Set(plan.assignments.map((item) => item.id)).size).toBe(6);
    expect(plan.assignments.every((item) => item.requires_approval === true)).toBe(true);
    for (const assignment of plan.assignments) {
      expect(assignment.success_criteria).toContain('No unapproved external side effects; report execution and provider blockers.');
      expect(assignment.objective).toContain('verified independent payment/settlement evidence');
    }
  });

  it('includes valid noncyclic dependencies and reconciles finance last', () => {
    const plan = planSixAgentBusinessTeam({ providerConfiguredAgentIds: candidates.map((candidate) => candidate.id),  goal, candidates, maxAssignments: 6 });
    const positions = new Map(plan.assignments.map((value, index) => [value.id, index]));
    for (const assignment of plan.assignments) {
      for (const dependency of assignment.depends_on) {
        expect(positions.has(dependency)).toBe(true);
        expect(positions.get(dependency)!).toBeLessThan(positions.get(assignment.id)!);
      }
    }
    expect(plan.assignments.find((item) => item.id === 'audit')?.depends_on)
      .toEqual(['production', 'marketing', 'operations']);
  });

  it('fails closed instead of pretending that one agent supplies a six-agent team', () => {
    expect(() => planSixAgentBusinessTeam({ providerConfiguredAgentIds: candidates.map((candidate) => candidate.id), 
      goal, candidates: [make('generalist', ['web_search', 'data_analysis', 'file_analysis', 'email_draft', 'calculator'])],
      maxAssignments: 6,
    })).toThrow(/1\/6 roles/);
    expect(() => planSixAgentBusinessTeam({ providerConfiguredAgentIds: candidates.map((candidate) => candidate.id),  goal, candidates, maxAssignments: 5 }))
      .toThrow(/needs 6 assignments/);
  });

  it('reports missing capabilities as blockers and does not create incomplete workflows', () => {
    expect(() => planSixAgentBusinessTeam({ providerConfiguredAgentIds: candidates.map((candidate) => candidate.id), 
      goal, candidates: candidates.filter((agent) => agent.id !== 'support-agent'), maxAssignments: 6,
    })).toThrow(/Missing grants: Customer & Operations/);
    expect(orchestrator).toContain('businessBlueprintId === SIX_AGENT_BUSINESS_BLUEPRINT.id');
    expect(orchestrator).toContain('await persistGeneratedWorkflow');
    expect(orchestrator).toContain('await createDelegationPlan');
    expect(orchestrator).toContain('planSixAgentBusinessTeam');
  });

  it('fails closed when tools are assigned but the selected model providers are unavailable', () => {
    expect(() => planSixAgentBusinessTeam({
      goal, candidates, maxAssignments: 6,
      providerConfiguredAgentIds: [],
    })).toThrow(/0\/6 distinct roles/);
    expect(() => planSixAgentBusinessTeam({
      goal, candidates, maxAssignments: 6,
      providerConfiguredAgentIds: candidates.slice(0, 5).map((agent) => agent.id),
    })).toThrow(/5\/6 distinct roles/);
  });

  it('assigns a configured model-capable alternative, never the unconfigured first match', () => {
    const alt = make('configured-web-alternative', ['web_search']);
    const plan = planSixAgentBusinessTeam({
      goal,
      candidates: [candidates[0]!, alt, ...candidates.slice(1)],
      maxAssignments: 6,
      providerConfiguredAgentIds: [alt.id, ...candidates.slice(1).map((agent) => agent.id)],
    });
    const selectedIds = new Set(plan.assignments.map((role) => role.agent_id));
    expect(selectedIds.has(candidates[0]!.id)).toBe(false);
    expect(selectedIds.has(alt.id)).toBe(true);
    expect(plan.assignments).toHaveLength(6);
    expect(new Set(plan.assignments.map((role) => role.agent_id)).size).toBe(6);
  });

  it('checks provider availability through existing owner-scoped resolver before persistence', () => {
    expect(orchestrator).toContain('isProviderAvailableForUser({ userId: args.userId, provider })');
    expect(orchestrator).toContain('providerConfiguredAgentIds');
    expect(orchestrator.indexOf('isProviderAvailableForUser({ userId: args.userId, provider })'))
      .toBeLessThan(orchestrator.indexOf('await persistGeneratedWorkflow'));
    expect(orchestrator).not.toContain('process.env["GROQ_API_KEY"]');
  });

  it('uses an executable owner approval step before the first agent, not just inert agent flags', () => {
    expect(orchestrator).toContain('const approvalGateId = args.businessApprovalGate ? crypto.randomUUID() : null');
    expect(orchestrator).toContain('const dependencies = approvalGateId && declaredDependencies.length === 0');
    expect(orchestrator).toContain('kind: "approval"');
    expect(orchestrator).toContain('approvalStep ? [approvalStep, ...steps] : steps');
    expect(orchestrator).toContain('businessApprovalGate: args.businessBlueprintId === SIX_AGENT_BUSINESS_BLUEPRINT.id');
    expect(orchestrator).toContain('requires_approval: true');
    expect(workflowEngine).toContain('if (step.kind === "approval")');
    expect(workflowEngine).toContain('pauseForWorkflowApproval({');
  });

  it('enforces the same persisted-blueprint marker in manual and scheduled execution', () => {
    expect(manual).toContain('success_criteria?.blueprint_id === SIX_AGENT_BUSINESS_BLUEPRINT.id');
    expect(scheduler).toContain('success_criteria?.blueprint_id === SIX_AGENT_BUSINESS_BLUEPRINT.id');
    expect(manual).toContain('businessBlueprintId:');
    expect(scheduler).toContain('businessBlueprintId:');
    expect(manual).toContain('queueWorkflowRun');
    expect(scheduler).toContain('queueWorkflowRun');
    expect(manual).toContain('.eq("user_id", context.userId)');
    expect(scheduler).toContain('const prepared = await planOrchestratedGoal');
  });
});
