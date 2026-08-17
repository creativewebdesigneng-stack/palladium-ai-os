import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');

describe('live research contract', () => {
  it('routes Research through live web search and a real model provider', () => {
    const backend = read('lib/ai/research.functions.ts');
    expect(backend).toContain('searchPublicWeb(data.query, 8)');
    expect(backend).toContain('runChat({');
    expect(backend).toContain('isProviderConfigured("groq")');
    expect(backend).toContain('Never invent sources');
  });

  it('renders the real research server function and source URLs in the UI', () => {
    const screen = read('screens/Research.jsx');
    expect(screen).toContain('runResearch');
    expect(screen).toContain("researchFn({ data: { query: value } })");
    expect(screen).toContain('result.report');
    expect(screen).toContain('result.sources');
    expect(screen).toContain('href={source.url}');
    expect(screen).not.toContain('Research provider required');
    expect(screen).not.toContain('Live web research is not connected yet');
  });
});
