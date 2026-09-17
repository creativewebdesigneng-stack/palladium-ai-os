import { describe, expect, it } from 'vitest';
import { mayTransferDeviceContext } from './security';

const request = { requestId: 'r', deviceId: 'd', capability: 'camera_context' as const, risk: 'medium' as const, input: {} };

describe('mobile device context privacy', () => {
  it('keeps sensitive context local without explicit authorization', () => {
    expect(mayTransferDeviceContext(request, false).allowed).toBe(false);
  });
  it('allows explicitly authorized transfer', () => {
    expect(mayTransferDeviceContext(request, true).allowed).toBe(true);
  });
});
