import { describe, expect, it } from 'vitest';
import { nangoConnectionReady } from './nango-connection-state';

describe('persisted Nango provider readiness', () => {
  it('marks only genuinely connected records with a usable connection ID ready', () => {
    expect(nangoConnectionReady({ status: 'connected', config: { connection_id: 'active-id' } })).toBe(true);
    expect(nangoConnectionReady({ status: 'connected', config: { connection_id: '   ' } })).toBe(false);
    expect(nangoConnectionReady({ status: 'connected', config: {} })).toBe(false);
    expect(nangoConnectionReady({ status: 'pending', config: { connection_id: 'old' } })).toBe(false);
    expect(nangoConnectionReady({ status: 'disconnected', config: { connection_id: 'old' } })).toBe(false);
    expect(nangoConnectionReady({ status: 'error', config: { connection_id: 'old' } })).toBe(false);
    expect(nangoConnectionReady(null)).toBe(false);
  });
});
