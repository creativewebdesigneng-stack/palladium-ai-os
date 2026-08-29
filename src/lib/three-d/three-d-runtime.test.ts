import { afterEach, describe, expect, it } from 'vitest';
import { getThreeDRuntimeCapabilities, submitThreeDJob } from './three-d-runtime.server';
import { THREE_D_STUDIO_TOOL_DEF } from './three-d-agent-tool.server';

const originalUrl = process.env.MODLY_API_URL;
const originalToken = process.env.MODLY_API_TOKEN;

afterEach(() => {
  if (originalUrl === undefined) delete process.env.MODLY_API_URL;
  else process.env.MODLY_API_URL = originalUrl;
  if (originalToken === undefined) delete process.env.MODLY_API_TOKEN;
  else process.env.MODLY_API_TOKEN = originalToken;
});

describe('3D Studio runtime', () => {
  it('reports the bounded Modly-compatible capability surface', () => {
    process.env.MODLY_API_URL = 'https://modly-worker.example';
    const capabilities = getThreeDRuntimeCapabilities();
    expect(capabilities.configured).toBe(true);
    expect(capabilities.provider).toBe('modly-compatible');
    expect(capabilities.workflows).toEqual(['image-to-mesh']);
    expect(capabilities.formats).toContain('glb');
    expect(capabilities.formats).toContain('vox');
  });

  it('blocks local/private image sources before contacting a worker', async () => {
    process.env.MODLY_API_URL = 'https://modly-worker.example';
    await expect(submitThreeDJob({ sourceUrl: 'http://127.0.0.1/private.png', outputFormat: 'glb' }))
      .rejects.toThrow(/Private\/local|Private network/);
    await expect(submitThreeDJob({ sourceUrl: 'http://192.168.1.20/private.png', outputFormat: 'glb' }))
      .rejects.toThrow(/Private network/);
  });

  it('keeps the agent action set bounded', () => {
    const actions = (THREE_D_STUDIO_TOOL_DEF.parameters.properties as any).action.enum;
    expect(actions).toEqual(['capabilities', 'list', 'create', 'status']);
    expect(JSON.stringify(THREE_D_STUDIO_TOOL_DEF.parameters)).not.toMatch(/token|password|api_key/i);
  });
});
