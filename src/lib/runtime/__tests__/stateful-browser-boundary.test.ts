import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStatefulBrowserTool } from '../stateful-browser-tool.server';

const fetchMock = vi.fn();
const config = { allowedDomains: ['example.com'], allowedTools: ['browser_task'] };
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
const cookie = (domain: string) => ({ domain, name: 'synthetic-session', value: 'synthetic-secret', path: '/', expires: -1, httpOnly: true, secure: true, sameSite: 'Lax' as const });
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('BROWSER_AGENT_ALLOW_SIMULATION', 'false');
  vi.stubEnv('BROWSER_AGENT_PROVIDER', 'playwright');
  vi.stubEnv('PLAYWRIGHT_BROWSER_ENDPOINT', 'https://worker.example.test');
  vi.stubEnv('PLAYWRIGHT_BROWSER_TOKEN', ' synthetic-worker-token ');
  vi.stubEnv('BROWSERBASE_RUNNER_ENDPOINT', '');
  vi.stubEnv('BROWSERBASE_API_KEY', '');
  vi.stubEnv('BROWSERBASE_PROJECT_ID', '');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('persistent browser transport and profile boundary', () => {
  it('uses shared trimmed credentials, nonredirecting requests and bounded signals', async () => {
    fetchMock.mockResolvedValueOnce(json({ sessionId: 'session-1' })).mockResolvedValueOnce(json({ ok: true, data: { url: 'https://example.com' } }));
    await expect(createStatefulBrowserTool({ config }).navigate('https://example.com')).resolves.toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toMatchObject({ redirect: 'manual', headers: { authorization: 'Bearer synthetic-worker-token' } });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it.each(['http://worker.example.test', 'https://user:pass@worker.example.test', 'https://worker.example.test?token=secret', 'https://worker.example.test/unexpected-path'])('refuses unsafe provider settings before profile dispatch: %s', endpoint => {
    vi.stubEnv('PLAYWRIGHT_BROWSER_ENDPOINT', endpoint);
    expect(() => createStatefulBrowserTool({ config })).toThrow('configured production');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires the private worker token', () => {
    vi.stubEnv('PLAYWRIGHT_BROWSER_TOKEN', ' ');
    expect(() => createStatefulBrowserTool({ config })).toThrow('configured production');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('filters initial profile state to the current domain grant', async () => {
    fetchMock.mockResolvedValueOnce(json({ sessionId: 'session-1' })).mockResolvedValueOnce(json({ ok: true, data: { url: 'https://example.com' } }));
    const tool = createStatefulBrowserTool({ config, initialState: { cookies: [cookie('example.com'), cookie('other.example')], origins: [{ origin: 'https://other.example', localStorage: [{ name: 'session', value: 'private' }] }] } });
    await tool.navigate('https://example.com');
    const request = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(request.storageState.cookies.map((row: { domain: string }) => row.domain)).toEqual(['example.com']);
    expect(request.storageState.origins).toEqual([]);
    expect(fetchMock.mock.calls[0]![1].body).not.toContain('other.example');
  });

  it('does not follow a session-creation redirect carrying saved cookies', async () => {
    fetchMock.mockResolvedValue(new Response('secret upstream body', { status: 307, headers: { location: 'https://other.example' } }));
    const tool = createStatefulBrowserTool({ config, initialState: { cookies: [cookie('example.com')], origins: [] } });
    await expect(tool.navigate('https://example.com')).rejects.toThrow('persistent session (307)');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1].redirect).toBe('manual');
  });

  it.each([null, 12, '', 'x'.repeat(201), 'bad\nsession'])('rejects malformed session receipts without executing an action: %j', sessionId => {
    fetchMock.mockResolvedValue(json({ sessionId }));
    return expect(createStatefulBrowserTool({ config }).navigate('https://example.com')).rejects.toThrow('valid session');
  });

  it('does not replay an ambiguous mutating timeout', async () => {
    fetchMock.mockResolvedValueOnce(json({ sessionId: 'session-1' })).mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'));
    await expect(createStatefulBrowserTool({ config }).click('#save')).rejects.toThrow('Timed out');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(['not-json', 'null', '[]', '{"ok":true}', '{"ok":false,"error":"synthetic-secret"}', '{"ok":true,"data":null}'])('does not report success for invalid action receipts: %s', body => {
    fetchMock.mockResolvedValueOnce(json({ sessionId: 'session-1' })).mockResolvedValueOnce(new Response(body));
    return expect(createStatefulBrowserTool({ config }).navigate('https://example.com')).rejects.toThrow('verified result');
  });

  it.each([302, 401, 500])('redacts upstream failure bodies and refuses action redirects: %s', async status => {
    fetchMock.mockResolvedValueOnce(json({ sessionId: 'session-1' })).mockResolvedValueOnce(new Response('synthetic-secret', { status }));
    const error = await createStatefulBrowserTool({ config }).click('#save').catch(error => error);
    expect(String(error)).toContain(`failed (${status})`);
    expect(String(error)).not.toContain('synthetic-secret');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('requires navigation/extraction evidence rather than accepting empty data', async () => {
    fetchMock.mockResolvedValueOnce(json({ sessionId: 'session-1' })).mockImplementation(() => Promise.resolve(json({ ok: true, data: {} })));
    const tool = createStatefulBrowserTool({ config });
    await expect(tool.navigate('https://example.com')).rejects.toThrow('verified URL');
    await expect(tool.extract('https://example.com')).rejects.toThrow('verified text');
  });

  it('filters exported state to the current grant and preserves lazy close', async () => {
    const tool = createStatefulBrowserTool({ config });
    await tool.close();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValueOnce(json({ sessionId: 'session-1' })).mockResolvedValueOnce(json({ ok: true, data: { cookies: [cookie('example.com'), cookie('other.example')], origins: [] } })).mockResolvedValueOnce(json({ ok: true, data: { ok: true } }));
    expect((await tool.exportStorageState()).cookies.map(row => row.domain)).toEqual(['example.com']);
    await tool.close();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('preserves Browserbase HTTPS base paths and its distinct authentication headers', async () => {
    vi.stubEnv('BROWSER_AGENT_PROVIDER', 'browserbase');
    vi.stubEnv('BROWSERBASE_RUNNER_ENDPOINT', 'https://runner.example.test/api/');
    vi.stubEnv('BROWSERBASE_API_KEY', ' synthetic-browserbase-key ');
    vi.stubEnv('BROWSERBASE_PROJECT_ID', ' synthetic-project ');
    fetchMock.mockResolvedValueOnce(json({ sessionId: 'session-1' })).mockResolvedValueOnce(json({ ok: true, data: { text: 'Synthetic page' } }));
    await expect(createStatefulBrowserTool({ config }).read('https://example.com')).resolves.toMatchObject({ text: 'Synthetic page' });
    expect(fetchMock.mock.calls[0]![0]).toBe('https://runner.example.test/api/session');
    expect(fetchMock.mock.calls[0]![1].headers).toMatchObject({ 'x-bb-api-key': 'synthetic-browserbase-key', 'x-bb-project-id': 'synthetic-project' });
  });
});
