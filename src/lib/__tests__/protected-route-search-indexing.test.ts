import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const shell = readFileSync(new URL('../../routes/_shell.tsx', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../../routes/index.tsx', import.meta.url), 'utf8');

describe('Blackstar protected route search indexing', () => {
  it('marks the authenticated shell noindex and nofollow', () => {
    expect(shell).toContain('{ name: "robots", content: "noindex,nofollow" }');
  });

  it('does not apply the protected-shell directive to the public landing route', () => {
    expect(landing).not.toContain('noindex,nofollow');
  });
});
