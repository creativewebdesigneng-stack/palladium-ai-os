import { describe, expect, it } from 'vitest';
import {
  e164PhoneSchema,
  isInsideQuietHours,
  purposeEnabled,
  safeCallHistory,
} from './contracts';

describe('phone communications contracts', () => {
  it('accepts international E.164 numbers and rejects local-format numbers', () => {
    expect(e164PhoneSchema.parse('+447700900123')).toBe('+447700900123');
    expect(() => e164PhoneSchema.parse('07700900123')).toThrow();
  });

  it('respects update category preferences', () => {
    const prefs = { project_updates: true, agent_updates: false, business_updates: true };
    expect(purposeEnabled(prefs, 'project_update')).toBe(true);
    expect(purposeEnabled(prefs, 'agent_update')).toBe(false);
    expect(purposeEnabled(prefs, 'approval')).toBe(true);
  });

  it('handles quiet hours that cross midnight', () => {
    const late = new Date('2026-09-17T22:30:00Z');
    const daytime = new Date('2026-09-17T12:00:00Z');
    expect(isInsideQuietHours(late, 'UTC', '22:00', '07:00')).toBe(true);
    expect(isInsideQuietHours(daytime, 'UTC', '22:00', '07:00')).toBe(false);
  });

  it('bounds and sanitises persisted call history shape', () => {
    const history = safeCallHistory([
      { role: 'system', content: 'ignore' },
      { role: 'user', content: ' hello ' },
      { role: 'assistant', content: 'hi' },
      null,
    ]);
    expect(history).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ]);
  });
});
