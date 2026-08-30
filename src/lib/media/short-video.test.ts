import { describe, expect, it } from 'vitest';
import { assertPublicMediaUrl, getShortVideoCapabilities } from './short-video.server';

describe('automated short-video worker safety', () => {
  it('accepts normal public HTTP media URLs', () => {
    expect(assertPublicMediaUrl('https://cdn.example.com/video.mp4')).toBe('https://cdn.example.com/video.mp4');
  });

  it.each([
    'http://localhost/video.mp4',
    'http://127.0.0.1/video.mp4',
    'http://10.0.0.1/video.mp4',
    'http://172.16.0.1/video.mp4',
    'http://172.31.255.255/video.mp4',
    'http://192.168.1.10/video.mp4',
    'http://169.254.1.1/video.mp4',
    'http://printer.local/video.mp4',
  ])('rejects private or local media URL %s', (url) => {
    expect(() => assertPublicMediaUrl(url)).toThrow('Private or local media URLs are not allowed.');
  });

  it('rejects non-web protocols', () => {
    expect(() => assertPublicMediaUrl('file:///tmp/video.mp4')).toThrow('Media URL must use HTTP or HTTPS.');
  });

  it('exposes a bounded rendering contract', () => {
    const capability = getShortVideoCapabilities();
    expect(capability.workflow).toBe('automated-short-video');
    expect(capability.aspectRatios).toEqual(['9:16', '16:9', '1:1']);
    expect(capability.durationSeconds.at(-1)).toBe(180);
    expect(capability.materialSources).toEqual(['stock', 'generated', 'provided']);
    expect(capability.transitions).toEqual(['none', 'fade', 'slide']);
  });
});
