import {describe,expect,it,vi} from 'vitest';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{
  const chain={middleware:()=>chain,validator:()=>chain,handler:(fn:unknown)=>fn};return chain;
}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
import {listDepartments,saveDepartment} from './departments.functions';
function fixture(options:{deniedTeam?:boolean;agentReadError?:boolean;missingAgent?:boolean;clearError?:boolean;missingAssignment?:boolean}={}){
  const writes:Array<{table:string;row:any}>=[],filters:Array<[string,string,unknown]>=[];
  const sb={from:(table:string)=>{
    let operation='read',row:any;
    const result=()=>{
      if(table==='teams')return {data:options.deniedTeam&&operation==='update'?null:operation==='read'?[{id:'team'}]:{id:'team'},error:null};
      if(operation==='read')return {data:options.missingAgent?[]:[{id:'agent',team_id:'team'}],error:options.agentReadError?{message:'Agent history unavailable'}:null};
      return {data:options.missingAssignment?[]:[{id:'agent'}],error:options.clearError&&row.team_id===null?{message:'Clear failed'}:null};
    };
    const q:any={select:()=>q,eq:(key:string,value:unknown)=>{filters.push([table,key,value]);return q;},in:()=>q,order:()=>q,
      update:(value:unknown)=>{row=value;operation='update';writes.push({table,row});return q;},insert:(value:unknown)=>{row=value;operation='insert';writes.push({table,row});return q;},
      maybeSingle:async()=>result(),then:(resolve:(value:unknown)=>unknown)=>Promise.resolve(result()).then(resolve)};return q;
  }};
  return {context:{userId:'owner',supabase:sb},writes,filters};
}
const input={id:'team',orgId:'org',name:'Team',agents:['agent'],permissions:{},status:'active'};
describe('department authorization and persistence',()=>{
  it('does not report missing agents as empty department membership',async()=>{
    const f=fixture({agentReadError:true});await expect((listDepartments as any)({context:f.context,data:{orgId:'org'}})).rejects.toThrow('Agent history unavailable');
  });
  it('does not mutate agent membership after a denied team update',async()=>{
    const f=fixture({deniedTeam:true});await expect((saveDepartment as any)({context:f.context,data:input})).rejects.toThrow('permission to manage');
    expect(f.writes.filter(x=>x.table==='personal_agents')).toEqual([]);
  });
  it('rejects inaccessible or other-organisation agents before writing a team',async()=>{
    const f=fixture({missingAgent:true});await expect((saveDepartment as any)({context:f.context,data:input})).rejects.toThrow('accessible in this organisation');expect(f.writes).toEqual([]);
  });
  it('stops when agent membership cannot be checked',async()=>{
    const f=fixture({agentReadError:true});await expect((saveDepartment as any)({context:f.context,data:input})).rejects.toThrow('Agent history unavailable');expect(f.writes).toEqual([]);
  });
  it('does not continue assignments after clearing membership fails',async()=>{
    const f=fixture({clearError:true});await expect((saveDepartment as any)({context:f.context,data:input})).rejects.toThrow('Clear failed');expect(f.writes.filter(x=>x.table==='personal_agents')).toHaveLength(1);
  });
  it('reports assignments that disappeared or lost access during the write',async()=>{
    const f=fixture({missingAssignment:true});await expect((saveDepartment as any)({context:f.context,data:input})).rejects.toThrow('could not be verified');
  });
  it('retains a verified save and scopes every agent query to the organisation',async()=>{
    const f=fixture();await expect((saveDepartment as any)({context:f.context,data:{...input,agents:['agent','agent']}})).resolves.toEqual({id:'team'});
    expect(f.filters.filter(([table,key])=>table==='personal_agents'&&key==='org_id')).toEqual([['personal_agents','org_id','org'],['personal_agents','org_id','org'],['personal_agents','org_id','org']]);
  });
});
