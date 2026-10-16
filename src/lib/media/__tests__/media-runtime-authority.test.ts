import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const h=vi.hoisted(()=>({request:vi.fn(),network:vi.fn()}));
vi.mock('@/lib/security/provider-http.server',async()=>{const actual=await vi.importActual<any>('@/lib/security/provider-http.server');return {...actual,requestProviderJson:h.request};});
vi.mock('@/lib/security/public-network.server',()=>({assertPublicNetworkEndpoint:h.network}));
import {getMediaRuntimeCapabilities,submitAutoEditorJob,getAutoEditorJob} from '../media-runtime.server';
const input={sourceUrl:'https://media.example/fixture.mp4',inputName:'Fixture',mode:'silence' as const,threshold:.1,marginBeforeMs:100,marginAfterMs:100,outputFormat:'mp4' as const};
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('AUTO_EDITOR_WORKER_URL','https://worker.example/base');vi.stubEnv('AUTO_EDITOR_WORKER_TOKEN','fixture-token');h.network.mockResolvedValue(undefined);h.request.mockResolvedValue({id:'worker-1',status:'queued'});});afterEach(()=>vi.unstubAllEnvs());
describe('media runtime authenticated dispatch',()=>{
 it.each(['AUTO_EDITOR_WORKER_URL','AUTO_EDITOR_WORKER_TOKEN'])('requires explicit %s',async key=>{vi.stubEnv(key,'');expect(getMediaRuntimeCapabilities().autoEditor.configured).toBe(false);await expect(submitAutoEditorJob(input)).rejects.toThrow('authenticated HTTPS');expect(h.request).not.toHaveBeenCalled();});
 it.each(['http://media.example/a','https://user:secret@media.example/a'])('rejects unsafe media source %s',async sourceUrl=>{await expect(submitAutoEditorJob({...input,sourceUrl})).rejects.toThrow('Media source');expect(h.request).not.toHaveBeenCalled();});
 it('rejects private media sources before submission',async()=>{h.network.mockRejectedValue(new Error('private network'));await expect(submitAutoEditorJob(input)).rejects.toThrow('private');expect(h.request).not.toHaveBeenCalled();});
 it('only advertises implemented formats and mode',async()=>{await expect(submitAutoEditorJob({...input,mode:'motion'})).rejects.toThrow('silence editing');await expect(submitAutoEditorJob({...input,outputFormat:'premiere'})).rejects.toThrow('MP4 or MOV');});
 it('dispatches to the explicitly configured worker and saves its real ID',async()=>{await expect(submitAutoEditorJob(input)).resolves.toEqual({workerJobId:'worker-1',status:'queued',outputUrl:null});expect(h.request.mock.calls[0]?.[0].toString()).toBe('https://worker.example/base/jobs');expect(h.request.mock.calls[0]?.[1]).toBe('fixture-token');});
 it('rejects completion without a safe output URL',async()=>{h.request.mockResolvedValue({id:'worker-1',status:'completed',outputUrl:'javascript:alert(1)'});await expect(submitAutoEditorJob(input)).rejects.toThrow('valid HTTPS output');await expect(getAutoEditorJob('worker-1')).rejects.toThrow('valid HTTPS output');});
 it('preserves signed HTTPS outputs',async()=>{h.request.mockResolvedValue({id:'worker-1',status:'completed',outputUrl:'https://media.example/output.mp4?signature=fixture'});expect((await getAutoEditorJob('worker-1')).outputUrl).toContain('?signature=fixture');});
});
