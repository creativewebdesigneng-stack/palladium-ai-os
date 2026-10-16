import {describe,expect,it,vi} from 'vitest';
import {createFakeSupabase} from '../runtime/__tests__/fake-supabase';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{const q={middleware:()=>q,inputValidator:()=>q,handler:(fn:unknown)=>fn};return q;}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:{}}));
vi.mock('@/lib/runtime/tools.server',()=>({TOOL_MANIFEST:[{slug:'web_search'},{slug:'file_analysis'}],executeTool:vi.fn(),resolveGrantedTools:vi.fn()}));
vi.mock('@/lib/mission/browser-agent',()=>({browserProviderStatus:vi.fn()}));
import {listAgentToolChoices} from './tools.functions';
const call=listAgentToolChoices as unknown as (args:{context:{supabase:unknown;userId:string}})=>Promise<any[]>;
describe('existing runtime catalogue for agent setup',()=>{
  it('returns only active executable tools through the caller client',async()=>{
    const sb=createFakeSupabase({tools:[{slug:'web_search',name:'Search',is_active:true},{slug:'file_analysis',is_active:false},{slug:'placeholder',is_active:true}]});
    expect(await call({context:{supabase:sb,userId:'owner'}})).toEqual([{slug:'web_search',name:'Search',is_active:true,executable:true}]);
    expect(sb.tables['tools']).toHaveLength(3);
  });
  it('reports a catalogue query failure instead of an invented empty result',async()=>{
    const q:any={select:()=>q,eq:()=>q,order:async()=>({error:{code:'42501'},data:null})};
    await expect(call({context:{supabase:{from:()=>q},userId:'owner'}})).rejects.toThrow('Could not load');
  });
});
