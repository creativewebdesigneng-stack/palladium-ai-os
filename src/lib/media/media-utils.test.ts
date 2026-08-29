import { describe, expect, it } from 'vitest';
import { normalizeMediaJobStatus } from './media-utils';

describe('normalizeMediaJobStatus', () => {
  it.each(['completed', 'complete', 'ready', 'success'])('maps %s to completed', (status) => {
    expect(normalizeMediaJobStatus(status)).toBe('completed');
  });

  it.each(['failed', 'error', 'cancelled'])('maps %s to failed', (status) => {
    expect(normalizeMediaJobStatus(status)).toBe('failed');
  });

  it.each(['running', 'processing', 'active'])('maps %s to running', (status) => {
    expect(normalizeMediaJobStatus(status)).toBe('running');
  });

  it('uses queued for unknown or missing states', () => {
    expect(normalizeMediaJobStatus('pending')).toBe('queued');
    expect(normalizeMediaJobStatus(undefined)).toBe('queued');
  });
});
