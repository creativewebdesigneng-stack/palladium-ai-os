import type { Provider } from '@/lib/runtime/model-gateway.base';

/** Canonical model IDs for the existing wizard; labels are never API inputs. */
export const AGENT_MODEL_CHOICES: Record<string, { provider: Provider; model: string }> = {
  gpt: { provider: 'openai', model: 'gpt-5-mini' },
  claude: { provider: 'anthropic', model: 'claude-sonnet-4-5-20250929' },
  gemini: { provider: 'gemini', model: 'gemini-3.6-flash' },
  deepseek: { provider: 'deepseek', model: 'deepseek-chat' },
  llama: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  'groq-oss-120b': { provider: 'groq', model: 'openai/gpt-oss-120b' },
  'groq-oss-20b': { provider: 'groq', model: 'openai/gpt-oss-20b' },
};

export function normaliseAgentModelSelection(provider?: string | null, model?: string | null) {
  const requested = (model ?? '').trim();
  // Recover only the exact display labels emitted by the original wizard.
  // This selects the named provider; availability/entitlements are still checked.
  const legacy: Record<string, string> = { 'GPT-5': 'gpt', Claude: 'claude', Gemini: 'gemini', DeepSeek: 'deepseek', Llama: 'llama' };
  const choice = AGENT_MODEL_CHOICES[legacy[requested] ?? ''];
  if (choice) return { ...choice };
  const selected = (provider ?? 'openai').trim().toLowerCase();
  if (!['lovable', 'openai', 'anthropic', 'gemini', 'groq', 'deepseek', 'compatible'].includes(selected)) {
    throw new Error('Unknown AI model provider. Select a supported provider.');
  }
  if (!['lovable', 'groq', 'compatible'].includes(selected)) {
    const family = requested.startsWith('gemini-') ? 'gemini'
      : requested.startsWith('claude-') ? 'anthropic'
      : /^(gpt-|o[134]-)/.test(requested) ? 'openai'
      : requested.startsWith('deepseek-') ? 'deepseek' : null;
    if (family && family !== selected) throw new Error('The model ID does not match its provider. Choose the provider and model together.');
  }
  return { provider: selected as Provider, model: requested };
}
