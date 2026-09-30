import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const shell = read('../../routes/_shell.tsx');
const landing = read('../../routes/index.tsx');

describe('Blackstar protected route search indexing', () => {
  it('marks the authenticated shell noindex and nofollow', () => {
    expect(shell).toContain('{ name: "robots", content: "noindex,nofollow" }');
  });

  it('keeps auth, verification, onboarding and checkout routes out of search results', () => {
    for (const route of [
      'login',
      'register',
      'forgot-password',
      'reset-password',
      'email-verification',
      'onboarding',
      'payment',
    ]) {
      expect(read(`../../routes/${route}.tsx`)).toContain(
        '{ name: "robots", content: "noindex,nofollow" }',
      );
    }

    expect(read('../../routes/two-factor.tsx')).toMatch(
      /name:\s*["']robots["']\s*,\s*content:\s*["']noindex,\s*nofollow["']/,
    );
  });

  it('does not apply the protected-shell directive to the public landing route', () => {
    expect(landing).not.toContain('noindex,nofollow');
  });
});
