import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Blackstar public legal publication contract', () => {
  it('does not publish the previous unreviewed legal and security promises', () => {
    const legalData = read('../../components/site/legalData.jsx');

    for (const unsupported of [
      '@palladium.ai',
      'SOC 2',
      'ISO 27001',
      'AES-256',
      'within 30 days',
      'available under NDA',
      'responsible disclosure programme',
      'AI Safety Committee',
    ]) {
      expect(legalData).not.toContain(unsupported);
    }
  });

  it('marks public legal documents as drafts that are not in force', () => {
    const screen = read('../../screens/Legal.jsx');
    const route = read('../../routes/legal.$slug.tsx');

    expect(screen).toContain('Draft — not in force');
    expect(screen).toContain('Publication pending review');
    expect(route).toContain('noindex, nofollow');
    expect(route).toContain('not yet in force');
  });
});
