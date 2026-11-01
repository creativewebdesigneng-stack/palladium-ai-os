import { describe, expect, it } from 'vitest';
import {
  WORKFORCE_PILOT_BLUEPRINTS,
  buildWorkforcePilotPlanningOutline,
} from '../workforce-pilot';

describe('Enterprise Workforce buyer-facing pilot planning (not live acceptance)', () => {
  it('defines exactly three distinct, supervised candidate workflows', () => {
    expect(WORKFORCE_PILOT_BLUEPRINTS.map(x => x.id)).toEqual([
      'research_briefing', 'customer_triage_draft', 'engineering_qa_draft',
    ]);
    expect(new Set(WORKFORCE_PILOT_BLUEPRINTS.map(x => x.id)).size).toBe(3);
    for (const blueprint of WORKFORCE_PILOT_BLUEPRINTS) {
      expect(blueprint.businessOutcome.length).toBeGreaterThan(35);
      expect(blueprint.buyerPrerequisites.length).toBeGreaterThan(35);
      expect(blueprint.supervision.toLowerCase()).toMatch(/human|approval/);
      expect(blueprint.fourAcceptanceTrials).toHaveLength(4);
      expect(blueprint.fourAcceptanceTrials[1].toLowerCase()).toMatch(/reject/);
      expect(blueprint.fourAcceptanceTrials[2].toLowerCase()).toMatch(/blocked|denied/);
    }
  });

  it('generates a buyer-editable, explicitly nonbinding plan without claiming live tools', () => {
    for (const blueprint of WORKFORCE_PILOT_BLUEPRINTS) {
      const outline = buildWorkforcePilotPlanningOutline(blueprint);
      expect(outline).toContain(blueprint.title);
      expect(outline).toContain(blueprint.buyerPrerequisites);
      expect(outline).toContain(blueprint.forbiddenActions);
      blueprint.fourAcceptanceTrials.forEach(trial => expect(outline).toContain(trial));
      expect(outline).toMatch(/NOT ACCEPTANCE EVIDENCE/);
      expect(outline).toMatch(/No tool grants, agent execution, purchases/);
      expect(outline).not.toMatch(/certified deployment|payment completed|guaranteed roi/i);
    }
  });
});
