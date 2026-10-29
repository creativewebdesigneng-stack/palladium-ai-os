import { describe, expect, it } from 'vitest';
import { agentWizardSettings } from '../agent-wizard-settings';

const fixture = { model: 'astra-native', mem: { short: true }, tools: ['browser'] };
const browserTool = { slug: 'browser', name: 'Browser', is_active: true, executable: true };

describe('Astra native wizard model assignment (QA)', () => {
  it('pins the server-configured local model, not an external provider or the local-model placeholder', () => {
    expect(agentWizardSettings({ ...fixture, nativeModel: 'qwen3:8b-q4_K_M' }, [browserTool])).toEqual({
      model_provider: 'compatible', model: 'qwen3:8b-q4_K_M',
      memory_enabled: true, allowed_tools: ['browser'],
    });
  });

  it('fails closed without a valid runtime model rather than guessing', () => {
    for (const value of [undefined, '', 'local-model', 'model with spaces', '../evil', 'x'.repeat(130)]) {
      expect(() => agentWizardSettings({ ...fixture, nativeModel: value }, [browserTool])).toThrow(/not configured/i);
    }
  });

  it('does not override tool-grant restrictions or affect existing model choices', () => {
    expect(() => agentWizardSettings({ ...fixture, nativeModel: 'qwen3:8b-q4_K_M' }, [])).toThrow(/unavailable/i);
    expect(agentWizardSettings({ ...fixture, model: 'groq-oss-20b' }, [browserTool])).toMatchObject({
      model_provider: 'groq', model: 'openai/gpt-oss-20b',
    });
  });
});
