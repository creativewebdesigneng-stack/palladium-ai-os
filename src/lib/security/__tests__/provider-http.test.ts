import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const h=vi.hoisted(()=>({network:vi.fn(),fetch:vi.fn()}));
vi.mock('../public-network.server',()=>({assertPublicNetworkEndpoint:h.network}));
import {providerEndpoint,requestProviderJson} from '../provider-http.server';
beforeEach(()=>{vi.clearAllMocks();h.network.mockResolvedValue(undefined);vi.stubGlobal('fetch',h.fetch);});afterEach(()=>vi.unstubAllGlobals());
describe('credentialed provider HTTP boundary',()=>{
 it.each([undefined,'http://example.com','https://user:pass@example.com','https://example.com/?token=secret','https://example.com/#fragment','invalid'])('rejects unsafe configuration %s',value=>{expect(providerEndpoint(value)).toBeNull();});
 it('requires a token before network access',async()=>{await expect(requestProviderJson(new URL('https://provider.example/jobs'),'')).rejects.toThrow('authenticated');expect(h.fetch).not.toHaveBeenCalled();});
 it('never dispatches credentials over HTTP even if called without configuration validation',async()=>{await expect(requestProviderJson(new URL('http://provider.example/jobs'),'fixture')).rejects.toThrow('HTTPS');expect(h.fetch).not.toHaveBeenCalled();});
 it('rejects private DNS before dispatch',async()=>{h.network.mockRejectedValue(new Error('private network'));await expect(requestProviderJson(new URL('https://provider.example/jobs'),'fixture')).rejects.toThrow('private');expect(h.fetch).not.toHaveBeenCalled();});
 it('uses nonredirecting authenticated bounded requests',async()=>{h.fetch.mockResolvedValue(new Response('{"ok":true}'));await expect(requestProviderJson(new URL('https://provider.example/jobs'),'fixture',{method:'POST'})).resolves.toEqual({ok:true});expect(h.fetch.mock.calls[0]?.[1]).toMatchObject({redirect:'error',headers:{Authorization:'Bearer fixture'}});expect(h.fetch.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal);});
 it('does not expose upstream response bodies in errors',async()=>{h.fetch.mockResolvedValue(new Response('provider-secret',{status:401}));await expect(requestProviderJson(new URL('https://provider.example/jobs'),'fixture')).rejects.toThrow('Provider request failed (401).');});
 it('rejects oversized responses',async()=>{h.fetch.mockResolvedValue(new Response('x'.repeat(262145)));await expect(requestProviderJson(new URL('https://provider.example/jobs'),'fixture')).rejects.toThrow('size limit');});
 it.each(['not-json','[]','null'])('rejects invalid response %s',async body=>{h.fetch.mockResolvedValue(new Response(body));await expect(requestProviderJson(new URL('https://provider.example/jobs'),'fixture')).rejects.toThrow();});
});
