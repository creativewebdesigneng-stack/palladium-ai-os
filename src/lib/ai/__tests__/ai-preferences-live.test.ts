import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveAssistantModelPreference } from '@/lib/ai/ai-preferences.server';

const originalEnv = { ...process.env };
const readRepo = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('live AI preferences', () => {
  it('uses an owner preference when its provider is configured', () => {
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.ASSISTANT_PROVIDER;
    delete process.env.ASSISTANT_MODEL;

    expect(resolveAssistantModelPreference({ default_provider: 'openai', default_model: 'gpt-5-mini' })).toEqual({
      provider: 'openai',
      model: 'gpt-5-mini',
      source: 'user',
    });
  });

  it('falls back to deployment defaults when the saved provider is unavailable', () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.ASSISTANT_PROVIDER = 'openai';
    process.env.ASSISTANT_MODEL = 'gpt-5-mini';

    expect(resolveAssistantModelPreference({ default_provider: 'anthropic', default_model: 'claude-sonnet-4-5-20250929' })).toEqual({
      provider: 'openai',
      model: 'gpt-5-mini',
      source: 'deployment',
    });
  });

  it('keeps preference rows owner-scoped and wires the live assistant to them', () => {
    const migration = readRepo('supabase/migrations/20260815231000_user_ai_preferences.sql');
    const assistant = readRepo('src/lib/ai/assistant.functions.ts');
    const settings = readRepo('src/components/settings/AIPreferencesSection.jsx');

    expect(migration).toContain('auth.uid() = user_id');
    expect(migration).toContain('enable row level security');
    expect(assistant).toContain('user_ai_preferences');
    expect(assistant).toContain('resolveAssistantModelPreference');
    expect(settings).toContain('Save AI defaults');
    expect(settings).not.toContain('Not configured yet');
  });
});
