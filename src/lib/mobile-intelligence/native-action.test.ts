import { describe, expect, it } from 'vitest';
import { validateNativeMobileAction } from './native-action';

describe('native mobile actions', () => {
  it('accepts namespaced action identifiers', () => {
    expect(validateNativeMobileAction({ action: 'blackstar.note.create', arguments: { title: 'Test' } }).action).toBe('blackstar.note.create');
  });
  it('rejects unsafe identifiers and oversized arguments', () => {
    expect(() => validateNativeMobileAction({ action: '../settings', arguments: {} })).toThrow();
    expect(() => validateNativeMobileAction({ action: 'blackstar.test', arguments: { value: 'x'.repeat(17_000) } })).toThrow();
  });
});
