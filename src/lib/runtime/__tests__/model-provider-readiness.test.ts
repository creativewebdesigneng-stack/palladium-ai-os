import { afterEach, describe, expect, it, vi } from 'vitest';
import { isModelProviderConfigured, listModelProviderDefinitions } from '../model-providers.server';
afterEach(() => vi.unstubAllEnvs());
describe('shared provider readiness', () => {
  it.each([['gemini', 'GEMINI_API_KEY', 'gemini-3.6-flash'], ['groq', 'GROQ_API_KEY', 'openai/gpt-oss-120b']] as const)('includes %s with credential-backed readiness', (provider, key, model) => {
    vi.stubEnv(key, '');
    expect(isModelProviderConfigured(provider)).toBe(false);
    vi.stubEnv(key, 'synthetic-key');
    expect(isModelProviderConfigured(provider)).toBe(true);
    expect(listModelProviderDefinitions().find(row => row.id === provider)?.defaultModel).toBe(model);
  });
});
