import { afterEach, describe, expect, it } from 'vitest';
import { getGenerativeMediaCapabilities, resolveSeedreamProvider } from './generative-media.server';

const originalEnv={
  FAL_KEY:process.env['FAL_KEY'],
  FAL_API_KEY:process.env['FAL_API_KEY'],
  FAL_API_TOKEN:process.env['FAL_API_TOKEN'],
  SEEDREAM_WORKER_URL:process.env['SEEDREAM_WORKER_URL'],
  SEEDREAM_PROVIDER:process.env['SEEDREAM_PROVIDER'],
  LTX_WORKER_URL:process.env['LTX_WORKER_URL'],
};
afterEach(()=>{
  for(const [key,value] of Object.entries(originalEnv)){
    if(value===undefined) delete process.env[key];
    else process.env[key]=value;
  }
});

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
    expect(capabilities.ltx.configured).toBe(true);
    expect(capabilities.ltx.workflows).toContain('image-to-video');
    expect(capabilities.ltx.durationSeconds).toEqual([3, 5, 8, 10]);
  });

  it('keeps Cinema media execution available through Blackstar-hosted fallbacks',()=>{
    delete process.env['FAL_KEY'];
    delete process.env['FAL_API_KEY'];
    delete process.env['FAL_API_TOKEN'];
    delete process.env['SEEDREAM_WORKER_URL'];
    delete process.env['SEEDREAM_PROVIDER'];
    delete process.env['LTX_WORKER_URL'];
    const capabilities=getGenerativeMediaCapabilities();
    expect(resolveSeedreamProvider()).toBe('hosted');
    expect(capabilities.seedream.configured).toBe(true);
    expect(capabilities.seedream.provider).toBe('hosted');
    expect(capabilities.ltx.configured).toBe(true);
    expect(capabilities.ltx.provider).toBe('hosted-motion-fallback');
    expect(capabilities.ltx.note).toContain('premium generative LTX motion');
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
