import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const route = readFileSync(
  new URL('../../routes/_shell/_app/cinema-studio.tsx', import.meta.url),
  'utf8',
);

describe('Cinema Studio route metadata', () => {
  it('uses a dedicated Blackstar title and description', () => {
    expect(route).toContain("title: 'Cinema Studio — Blackstar'");
    expect(route).toContain('Blackstar Cinema Studio');
    expect(route).toContain("property: 'og:title'");
    expect(route).toContain("name: 'twitter:card'");
  });
});
