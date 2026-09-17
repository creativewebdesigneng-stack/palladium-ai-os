import { describe, expect, it } from 'vitest';
import { failedMobileResult } from './result';

describe('mobile execution results', () => {
  it('creates explicit failure results without inventing output', () => {
    expect(failedMobileResult('r', 'astra', 'provider_unavailable')).toEqual({ requestId: 'r', status: 'failed', executionTarget: 'astra', errorCode: 'provider_unavailable' });
  });
});
