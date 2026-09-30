import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const resetScreen = readFileSync(
  new URL('../../screens/ResetPassword.jsx', import.meta.url),
  'utf8',
);

describe('Blackstar password recovery flow', () => {
  it('does not require a custom reset token query parameter', () => {
    expect(resetScreen).not.toContain('useSearchParams');
    expect(resetScreen).not.toContain('searchParams.get("token")');
    expect(resetScreen).not.toContain('resetToken');
  });

  it('waits for the authenticated Supabase recovery session before changing password', () => {
    expect(resetScreen).toContain('auth.getSession()');
    expect(resetScreen).toContain('auth.onAuthStateChange');
    expect(resetScreen).toContain('recoverySessionReady');
    expect(resetScreen).toContain('No active Supabase recovery session');
  });

  it('ends the recovery session after a successful password reset', () => {
    expect(resetScreen).toContain('await auth.resetPassword({ newPassword })');
    expect(resetScreen).toContain('await auth.logout()');
    expect(resetScreen).toContain('window.location.href = "/login"');
  });
});
