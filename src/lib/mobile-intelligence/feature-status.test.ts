import { describe, expect, it } from 'vitest';
import { isMobileFeatureFullyCertified, mobileFeatureCompletion } from './feature-status';

describe('mobile feature certification', () => {
  it('does not call server-only implementation fully certified', () => {
    const status = { serverCoreReady: true, persistenceReady: true, iosNativeCertified: false, androidNativeCertified: false };
    expect(mobileFeatureCompletion(status)).toBe(50);
    expect(isMobileFeatureFullyCertified(status)).toBe(false);
  });
});
