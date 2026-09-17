import { describe, expect, it } from 'vitest';
import { isCompatibleMobileBridgeVersion, MOBILE_BRIDGE_PROTOCOL_VERSION } from './compatibility';

describe('mobile bridge compatibility', () => {
  it('accepts only the current protocol version', () => {
    expect(isCompatibleMobileBridgeVersion(MOBILE_BRIDGE_PROTOCOL_VERSION)).toBe(true);
    expect(isCompatibleMobileBridgeVersion(0)).toBe(false);
    expect(isCompatibleMobileBridgeVersion(2)).toBe(false);
  });
});
