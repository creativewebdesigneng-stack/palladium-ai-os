import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Blackstar public auth surface contract', () => {
  it('does not present a fake standalone MFA verifier', () => {
    const screen = read('../../screens/TwoFactor.jsx');
    const route = read('../../routes/two-factor.tsx');

    expect(screen).not.toContain('Enter the six-digit code');
    expect(screen).not.toContain('Verify and continue');
    expect(screen).not.toContain('Use a recovery code');
    expect(screen).not.toContain('to="/onboarding"');
    expect(screen).toContain('not connected to a standalone MFA verifier');
    expect(route).toContain('noindex, nofollow');
  });
});
