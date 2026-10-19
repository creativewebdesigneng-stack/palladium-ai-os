import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderError, normaliseProvider, resolveModel, runChat, streamChat } from '../model-gateway.base';
import { isModelProviderConfigured, listModelProviderDefinitions } from '../model-providers.server';
import {
  NVIDIA_NIM_HOSTED_BASE_URL, nvidiaNimBaseUrl, nvidiaNimConfigured,
  nvidiaDellInfrastructureReadiness,
} from '../nvidia-dell-infrastructure.server';
import { normaliseAgentModelSelection } from '@/lib/agents/agent-model-selection';

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('NVIDIA NIM as an existing Blackstar model gateway provider', () => {
  it('registers a genuine separate provider and canonical agent model choice', () => {
    expect(normaliseProvider('NVIDIA-NIM')).toBe('nvidia');
    expect(resolveModel('nvidia', '')).toBe('openai/gpt-oss-20b');
    expect(normaliseAgentModelSelection('nvidia', 'openai/gpt-oss-20b'))
      .toEqual({ provider: 'nvidia', model: 'openai/gpt-oss-20b' });
    expect(listModelProviderDefinitions().find(x => x.id === 'nvidia'))
      .toMatchObject({ name: 'NVIDIA NIM' });
  });

  it('is unavailable without a real server-side key; never calls the internet', async () => {
    vi.stubEnv('NVIDIA_API_KEY', '');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', '');
    const fetcher = vi.spyOn(globalThis, 'fetch');
    expect(isModelProviderConfigured('nvidia')).toBe(false);
    await expect(runChat({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'hello' }],
      maxAttempts: 1,
    })).rejects.toMatchObject<Partial<ProviderError>>({ status: 503 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('uses only the official hosted NVIDIA NIM endpoint with a server-side bearer key', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'private-nvidia-test-key');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', '');
    let url = ''; let headers = new Headers(); let posted: any = null;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      url = String(input);
      headers = new Headers(init?.headers);
      posted = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'NVIDIA response' } }],
        usage: { prompt_tokens: 9, completion_tokens: 3 },
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const result = await runChat({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'hello' }], maxAttempts: 1,
    });
    expect(url).toBe(NVIDIA_NIM_HOSTED_BASE_URL + '/chat/completions');
    expect(headers.get('authorization')).toBe('Bearer private-nvidia-test-key');
    expect(posted.model).toBe('openai/gpt-oss-20b');
    expect(result).toMatchObject({
      text: 'NVIDIA response', usage: { input: 9, output: 3 }, provider: 'nvidia',
    });
  });

  it('reuses the existing tool-call contract for authorised NVIDIA-powered agents', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'private-nim-agent-key');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', '');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      expect(body.tools[0].function.name).toBe('calculator');
      return new Response(JSON.stringify({
        choices: [{ message: {
          content: null,
          tool_calls: [{ id: 'nvidia-tool-1', function: {
            name: 'calculator', arguments: JSON.stringify({ expression: '9 * 7' }),
          } }],
        } }],
        usage: { prompt_tokens: 10, completion_tokens: 6 },
      }), { status: 200 });
    });
    const result = await runChat({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'Calculate 9 * 7' }],
      tools: [{ name: 'calculator', description: 'Evaluate arithmetic', parameters: {
        type: 'object', properties: { expression: { type: 'string' } },
      } }],
      maxAttempts: 1,
    });
    expect(result).toMatchObject({
      toolCalls: [{ id: 'nvidia-tool-1', name: 'calculator', arguments: { expression: '9 * 7' } }],
      provider: 'nvidia', usage: { input: 10, output: 6 },
    });
  });

  it('handles NVIDIA SSE output through the existing streaming gateway', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'private-nim-stream-key');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', '');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\\n\\n' +
      'data: {"choices":[{"delta":{"content":" from NVIDIA"}}]}\\n\\n' +
      'data: {"usage":{"prompt_tokens":4,"completion_tokens":3},"choices":[]}\\n\\n' +
      'data: [DONE]\\n\\n',
      { status: 200, headers: { 'content-type': 'text/event-stream' } },
    ));
    const events = [];
    for await (const event of streamChat({
      provider: 'nvidia', model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'hello' }], maxAttempts: 1,
    })) events.push(event);
    expect(events.filter(event => event.type === 'text').map(event => event.delta).join('')).toBe('Hello from NVIDIA');
    expect(events.at(-1)).toMatchObject({ type: 'done', result: {
      text: 'Hello from NVIDIA', provider: 'nvidia', usage: { input: 4, output: 3 },
    } });
  });

  it('routes to a Dell-hosted NVIDIA NIM reverse proxy only when operator-configured', async () => {
    vi.stubEnv('NVIDIA_API_KEY', 'dell-worker-secret');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', 'https://nim.poweredge.example/v1');
    vi.stubEnv('NVIDIA_NIM_MODEL', 'nvidia/custom-model');
    vi.stubEnv('DELL_AI_FACTORY_ENABLED', 'true');
    let url = '';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      url = String(input);
      return new Response(JSON.stringify({ choices: [{ message: { content: 'dell-backed' } }] }), {
        status: 200,
      });
    });
    expect(resolveModel('nvidia', '')).toBe('nvidia/custom-model');
    const res = await runChat({
      provider: 'nvidia', model: 'nvidia/custom-model',
      messages: [{ role: 'user', content: 'hello' }], maxAttempts: 1,
    });
    expect(url).toBe('https://nim.poweredge.example/v1/chat/completions');
    expect(res.text).toBe('dell-backed');
    const readiness = nvidiaDellInfrastructureReadiness();
    expect(readiness.dell).toMatchObject({
      status: 'configured_not_verified', hardwareVerified: false, workerVerified: false,
    });
    expect(JSON.stringify(readiness)).not.toContain('dell-worker-secret');
    expect(JSON.stringify(readiness)).not.toContain('nim.poweredge.example');
  });

  it.each([
    'http://nim.example/v1',
    'https://127.0.0.1/v1',
    'https://[::1]/v1',
    'https://localhost/v1',
    'https://nim.internal/v1',
    'https://nim.local/v1',
    'https://user:password@nim.example/v1',
    'https://nim.example/v1?token=secret',
    'https://nim.example/v1#credentials',
    'https://nim.example/v2',
  ])('refuses unsafe custom endpoint %s before making a model call', async endpoint => {
    vi.stubEnv('NVIDIA_API_KEY', 'secret-not-for-unsafe-host');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', endpoint);
    const fetcher = vi.spyOn(globalThis, 'fetch');
    expect(() => nvidiaNimBaseUrl()).toThrow();
    expect(nvidiaNimConfigured()).toBe(false);
    await expect(runChat({ provider: 'nvidia', model: 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: 'test' }], maxAttempts: 1,
    })).rejects.toMatchObject<Partial<ProviderError>>({ status: 503 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not claim Dell hardware or model inference is verified from configuration alone', () => {
    vi.stubEnv('DELL_AI_FACTORY_ENABLED', 'true');
    vi.stubEnv('NVIDIA_API_KEY', '');
    vi.stubEnv('NVIDIA_NIM_BASE_URL', '');
    expect(nvidiaDellInfrastructureReadiness().dell).toMatchObject({
      status: 'awaiting_private_nim_endpoint',
      selected: true, hardwareVerified: false, workerVerified: false,
    });
    expect(nvidiaDellInfrastructureReadiness().nvidia.liveInferenceVerified).toBe(false);
  });
});
