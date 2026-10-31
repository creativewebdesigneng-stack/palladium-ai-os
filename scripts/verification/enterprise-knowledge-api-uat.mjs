/**
 * Non-production-only, read-only acceptance of existing enterprise Knowledge
 * RLS via the real Supabase Data API and Storage API. No service key or writes.
 * --self-test uses a mock transport and requires no credentials or network.
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const productionRef = 'piwhiuangitqvwvwwcga';
const required = 'I_CONFIRM_ISOLATED_TEST_DATABASE';
function identity(jwt) {
  assert.ok(typeof jwt === 'string' && jwt.split('.').length === 3, 'Test-user access JWT is required');
  let payload;
  try {payload=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url').toString('utf8'));}
  catch {throw Error('Invalid access JWT payload');}
  assert.match(String(payload.sub||''),uuid,'Test-user identity must be UUID');
  return payload.sub.toLowerCase();
}
export function prepareUat(e) {
  if(e.BLACKSTAR_UAT_NONPROD!==required) throw Error('Isolated test-database confirmation required');
  const ref=String(e.BLACKSTAR_UAT_PROJECT_REF||'').toLowerCase();
  assert.match(ref,/^[a-z]{20}$/,'Isolated Supabase reference required');
  assert.notEqual(ref,productionRef,'Production project forbidden');
  const url=new URL(String(e.BLACKSTAR_UAT_URL||''));
  assert.equal(url.protocol,'https:','HTTPS required');
  assert.equal(url.hostname,ref+'.supabase.co','Isolated project host mismatch');
  assert.equal(url.pathname,'/','Use project root URL');
  assert.equal(url.search,'','Project URL must not contain query');
  assert.ok(typeof e.BLACKSTAR_UAT_ANON_KEY==='string'&&e.BLACKSTAR_UAT_ANON_KEY.length>20,
    'Isolated project publishable key required');
  const ownerJWT=e.BLACKSTAR_UAT_OWNER_JWT,memberJWT=e.BLACKSTAR_UAT_MEMBER_JWT;
  const owner=identity(ownerJWT),member=identity(memberJWT);
  assert.notEqual(owner,member,'Distinct test-user JWTs required');
  for(const name of ['BLACKSTAR_UAT_ORG_ID','BLACKSTAR_UAT_SHARED_DOC_ID','BLACKSTAR_UAT_PRIVATE_DOC_ID'])
    assert.match(String(e[name]||''),uuid,name+' UUID required');
  assert.notEqual(e.BLACKSTAR_UAT_SHARED_DOC_ID,e.BLACKSTAR_UAT_PRIVATE_DOC_ID);
  const path=String(e.BLACKSTAR_UAT_SHARED_OBJECT_PATH||'');
  assert.ok(path.length<500&&path.split('/').length>=2&&!path.includes('..')&&
    path.split('/')[0]===owner&&path.split('/').every(Boolean),
    'Owner-prefixed synthetic source-object fixture path required');
  return {base:url.origin,key:e.BLACKSTAR_UAT_ANON_KEY,ownerJWT,memberJWT,owner,member,
    org:e.BLACKSTAR_UAT_ORG_ID,shared:e.BLACKSTAR_UAT_SHARED_DOC_ID,
    privateDoc:e.BLACKSTAR_UAT_PRIVATE_DOC_ID,path};
}
export async function verifyReadOnly(c,transport=fetch) {
  let checks=0;
  const check=(condition,message)=>{assert.ok(condition,message);checks++;};
  async function request(path,jwt) {
    return transport(new URL(path,c.base+'/'),{
      method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
      headers:{apikey:c.key,Authorization:'Bearer '+jwt,Accept:'application/json','Cache-Control':'no-store'}
    });
  }
  async function query(table,parameter,id,jwt) {
    const qs=new URLSearchParams({
      select:table==='memory_chunks'?'id,document_id':'id,user_id,org_id,metadata,status,agent_id',
      [parameter]:'eq.'+id,limit:'1'
    });
    const response=await request('/rest/v1/'+table+'?'+qs,jwt);
    check(response.status===200,table+' authenticated request must succeed');
    const rows=await response.json();
    check(Array.isArray(rows),table+' must return array');
    return rows;
  }
  const sharedOwner=await query('memory_documents','id',c.shared,c.ownerJWT);
  check(sharedOwner.length===1&&sharedOwner[0].user_id===c.owner&&
    sharedOwner[0].org_id===c.org&&sharedOwner[0].status==='ready'&&
    sharedOwner[0].agent_id===null&&sharedOwner[0].metadata?.enterprise_shared===true,
    'Shared owner fixture must be explicit and ready');
  const sharedMember=await query('memory_documents','id',c.shared,c.memberJWT);
  check(sharedMember.length===1&&sharedMember[0].id===c.shared,
    'Current member must read explicitly shared document');
  const privateOwner=await query('memory_documents','id',c.privateDoc,c.ownerJWT);
  check(privateOwner.length===1&&privateOwner[0].user_id===c.owner&&
    privateOwner[0].org_id===c.org&&privateOwner[0].metadata?.enterprise_shared!==true,
    'Owner must retain unshared document');
  const privateMember=await query('memory_documents','id',c.privateDoc,c.memberJWT);
  check(privateMember.length===0,'Member must not read unshared document');
  const sharedChunks=await query('memory_chunks','document_id',c.shared,c.memberJWT);
  check(sharedChunks.length===1&&sharedChunks[0].document_id===c.shared,
    'Member must read indexed shared chunk');
  const privateChunks=await query('memory_chunks','document_id',c.privateDoc,c.memberJWT);
  check(privateChunks.length===0,'Member must not read private document chunk');
  const object='/storage/v1/object/authenticated/knowledge/'+c.path.split('/').map(encodeURIComponent).join('/');
  const fileOwner=await request(object,c.ownerJWT);
  check([200,206].includes(fileOwner.status),'Source owner Storage download must succeed');
  await fileOwner.body?.cancel();
  const fileMember=await request(object,c.memberJWT);
  check([400,401,403,404].includes(fileMember.status),'Non-owner Storage download must be denied');
  await fileMember.body?.cancel();
  return checks;
}
async function selfTest() {
  const owner='00000000-0000-4000-8000-000000000001',member='00000000-0000-4000-8000-000000000002';
  const org='00000000-0000-4000-8000-000000000011';
  const shared='00000000-0000-4000-8000-000000000101',privateDoc='00000000-0000-4000-8000-000000000102';
  const jwt=id=>'header.'+Buffer.from(JSON.stringify({sub:id})).toString('base64url')+'.signature';
  const e={BLACKSTAR_UAT_NONPROD:required,BLACKSTAR_UAT_PROJECT_REF:'abcdefghijklmnopqrst',
    BLACKSTAR_UAT_URL:'https://abcdefghijklmnopqrst.supabase.co',
    BLACKSTAR_UAT_ANON_KEY:'mock-key-not-a-real-secret-only-for-self-tests',
    BLACKSTAR_UAT_OWNER_JWT:jwt(owner),BLACKSTAR_UAT_MEMBER_JWT:jwt(member),
    BLACKSTAR_UAT_ORG_ID:org,BLACKSTAR_UAT_SHARED_DOC_ID:shared,
    BLACKSTAR_UAT_PRIVATE_DOC_ID:privateDoc,BLACKSTAR_UAT_SHARED_OBJECT_PATH:owner+'/synthetic.txt'};
  for(const unsafe of [
    {...e,BLACKSTAR_UAT_NONPROD:''},
    {...e,BLACKSTAR_UAT_PROJECT_REF:productionRef,BLACKSTAR_UAT_URL:'https://'+productionRef+'.supabase.co'},
    {...e,BLACKSTAR_UAT_URL:'https://'+productionRef+'.supabase.co'},
    {...e,BLACKSTAR_UAT_MEMBER_JWT:e.BLACKSTAR_UAT_OWNER_JWT},
    {...e,BLACKSTAR_UAT_SHARED_OBJECT_PATH:member+'/forgery.txt'},
    {...e,BLACKSTAR_UAT_SHARED_OBJECT_PATH:owner+'/../wrong.txt'}
  ])assert.throws(()=>prepareUat(unsafe));
  const c=prepareUat(e);
  const mocked=(url,req)=>{
    const isOwner=req.headers.Authorization==='Bearer '+c.ownerJWT;
    if(url.pathname.startsWith('/storage/v1/object/'))
      return Promise.resolve(new Response('synthetic',{status:isOwner?200:403}));
    if(url.pathname.endsWith('/memory_chunks')){
      const id=url.searchParams.get('document_id').slice(3);
      return Promise.resolve(Response.json(id===shared||isOwner?[{id:'chunk',document_id:id}]:[]));
    }
    if(url.pathname.endsWith('/memory_documents')){
      const id=url.searchParams.get('id').slice(3);
      const isPrivate=id===privateDoc;
      const doc={id,user_id:owner,org_id:org,agent_id:null,status:'ready',
        metadata:isPrivate?{}:{enterprise_shared:true}};
      return Promise.resolve(Response.json(isPrivate&&!isOwner?[]:[doc]));
    }
    throw Error('Unknown mock request');
  };
  const checks=await verifyReadOnly(c,mocked);
  assert.ok(checks>=20,'All synthetic checks must execute');
  await assert.rejects(()=>verifyReadOnly(c,(url,request)=>{
    if(url.pathname.endsWith('/memory_documents')&&
       url.searchParams.get('id')==='eq.'+privateDoc&&
       request.headers.Authorization==='Bearer '+c.memberJWT)
      return Promise.resolve(Response.json([{id:privateDoc,user_id:owner,org_id:org,metadata:{}}]));
    return mocked(url,request);
  }),/Member must not read unshared document/);
  process.stdout.write('Enterprise Knowledge API UAT mocked self-test PASS; '+checks+' checks, no network\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    if(process.argv.length===3&&process.argv[2]==='--self-test') await selfTest();
    else if(process.argv.length===2) {
      const checks=await verifyReadOnly(prepareUat(process.env));
      process.stdout.write('Isolated authenticated Knowledge UAT PASS: '+checks+' read-only checks\n');
    } else throw Error('Usage: node enterprise-knowledge-api-uat.mjs [--self-test]');
  } catch(error) {
    process.stderr.write('Enterprise Knowledge UAT FAIL/BLOCKED: '+
      (error instanceof Error?error.message:'Unidentified failure')+'\n');
    process.exitCode=1;
  }
}
