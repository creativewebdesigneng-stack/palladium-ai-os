import { afterEach, describe, expect, it } from 'vitest';
import { getGenerativeMediaCapabilities, resolveSeedreamProvider } from './generative-media.server';

const originalFalKey=process.env['FAL_KEY'];
afterEach(()=>{if(originalFalKey===undefined) delete process.env['FAL_KEY']; else process.env['FAL_KEY']=originalFalKey;});

describe('generative media runtime', () => {
  it('exposes bounded Seedream image workflows', () => {
    process.env['FAL_KEY']='test-key';
    const capabilities = getGenerativeMediaCapabilities();
    expect(capabilities.seedream.kind).toBe('image');
    expect(capabilities.seedream.configured).toBe(true);
    expect(capabilities.seedream.workflows).toEqual(['text-to-image', 'image-edit', 'multi-image-composite']);
    expect(capabilities.seedream.aspectRatios).toContain('16:9');
  });

  it('exposes bounded LTX synchronized video workflows', () => {
    const capabilities = getGenerativeMediaCapabilities();
    expect(capabilities.ltx.kind).toBe('video');
    expect(capabilities.ltx.workflows).toContain('image-to-video');
    expect(capabilities.ltx.durationSeconds).toEqual([3, 5, 8, 10]);
  });
});


describe('Seedream provider precedence',()=>{
  it('prefers direct fal when FAL_KEY exists even if a stale worker URL is set',()=>{
    process.env['FAL_KEY']='test-key';
    process.env['SEEDREAM_WORKER_URL']='https://legacy-worker.example.com';
    delete process.env['SEEDREAM_PROVIDER'];
    expect(resolveSeedreamProvider()).toBe('direct');
  });
  it('uses a custom worker only when explicitly forced',()=>{
    process.env['FAL_KEY']='test-key';
    process.env['SEEDREAM_WORKER_URL']='https://custom-worker.example.com';
    process.env['SEEDREAM_PROVIDER']='worker';
    expect(resolveSeedreamProvider()).toBe('worker');
  });
});


describe('fal runtime diagnostics',()=>{
  it('reports fal key visibility without exposing the secret',()=>{
    process.env['FAL_API_KEY']='alias-key';
    delete process.env['FAL_KEY'];
    const capabilities=getGenerativeMediaCapabilities();
    expect(capabilities.diagnostics.falKeyVisible).toBe(true);
    expect(JSON.stringify(capabilities)).not.toContain('alias-key');
  });
});
