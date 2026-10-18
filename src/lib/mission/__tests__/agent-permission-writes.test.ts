import { describe, expect, it } from 'vitest';
import { personalAgentPermissionWrites } from '../agent-permission-writes';
const previous = [{ tool: 'browser_task', enabled: false, requires_approval: true, allowed_domains: ['httpbingo.org'], spend_cap: 3 }];
describe('existing personal agent policy preservation', () => {
  it('does not reset a saved policy when editing agent details', () => {
    expect(personalAgentPermissionWrites({ tools: ['browser_task'], previous })).toEqual([]);
  });
  it('updates explicit domains without removing denial/approval/spend controls', () => {
    expect(personalAgentPermissionWrites({ tools: ['browser_task'], previous, domains: ['example.org'] })).toEqual([{ ...previous[0], allowed_domains: ['example.org'] }]);
  });
  it('requires explicit restrictions for newly assigned browser tools', () => {
    expect(() => personalAgentPermissionWrites({ tools: ['browser_task'], previous: [] })).toThrow('explicit');
  });
  it('does not write policies for removed tools', () => {
    expect(personalAgentPermissionWrites({ tools: [], previous, domains: ['example.org'] })).toEqual([]);
  });
});
