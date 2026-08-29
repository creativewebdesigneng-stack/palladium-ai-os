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
});
