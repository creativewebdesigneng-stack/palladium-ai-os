import { describe,expect,it,vi } from 'vitest';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{
  const chain={middleware:()=>chain,inputValidator:()=>chain,handler:(fn:unknown)=>fn};
  return chain;
}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
vi.mock('@/lib/platform/audit.server',()=>({writeAudit:vi.fn()}));
vi.mock('@/lib/integrations/oauth.server',()=>({encryptToken:vi.fn()}));
vi.mock('../external-mcp.server',()=>({listExternalMcpTools:vi.fn(),validateExternalMcpEndpoint:vi.fn()}));
import {getExternalMcpRegistryOverview} from '../mcp.functions';

function database(rows:unknown[],error:unknown=null){
  const query:any={select:vi.fn(()=>query),eq:vi.fn(()=>query),order:vi.fn(()=>query),
    limit:vi.fn(async()=>({data:rows,error}))};
  return {sb:{from:vi.fn(()=>query)},query};
}
const call=(sb:unknown)=>(getExternalMcpRegistryOverview as any)({context:{userId:'owner-A',supabase:sb}});
describe('owner-scoped external MCP registry overview',()=>{
  it('bounds reads and returns only safe registration metadata',async()=>{
    const {sb,query}=database([{id:'server',name:'Private server',slug:'private',enabled:false,
      requires_approval:true,allowed_tool_names:['search'],cached_tools:[{name:'search',description:'private-tool-body'}],
      endpoint_url:'https://example.com/mcp?api_key=private-query',auth_header_ciphertext:'private-ciphertext'}]);
    const result=await call(sb);
    expect(query.eq).toHaveBeenCalledWith('user_id','owner-A');
    expect(query.limit).toHaveBeenCalledWith(101);
    expect(query.select.mock.calls[0][0]).not.toMatch(/endpoint|auth_header/);
    expect(result.servers[0]).toMatchObject({enabled:false,requiresApproval:true,cachedToolCount:1,allowedToolCount:1,lastDiscoveredAt:null});
    expect(JSON.stringify(result)).not.toMatch(/private-query|private-ciphertext|private-tool-body/);
  });
  it('reports a truncated metadata preview instead of returning an unbounded registry',async()=>{
    const {sb}=database(Array.from({length:101},(_,i)=>({id:String(i),name:'Server',slug:'server',enabled:false})));
    const result=await call(sb);
    expect(result.servers).toHaveLength(100);
    expect(result.truncated).toBe(true);
  });
  it('reports a database failure instead of presenting it as zero connections',async()=>{
    const {sb}=database([],{message:'private-database-message'});
    await expect(call(sb)).rejects.toThrow('Could not verify your external MCP registry.');
  });
  it('distinguishes an accessible empty registry from a failed lookup',async()=>{
    const {sb}=database([]);
    await expect(call(sb)).resolves.toEqual({servers:[],truncated:false});
  });
});
