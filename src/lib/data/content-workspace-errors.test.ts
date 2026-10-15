import {beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{
  const chain={middleware:()=>chain,inputValidator:()=>chain,handler:(fn:unknown)=>fn};return chain;
}}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:()=>null}));
vi.mock('@/lib/platform/audit.server',()=>({writeAudit:vi.fn()}));
vi.mock('@/lib/memory/memory.server',()=>({ingestDocument:vi.fn(async()=>({document:{id:'document'},chunks:1}))}));
import {getSmartTable,createSmartTable} from './smart-tables.functions';
import {startFocusSession} from '../productivity/focus.functions';
import {promoteZenNoteToKnowledge} from '../notes/zen-notes.functions';

function database(fail?:string,active=false){
  const inserts:string[]=[];
  const sb={from:vi.fn((table:string)=>{
    let operation='read';
    const result=()=>({data:table==='smart_tables'?{id:'table'}:table==='zen_notes'?{id:'note',title:'Note',body:'Text'}:
      table==='task_focus_sessions'?(operation==='insert'?{id:'session'}:active?{id:'active'}:null):[],
      error:fail===`${table}:${operation}`?{message:'Database unavailable'}:null});
    const q:any={select:()=>q,eq:()=>q,is:()=>q,order:()=>q,limit:()=>q,
      insert:()=>{operation='insert';inserts.push(table);return q;},update:()=>{operation='update';return q;},
      single:async()=>result(),maybeSingle:async()=>result(),then:(resolve:(r:unknown)=>unknown)=>Promise.resolve(result()).then(resolve)};
    return q;
  })};
  return {context:{userId:'owner',supabase:sb},inserts};
}
describe('content workspace database errors',()=>{
  beforeEach(()=>vi.clearAllMocks());
  it.each(['smart_tables','smart_table_records','smart_table_views'])('does not report empty content when %s fails',async table=>{
    const db=database(`${table}:read`);
    await expect((getSmartTable as any)({context:db.context,data:{id:'table'}})).rejects.toThrow('Database unavailable');
  });
  it('retains verified empty records and views',async()=>{
    const db=database();
    await expect((getSmartTable as any)({context:db.context,data:{id:'table'}})).resolves.toEqual({table:{id:'table'},records:[],views:[]});
  });
  it('reports a failed initial view instead of successful table setup',async()=>{
    const db=database('smart_table_views:insert');
    await expect((createSmartTable as any)({context:db.context,data:{name:'Table',fields:[{key:'name'}]}})).rejects.toThrow('Database unavailable');
  });
  it('retains successful initial table and view setup',async()=>{
    const db=database();
    await expect((createSmartTable as any)({context:db.context,data:{name:'Table',fields:[{key:'name'}]}})).resolves.toEqual({id:'table'});
    expect(db.inserts).toEqual(['smart_tables','smart_table_views']);
  });
  it('does not start a focus session when existing sessions cannot be checked',async()=>{
    const db=database('task_focus_sessions:read');
    await expect((startFocusSession as any)({context:db.context,data:{label:'Focus'}})).rejects.toThrow('Database unavailable');
    expect(db.inserts).toEqual([]);
  });
  it('retains the existing active session guard',async()=>{
    const db=database(undefined,true);
    await expect((startFocusSession as any)({context:db.context,data:{label:'Focus'}})).rejects.toThrow('Finish your active focus session');
    expect(db.inserts).toEqual([]);
  });
  it('starts a session after a successful empty read',async()=>{
    const db=database();
    await expect((startFocusSession as any)({context:db.context,data:{label:'Focus'}})).resolves.toEqual({session:{id:'session'}});
    expect(db.inserts).toEqual(['task_focus_sessions']);
  });
  it('reports an unsuccessful knowledge link instead of claiming promotion succeeded',async()=>{
    const db=database('zen_notes:update');
    await expect((promoteZenNoteToKnowledge as any)({context:db.context,data:{id:'note'}})).rejects.toThrow('Database unavailable');
  });
  it('returns the indexed document after its link is persisted',async()=>{
    const db=database();
    await expect((promoteZenNoteToKnowledge as any)({context:db.context,data:{id:'note'}})).resolves.toEqual({ok:true,documentId:'document',chunks:1});
  });
});
