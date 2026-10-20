import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SIX_AGENT_BUSINESS_BLUEPRINT,
  prepareSixAgentBusinessDraft,
  businessBlueprintCriteria,
} from '../business-operations-blueprint';

const screen = readFileSync(new URL('../../../screens/AutonomousOS.jsx', import.meta.url), 'utf8');
const server = readFileSync(new URL('../autonomous-os.functions.ts', import.meta.url), 'utf8');

describe('governed six-agent business operations blueprint', () => {
  it('uses exactly six distinct roles and demands actual source evidence', () => {
    expect(SIX_AGENT_BUSINESS_BLUEPRINT.roles).toHaveLength(6);
    expect(new Set(SIX_AGENT_BUSINESS_BLUEPRINT.roles.map((role) => role.id)).size).toBe(6);
    for (const role of SIX_AGENT_BUSINESS_BLUEPRINT.roles) {
      expect(role.task.length).toBeGreaterThan(20);
      expect(role.evidence.length).toBeGreaterThan(10);
    }
  });

  it('prepares an opt-in, zero-spend, manually triggered existing Autonomous OS goal', () => {
    const draft = prepareSixAgentBusinessDraft();
    expect(draft.autonomy_level).toBe('assisted');
    expect(draft.trigger_type).toBe('manual');
    expect(draft.max_parallel_agents).toBe('6');
    expect(draft.budget_pounds).toBe('1.00');
    expect(draft.objective).toContain('unstaffed');
    expect(draft.objective).toContain('settlement/payment records');
    expect(draft.objective).toContain('emergency stop');
    for (const role of SIX_AGENT_BUSINESS_BLUEPRINT.roles) expect(draft.objective).toContain(role.name);
    expect(draft.objective.length).toBeLessThanOrEqual(12000);
  });

  it('only adds audit criteria for the opt-in preset; leaves ordinary goals unchanged', () => {
    expect(businessBlueprintCriteria(undefined)).toEqual({});
    expect(businessBlueprintCriteria('other')).toEqual({});
    const criteria = businessBlueprintCriteria(SIX_AGENT_BUSINESS_BLUEPRINT.id);
    expect(criteria['approval_required_for_external_actions']).toBe(true);
    expect(criteria['no_income_guarantees']).toBe(true);
    expect(criteria['max_specialist_roles']).toBe(6);
    expect(server).toContain('success_criteria: z.record(z.string(), z.unknown()).default({})');
    expect(screen).toContain('success_criteria: businessBlueprintCriteria(draft.blueprint_id)');
  });

  it('routes the preset only through the existing authenticated goal creator', () => {
    expect(screen).toContain('createFn({ data })');
    expect(screen).toContain('setDraft(prepareSixAgentBusinessDraft())');
    expect(screen).toContain('require_approval_for_external_actions: true');
    expect(screen).not.toContain('SIX_AGENT_BUSINESS_BLUEPRINT.roles.map((role) => runFn');
  });
});
