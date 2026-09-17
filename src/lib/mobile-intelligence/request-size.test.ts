import { describe, expect, it } from 'vitest';
import { assertMobileRequestSize } from './request-size';

describe('mobile request size', () => {
  it('accepts bounded requests and rejects oversized payloads', () => {
    expect(() => assertMobileRequestSize({ value: 'small' }, 100)).not.toThrow();
    expect(() => assertMobileRequestSize({ value: 'x'.repeat(200) }, 100)).toThrow('Mobile request payload too large');
  });
});
