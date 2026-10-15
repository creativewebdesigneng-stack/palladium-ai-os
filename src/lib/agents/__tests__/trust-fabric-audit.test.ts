import {beforeEach,describe,expect,it,vi} from 'vitest';
import {createFakeSupabase} from '@/lib/runtime/__tests__/fake-supabase';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{
  let validate=(value:any)=>value;const chain={middleware:()=>chain,inputValidator:(fn:any)=>{validate=fn;return chain;},handler:(fn:any)=>async({data,context}:any)=>fn({data:validate(data),context})};return chain;
}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
vi.mock('@/lib/platform/audit.server',()=>({writeAuditRequired:vi.fn()}));
vi.mock('../a2a-network',()=>({resolveAgentNetworkRoute:vi.fn()}));
import {writeAuditRequired} from '@/lib/platform/audit.server';
import {resolveAgentNetworkRoute} from '../a2a-network';
import {createAgentDelegationGrant,upsertAgentPassport,revokeAgentDelegationGrant} from '../agent-trust.functions';
import {queueAgentNetworkMessage} from '../a2a-network.functions';
const one='00000000-0000-4000-8000-000000000101',two='00000000-0000-4000-8000-000000000102';
function setup(){
  const db=createFakeSupabase({personal_agents:[{id:one,user_id:'owner',org_id:null,status:'active'},{id:two,user_id:'owner',org_id:null,status:'active'}],agent_identities:[],agent_passports:[],agent_delegation_grants:[],agent_a2a_messages:[]});
  const sb={from:(table:string)=>{const q=db.from(table);q.upsert=(data:any)=>q.insert(data);return q;}};
  return {db,call:(fn:any,data:any)=>fn({data,context:{supabase:sb,userId:'owner'}})};
}
const grantData={grantor_agent_id:one,grantee_agent_id:two,scopes:['search']};
beforeEach(()=>{
  vi.resetAllMocks();vi.mocked(writeAuditRequired).mockResolvedValue('audit-id');
  vi.mocked(resolveAgentNetworkRoute).mockReturnValue({recipientAgentId:two,grantId:'grant',requiresApproval:true} as any);
});
describe('Trust Fabric required audit boundary',()=>{
  it.each([
    ['passport',upsertAgentPassport,{agent_id:one}],['grant',createAgentDelegationGrant,grantData],
    ['revoke',revokeAgentDelegationGrant,{id:one}],['message',queueAgentNetworkMessage,{sender_agent_id:one,capability:'search'}],
  ])('blocks %s writes when the initial audit fails',async(_label,fn,data)=>{
    vi.mocked(writeAuditRequired).mockRejectedValueOnce(new Error('required audit unavailable'));
    const {call,db}=setup();await expect(call(fn,data)).rejects.toThrow('required audit unavailable');
    for(const table of ['agent_identities','agent_passports','agent_delegation_grants','agent_a2a_messages'])expect(db.tables[table]).toHaveLength(0);
  });
  it('records both passport events without copying descriptions into audit metadata',async()=>{
    const {call}=setup();await call(upsertAgentPassport,{agent_id:one,description:'private-description'});
    expect(writeAuditRequired).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(vi.mocked(writeAuditRequired).mock.calls)).not.toContain('private-description');
  });
  it('suspends a newly stored routing grant if completion audit fails',async()=>{
    vi.mocked(writeAuditRequired).mockResolvedValueOnce('started').mockRejectedValueOnce(new Error('completion failed'));
    const {call,db}=setup();await expect(call(createAgentDelegationGrant,grantData)).rejects.toThrow('completion failed');
    expect(db.tables['agent_delegation_grants']![0]).toMatchObject({status:'suspended',requires_approval:true,allow_external_actions:false});
  });
  it('rejects a newly queued envelope if completion audit fails without auditing its payload',async()=>{
    vi.mocked(writeAuditRequired).mockResolvedValueOnce('started').mockRejectedValueOnce(new Error('completion failed'));
    const {call,db}=setup();await expect(call(queueAgentNetworkMessage,{sender_agent_id:one,capability:'search',payload:{private:'message-body'}})).rejects.toThrow('completion failed');
    expect(db.tables['agent_a2a_messages']![0]).toMatchObject({status:'rejected'});
    expect(JSON.stringify(vi.mocked(writeAuditRequired).mock.calls)).not.toContain('message-body');
  });
  it('retains approval-required defaults on a successfully audited grant',async()=>{
    const {call}=setup();const grant=await call(createAgentDelegationGrant,grantData);
    expect(grant).toMatchObject({requires_approval:true,allow_external_actions:false,status:'active'});expect(writeAuditRequired).toHaveBeenCalledTimes(2);
  });
});
