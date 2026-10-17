import { describe, expect, it } from 'vitest';
import { isPublicHttpUrl } from './url-policy';

describe('isPublicHttpUrl', () => {
  it('allows normal public http and https urls', () => {
    expect(isPublicHttpUrl('https://example.com/docs')).toBe(true);
    expect(isPublicHttpUrl('http://example.org')).toBe(true);
  });

  it('blocks local and private targets', () => {
    expect(isPublicHttpUrl('http://localhost:3000')).toBe(false);
    expect(isPublicHttpUrl('http://127.0.0.1')).toBe(false);
    expect(isPublicHttpUrl('http://10.0.0.5')).toBe(false);
    expect(isPublicHttpUrl('http://192.168.1.10')).toBe(false);
    expect(isPublicHttpUrl('http://172.20.0.1')).toBe(false);
    expect(isPublicHttpUrl('http://service.internal')).toBe(false);
  });

  it('blocks non-http protocols and malformed input', () => {
    expect(isPublicHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isPublicHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isPublicHttpUrl('not-a-url')).toBe(false);
  });

  it.each([
    'http://[fd12::1]', 'http://[fe80::1]', 'http://[::]',
    'http://[::ffff:127.0.0.1]', 'http://[64:ff9b::a00:1]',
    'http://100.64.0.1', 'http://224.0.0.1',
    'http://localhost.', 'http://app.localhost', 'http://worker.internal.',
    'https://user:password@example.com',
  ])('rejects alternate private or credential-bearing targets: %s', (url) => {
    expect(isPublicHttpUrl(url)).toBe(false);
  });

  it.each(['https://[2606:4700:4700::1111]/', 'https://example.com./docs'])('allows public canonical targets: %s', (url) => {
    expect(isPublicHttpUrl(url)).toBe(true);
  });
});
