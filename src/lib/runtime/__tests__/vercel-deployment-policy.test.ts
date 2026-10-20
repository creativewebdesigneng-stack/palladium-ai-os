import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const configPath = new URL('../../../../vercel.json', import.meta.url);

describe('Vercel Git deployment rate-limit controls', () => {
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
    git?: { deploymentEnabled?: Record<string, boolean> | boolean };
  };

  it('preserves automatic production builds on main', () => {
    const rules = config.git?.deploymentEnabled;
    expect(typeof rules).toBe('object');
    if (typeof rules !== 'object' || rules === null) throw new Error('Missing branch rules');
    expect(rules['main']).toBe(true);
  });

  it('requires deliberate Preview creation for frequent non-production branches', () => {
    const rules = config.git?.deploymentEnabled;
    if (typeof rules !== 'object' || rules === null) throw new Error('Missing branch rules');
    expect(rules['feature/**']).toBe(false);
    expect(rules['repair/**']).toBe(false);
    expect(rules['ops/**']).toBe(false);
  });

  it('retains preexisting dependabot and internal branch restrictions', () => {
    const rules = config.git?.deploymentEnabled;
    if (typeof rules !== 'object' || rules === null) throw new Error('Missing branch rules');
    expect(rules['dependabot/**']).toBe(false);
    expect(rules['internal-*']).toBe(false);
  });

  it('leaves staging and explicitly designated release branches unaffected', () => {
    const rules = config.git?.deploymentEnabled;
    if (typeof rules !== 'object' || rules === null) throw new Error('Missing branch rules');
    expect(rules['staging']).not.toBe(false);
    expect(rules['release/**']).not.toBe(false);
  });
});
