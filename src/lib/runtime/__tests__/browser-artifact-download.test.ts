import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup }));
import { captureBrowserDownloadFromPage } from '../browser-artifacts.server';
import type { BrowserTool } from '@/lib/mission/browser-agent';

const url = 'https://files.example.com/file.bin';
const download = (href = url, allowedDomains = ['files.example.com']) => captureBrowserDownloadFromPage({
  tool: { extract: vi.fn(async () => ({ items: [{ selector: '#download', href }] })) } as unknown as BrowserTool,
  currentUrl: 'https://files.example.com/', selector: '#download', allowedDomains,
});
beforeEach(() => { lookup.mockReset().mockResolvedValue([{ address: '93.184.216.34', family: 4 }]); });
afterEach(() => vi.unstubAllGlobals());
describe('bounded public browser artifact downloads', () => {
  it('captures verified public bytes with the existing filename and size contract', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('hello', { headers: { 'content-type': 'text/plain', 'content-disposition': 'attachment; filename="report.txt"' } }));
    vi.stubGlobal('fetch', fetcher);
    const result = await download();
    expect(result).toMatchObject({ filename: 'report.txt', mimeType: 'text/plain', sizeBytes: 5, sourceUrl: url });
    expect(new TextDecoder().decode(result.data)).toBe('hello');
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' });
  });
  it.each(['https://user:password@files.example.com/file', 'https://other.example.com/file', 'file:///etc/passwd'])(
    'rejects an unauthorized or credential-bearing link before fetching: %s', async href => {
      const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
      await expect(download(href)).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each(['10.0.0.1','100.64.0.1','198.18.0.1','::ffff:127.0.0.1','64:ff9b::a00:1','fec0::1','ff02::1'])(
    'blocks private and special-purpose DNS answers: %s', async address => {
      lookup.mockResolvedValue([{ address, family: address.includes(':') ? 6 : 4 }]);
      const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
      await expect(download()).rejects.toThrow(/private/);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it('refuses redirects without contacting their private or out-of-scope destination', async () => {
    const fetcher = vi.fn(async () => new Response('', { status: 302, headers: { location: 'http://169.254.169.254/' } }));
    vi.stubGlobal('fetch', fetcher);
    await expect(download()).rejects.toThrow(/redirect/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects oversized declared lengths before reading the body', async () => {
    const cancel = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({ cancel }), { headers: { 'content-length': String(26 * 1024 * 1024) } })));
    await expect(download()).rejects.toThrow(/25 MB/);
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('cancels a growing response when its actual bytes exceed the limit', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({ start(controller) {
      controller.enqueue(new Uint8Array(13 * 1024 * 1024));
      controller.enqueue(new Uint8Array(13 * 1024 * 1024));
      controller.enqueue(new Uint8Array(1));
    }, cancel });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(body)));
    await expect(download()).rejects.toThrow(/25 MB/);
    expect(cancel).toHaveBeenCalledOnce();
  });
});
