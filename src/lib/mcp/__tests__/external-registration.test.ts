import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{
  let validate=(value:any)=>value;
  const chain={middleware:()=>chain,inputValidator:(fn:any)=>{validate=fn;return chain;},
    handler:(fn:any)=>async ({data,context}:any)=>fn({data:validate(data),context})};return chain;
}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
vi.mock('@/lib/platform/audit.server',()=>({writeAudit:vi.fn(),writeAuditRequired:vi.fn()}));
vi.mock('@/lib/integrations/oauth.server',()=>({encryptToken:vi.fn(()=> 'encrypted')}));
vi.mock('../external-mcp.server',()=>({listExternalMcpTools:vi.fn(),validateExternalMcpEndpoint:(value:string)=>new URL(value)}));
import {writeAuditRequired} from '@/lib/platform/audit.server';
import {saveExternalMcpServer} from '../mcp.functions';
const draft={name:'Reviewed server',slug:'reviewed',endpointUrl:'https://example.com/mcp',allowedToolNames:['search']};
function setup(){
  const query:any={insert:vi.fn(()=>query),update:vi.fn(()=>query),select:vi.fn(()=>query),eq:vi.fn(()=>query),
    maybeSingle:vi.fn(async()=>({data:{id:'saved',slug:'reviewed',enabled:false,requires_approval:true},error:null}))};
  const sb={from:vi.fn(()=>query)};
  const call=(data:any)=>(saveExternalMcpServer as any)({data,context:{supabase:sb,userId:'owner'}});
  return {query,sb,call};
}
beforeEach(()=>vi.clearAllMocks());
describe('disabled external MCP registration',()=>{
  it('fails closed before database access when the required audit is unavailable',async()=>{
    vi.mocked(writeAuditRequired).mockRejectedValueOnce(new Error('audit unavailable'));
    const {call,sb}=setup();await expect(call(draft)).rejects.toThrow('audit unavailable');expect(sb.from).not.toHaveBeenCalled();
  });
  it('persists a disabled owner-scoped draft, encrypted credentials and exact names',async()=>{
    const {call,query}=setup();await call({...draft,authHeaderName:'Authorization',authHeaderValue:'Bearer secret'});
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({user_id:'owner',enabled:false,requires_approval:true,
      auth_header_ciphertext:'encrypted',allowed_tool_names:['search']}));
    expect(writeAuditRequired).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(vi.mocked(writeAuditRequired).mock.calls)).not.toContain('Bearer secret');
    expect(query.select.mock.calls[0][0]).not.toContain('ciphertext');
  });
  it.each([{enabled:true},{requiresApproval:false},{allowedToolNames:[]},
    {allowedToolNames:Array(201).fill('search')},{allowedToolNames:['a'.repeat(161)]},
    {authHeaderValue:'secret\r\nInjected: header'},{orgId:'someone-elses-org'}])('rejects unsafe registration %j',async extra=>{
      const {call,sb}=setup();await expect(call({...draft,...extra})).rejects.toThrow();expect(sb.from).not.toHaveBeenCalled();
    });
  it('does not report success when completion audit fails after storing a disabled draft',async()=>{
    vi.mocked(writeAuditRequired).mockResolvedValueOnce('started').mockRejectedValueOnce(new Error('completion failed'));
    const {call,query}=setup();await expect(call(draft)).rejects.toThrow('completion failed');expect(query.insert).toHaveBeenCalled();
  });
  it('limits updates to the authenticated owner',async()=>{
    const {call,query}=setup();await call({...draft,id:'07ced679-2ac6-4dbc-a865-a265cbb05cd2'});
    expect(query.eq).toHaveBeenCalledWith('user_id','owner');expect(query.insert).not.toHaveBeenCalled();
  });
});
