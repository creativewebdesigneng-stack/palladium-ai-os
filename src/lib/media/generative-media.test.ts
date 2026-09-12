import { describe, expect, it } from 'vitest';
import { getGenerativeMediaCapabilities } from './generative-media.server';

describe('generative media runtime', () => {
  it('exposes bounded Seedream image workflows', () => {
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
