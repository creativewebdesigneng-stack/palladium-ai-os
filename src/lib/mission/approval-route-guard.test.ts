import { describe, expect, it } from 'vitest';
import { assertGenericApprovalCanDecide } from './approval-route-guard';

describe('generic approval route guard', () => {
  it('refuses browser approvals before the generic handler can mark them approved', () => {
    expect(() => assertGenericApprovalCanDecide('agent_browser_task'))
      .toThrow(/dedicated executable approval handler/);
  });

  it.each(['purchase', 'booking', 'external_action', 'personal_task_tool'])(
    'preserves existing generic handling for %s',
    (type) => expect(() => assertGenericApprovalCanDecide(type)).not.toThrow(),
  );
});
