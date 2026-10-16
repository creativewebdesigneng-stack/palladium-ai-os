import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn(), decrypt: vi.fn(), filters: [] as Array<[string, unknown]> }));
vi.mock('@/integrations/supabase/client.server', () => ({supabaseAdmin: {from: () => {
  const q = {select: () => q, eq: (key: string, value: unknown) => {mocks.filters.push([key,value]);return q;}, maybeSingle: mocks.read};return q;
}}}));
vi.mock('@/lib/integrations/oauth.server', () => ({decryptToken: mocks.decrypt, encryptToken: vi.fn()}));
import {resolveUserModelProviderAccess} from '../model-provider-credentials.server';
beforeEach(() => {vi.clearAllMocks();mocks.filters.length=0;vi.stubEnv('SUPABASE_URL','https://test.supabase.co');vi.stubEnv('SUPABASE_SECRET_KEY','test-only');vi.stubEnv('OPENAI_API_KEY','');vi.stubEnv('ANTHROPIC_API_KEY','');});
afterEach(() => vi.unstubAllEnvs());
describe('optional personal credential store', () => {
  it('keeps an already configured same-provider deployment available during a lookup outage',async()=>{
    vi.stubEnv('OPENAI_API_KEY','deployment-test-only');mocks.read.mockResolvedValue({error:{code:'PGRST301',message:'secret must never surface'},data:null});
    expect(await resolveUserModelProviderAccess({userId:'alice',provider:'openai'})).toBeNull();
    expect(mocks.decrypt).not.toHaveBeenCalled();expect(mocks.filters).toContainEqual(['user_id','alice']);
  });
  it('does not use another configured vendor as credential fallback',async()=>{
    vi.stubEnv('ANTHROPIC_API_KEY','other-vendor-test-only');mocks.read.mockResolvedValue({error:{code:'PGRST301'},data:null});
    await expect(resolveUserModelProviderAccess({userId:'alice',provider:'openai'})).rejects.toMatchObject({status:503});
  });
  it('prefers the requesting users enabled personal key without modifying global environment',async()=>{
    vi.stubEnv('OPENAI_API_KEY','deployment-test-only');mocks.read.mockResolvedValue({data:{api_key_ciphertext:'cipher'},error:null});mocks.decrypt.mockReturnValue('alice-test-only');
    expect(await resolveUserModelProviderAccess({userId:'alice',provider:'openai'})).toEqual({provider:'openai',apiKey:'alice-test-only'});
    expect(mocks.filters).toEqual([['user_id','alice'],['provider','openai'],['enabled',true]]);expect(process.env['OPENAI_API_KEY']).toBe('deployment-test-only');
  });
  it('does not silently replace an unreadable selected personal key with deployment spending',async()=>{
    vi.stubEnv('OPENAI_API_KEY','deployment-test-only');mocks.read.mockResolvedValue({data:{api_key_ciphertext:'cipher'},error:null});mocks.decrypt.mockImplementation(()=>{throw Error('secret ciphertext')});
    await expect(resolveUserModelProviderAccess({userId:'alice',provider:'openai'})).rejects.toMatchObject({status:503,retryable:false});
  });
  it('Gemini uses the existing deployment credential path without querying personal OpenAI credentials',async()=>{
    expect(await resolveUserModelProviderAccess({userId:'alice',provider:'gemini'})).toBeNull();expect(mocks.read).not.toHaveBeenCalled();
  });
});
