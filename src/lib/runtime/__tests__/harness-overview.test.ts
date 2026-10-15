import {describe,expect,it,vi} from 'vitest';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{
  const chain={middleware:()=>chain,validator:()=>chain,handler:(fn:any)=>fn};return chain;
}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
import {getHarnessOverview} from '../harness.functions';
const names=['personal_agents','agent_tasks','approval_requests','tools','tool_permissions','tool_executions','agent_identities','agent_passports','agent_delegation_grants','agent_a2a_messages'];
const keys=['agents','tasks','approvals','tools','permissions','executions','identities','passports','delegations','a2a'];
function database(seed:Record<string,any[]>={},failed='',reject=false){
  const queries:Record<string,any>={};
  const sb={from:vi.fn((table:string)=>{
    const filters:Array<[string,unknown]>=[];
    const query:any={select:vi.fn(()=>query),eq:vi.fn((key,value)=>{filters.push([key,value]);return query;}),order:vi.fn(()=>query),
      limit:vi.fn(async limit=>{
        if(table===failed){if(reject)throw Error('private transport detail');return {data:null,error:{message:'private database detail'}};}
        const rows=(seed[table]??[]).filter(row=>filters.every(([key,value])=>key==='agent_identities.user_id'?row.agent_identities?.user_id===value:row[key]===value));
        return {data:rows.slice(0,limit),error:null};
      })};queries[table]=query;return query;
  })};
  return {sb,queries,call:()=>(getHarnessOverview as any)({context:{supabase:sb,userId:'owner'}})};
}
describe('verified Harness overview',()=>{
  it('adds explicit owner predicates and bounded reads, with a separate shared catalogue',async()=>{
    const {call,queries}=database();const result=await call();
    for(const name of names){
      expect(queries[name].limit).toHaveBeenCalled();
      expect(queries[name].eq).toHaveBeenCalledWith(name==='tools'?'is_active':name==='agent_passports'?'agent_identities.user_id':'user_id',name==='tools'?true:'owner');
    }
    expect(queries['agent_passports'].order).toHaveBeenCalledWith('issued_at',expect.anything());
    expect(queries['agent_passports'].select.mock.calls[0][0]).toContain('agent_identities!inner(user_id)');
    expect(queries['agent_tasks'].select.mock.calls[0][0]).not.toContain('error');
    expect(queries['tool_permissions'].select.mock.calls[0][0]).not.toMatch(/allowed_domains|spend_cap/);
    expect(result.stats.agents).toBe(0);
    expect(Object.values(result.sources).every((source:any)=>source.available)).toBe(true);
  });
  it.each(names.map((name,index)=>[name,keys[index]]))('distinguishes %s failure from empty data',async(name,key)=>{
    const {call}=database({},name);const result=await call();
    expect(result.sources[key!].available).toBe(false);
    expect(JSON.stringify(result)).not.toContain('private database detail');
    if(key==='identities')expect(result.stats.trustedIdentities).toBeNull();
    if(key==='tasks')expect(result.stats.liveRuns).toBeNull();
    if(key==='agents')expect(result.stats.agents).toBeNull();
    if(key==='passports')expect(result.stats.passports).toBeNull();
    expect(result.sources[key==='agents'?'tasks':'agents'].available).toBe(true);
  });
  it('handles a rejected source request without losing the verified sources',async()=>{
    const {call}=database({},'agent_identities',true);const result=await call();
    expect(result.stats.trustedIdentities).toBeNull();expect(result.stats.agents).toBe(0);
    expect(JSON.stringify(result)).not.toContain('private transport detail');
  });
  it('reports truncation instead of claiming the bounded sample is complete',async()=>{
    const {call}=database({personal_agents:Array.from({length:51},(_,i)=>({id:String(i),user_id:'owner',status:'active'}))});
    const result=await call();expect(result.agents).toHaveLength(50);expect(result.stats.agents).toBe(50);
    expect(result.sources.agents).toEqual({available:true,limit:50,truncated:true});
  });
  it('excludes another owner and strips passport join metadata',async()=>{
    const {call}=database({personal_agents:[{id:'own',user_id:'owner'},{id:'other',user_id:'another-owner'}],agent_passports:[{id:'own',agent_identities:{user_id:'owner'}},{id:'other',agent_identities:{user_id:'another-owner'}}]});
    const result=await call();expect(result.agents.map((row:any)=>row.id)).toEqual(['own']);
    expect(result.trustFabric.passports).toEqual([{id:'own'}]);
  });
  it('does not count expired grants or messages as active, or an unspecified grant as enabled',async()=>{
    const {call}=database({agent_delegation_grants:[{user_id:'owner',status:'active',expires_at:'2000-01-01T00:00:00Z'},{user_id:'owner',status:'active',expires_at:null}],agent_a2a_messages:[{user_id:'owner',status:'delivered',expires_at:'invalid-date'},{user_id:'owner',status:'queued',expires_at:null}],tool_permissions:[{user_id:'owner'},{user_id:'owner',enabled:true}]});
    const result=await call();expect(result.stats.activeDelegations).toBe(1);expect(result.stats.liveA2aMessages).toBe(1);expect(result.stats.enabledToolGrants).toBe(1);
  });
});
