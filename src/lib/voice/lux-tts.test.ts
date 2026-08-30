import { describe, expect, it } from 'vitest';
import { getLuxTtsCapabilities } from './lux-tts.server';

describe('LuxTTS runtime', () => {
  it('advertises the source-derived bounded voice capability', () => {
    const capability = getLuxTtsCapabilities();
    expect(capability.provider).toBe('luxtts');
    expect(capability.tts).toBe(true);
    expect(capability.voiceCloning).toBe(true);
    expect(capability.outputSampleRateHz).toBe(48_000);
    expect(capability.localFirst).toBe(true);
  });
});
