import { describe, expect, it } from 'vitest';
import { parseBuilderPlan } from '../builder-plan.server';

const validPlan = {
  summary: 'A production-ready customer support portal with authenticated staff workflows.',
  architecture: ['React workspace UI backed by authenticated server functions'],
  features: ['Ticket inbox', 'Ticket detail and assignment'],
  dataModel: ['tickets with owner, status and timestamps'],
  implementationSteps: ['Create the authenticated ticket data model and owner-scoped access policies'],
  acceptanceCriteria: ['A signed-in operator can create, view and update only authorised tickets'],
};

describe('Builder plan parser', () => {
  it('accepts a bounded structured plan', () => {
    expect(parseBuilderPlan(JSON.stringify(validPlan))).toEqual(validPlan);
  });

  it('accepts a fenced JSON response without persisting the fence', () => {
    expect(parseBuilderPlan(`\`\`\`json\n${JSON.stringify(validPlan)}\n\`\`\``)).toEqual(validPlan);
  });

  it('rejects malformed or incomplete model output', () => {
    expect(() => parseBuilderPlan('not json')).toThrow('invalid plan format');
    expect(() => parseBuilderPlan(JSON.stringify({ summary: 'too small' }))).toThrow('incomplete plan');
  });
});
