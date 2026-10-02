import { afterEach, describe, expect, it, vi } from 'vitest';
import { getThreeDRuntimeCapabilities, probeThreeDWorker, submitThreeDJob } from './three-d-runtime.server';
import { THREE_D_STUDIO_TOOL_DEF } from './three-d-agent-tool.server';

const originalUrl = process.env['MODLY_API_URL'];
const originalToken = process.env['MODLY_API_TOKEN'];

afterEach(() => {
  vi.restoreAllMocks();
  if (originalUrl === undefined) delete process.env['MODLY_API_URL'];
  else process.env['MODLY_API_URL'] = originalUrl;
  if (originalToken === undefined) delete process.env['MODLY_API_TOKEN'];
  else process.env['MODLY_API_TOKEN'] = originalToken;
});

describe('3D Studio runtime', () => {
  it('reports the bounded Modly-compatible capability surface', () => {
    process.env['MODLY_API_URL'] = 'https://modly-worker.example';
    const capabilities = getThreeDRuntimeCapabilities();
    expect(capabilities.configured).toBe(true);
    expect(capabilities.provider).toBe('modly-compatible');
    expect(capabilities.workflows).toEqual(['image-to-mesh']);
    expect(capabilities.formats).toContain('glb');
    expect(capabilities.formats).toContain('vox');
  });

  it('probes the real worker health contract without treating configuration as proof', async () => {
    process.env['MODLY_API_URL'] = 'https://modly-worker.example';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      ready: true,
      provider: 'blackstar-game-foundry-3d',
      workflows: ['image-to-mesh', 'prompt-to-mesh'],
      formats: ['glb', 'obj'],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const result = await probeThreeDWorker();
    expect(result.healthy).toBe(true);
    expect(result.readySignal).toBe(true);
    expect(result.workflows).toContain('image-to-mesh');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/health');
  });

  it('blocks local/private image sources before contacting a worker', async () => {
    process.env['MODLY_API_URL'] = 'https://modly-worker.example';
    await expect(submitThreeDJob({ sourceUrl: 'http://127.0.0.1/private.png', outputFormat: 'glb' }))
      .rejects.toThrow(/Private\/local|Private network/);
    await expect(submitThreeDJob({ sourceUrl: 'http://192.168.1.20/private.png', outputFormat: 'glb' }))
      .rejects.toThrow(/Private network/);
  });

  it('keeps the agent action set bounded', () => {
    const properties = THREE_D_STUDIO_TOOL_DEF.parameters['properties'] as Record<string, unknown>;
    const action = properties['action'] as { enum?: unknown } | undefined;
    expect(action?.enum).toEqual(['capabilities', 'list', 'create', 'status']);
    expect(JSON.stringify(THREE_D_STUDIO_TOOL_DEF.parameters)).not.toMatch(/token|password|api_key/i);
  });
});
