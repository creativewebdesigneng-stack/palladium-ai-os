/**
 * Blackstar isolated-only Supabase Auth UAT claim preflight.
 * Checks decoded claims without network requests. This is NOT JWT signature
 * verification; the actual Supabase Auth/Data/Storage APIs verify signatures.
 * Never persist, print, or log token strings or test file contents.
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRODUCTION='piwhiuangitqvwvwwcga';
const CONFIRM='I_CONFIRM_ISOLATED_TEST_DATABASE';

function decoded(token,label) {
  assert.ok(typeof token==='string'&&token.length>40&&token.split('.').length===3,
    label+': complete JWT required');
  try {
    const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
    assert.ok(claims&&typeof claims==='object'&&!Array.isArray(claims));
    return claims;
  } catch { throw Error(label+': invalid JWT payload'); }
}

export function validateIsolatedUatCredentials(e,now=Math.floor(Date.now()/1000)) {
  assert.equal(e.BLACKSTAR_UAT_NONPROD,CONFIRM,'Explicit non-production confirmation required');
  const ref=String(e.BLACKSTAR_UAT_PROJECT_REF||'').toLowerCase();
  assert.match(ref,/^[a-z0-9]{20}$/,'Isolated Supabase project reference required');
  assert.notEqual(ref,PRODUCTION,'Production reference forbidden');
  const url=new URL(String(e.BLACKSTAR_UAT_URL||''));
  assert.equal(url.protocol,'https:','HTTPS required');
  assert.equal(url.hostname,ref+'.supabase.co','URL/project mismatch');
  assert.equal(url.pathname,'/','Use isolated project base URL');
  assert.equal(url.search,'','No query string permitted');
  assert.equal(url.hash,'','No URL fragment permitted');
  const key=e.BLACKSTAR_UAT_ANON_KEY;
  assert.ok(typeof key==='string'&&key.length>20,'Isolated publishable/anon key required');
  if(key.startsWith('sb_publishable_')) {
    assert.ok(/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key),'Invalid publishable key format');
  } else {
    const publicClaims=decoded(key,'publishable/anon key');
    assert.equal(publicClaims.role,'anon','Service-role or privileged key forbidden');
    if(publicClaims.ref!=null) assert.equal(publicClaims.ref,ref,'Anon key project mismatch');
  }
  const issuer='https://'+ref+'.supabase.co/auth/v1';
  function claims(token,label){
    const c=decoded(token,label);
    assert.match(String(c.sub||''),UUID,label+': UUID subject required');
    assert.equal(c.iss,issuer,label+': issuer mismatch');
    assert.equal(c.role,'authenticated',label+': authenticated user required');
    assert.ok(c.aud==='authenticated'||(Array.isArray(c.aud)&&c.aud.includes('authenticated')),
      label+': authenticated audience required');
    assert.match(String(c.session_id||''),UUID,label+': session UUID required');
    assert.equal(c.is_anonymous,false,label+': anonymous session forbidden');
    assert.ok(Number.isInteger(c.exp)&&c.exp>now+120,label+': expired or near-expiry');
    assert.ok(Number.isInteger(c.iat)&&c.iat<=now+60&&c.iat<=c.exp,label+': invalid issued-at');
    if(c.nbf!=null)assert.ok(Number.isInteger(c.nbf)&&c.nbf<=now+60,
      label+': token not yet valid');
    return {sub:c.sub.toLowerCase(),session:c.session_id.toLowerCase()};
  }
  const a=claims(e.BLACKSTAR_UAT_OWNER_JWT,'owner');
  const b=claims(e.BLACKSTAR_UAT_MEMBER_JWT,'member');
  assert.notEqual(a.sub,b.sub,'Distinct UAT users required');
  assert.notEqual(a.session,b.session,'Distinct UAT sessions required');
  return {ref,owner:a.sub,member:b.sub}; // Never return JWT strings.
}

function selfTest() {
  const now=1793405000,ref='abcdefghijklmnopqrst';
  const a='00000000-0000-4000-8000-000000000001';
  const b='00000000-0000-4000-8000-000000000002';
  const token=(sub,over={})=>'header.'+Buffer.from(JSON.stringify({
    sub,iss:'https://'+ref+'.supabase.co/auth/v1',aud:'authenticated',
    role:'authenticated',exp:now+3600,iat:now-60,
    session_id:sub,is_anonymous:false,...over,
  })).toString('base64url')+'.signature';
  const good={BLACKSTAR_UAT_NONPROD:CONFIRM,BLACKSTAR_UAT_PROJECT_REF:ref,
    BLACKSTAR_UAT_URL:'https://'+ref+'.supabase.co',
    BLACKSTAR_UAT_ANON_KEY:'sb_publishable_synthetic-public-key-placeholder',
    BLACKSTAR_UAT_OWNER_JWT:token(a),BLACKSTAR_UAT_MEMBER_JWT:token(b)};
  const v=validateIsolatedUatCredentials(good,now);
  assert.equal(v.owner,a); assert.equal(v.member,b);
  const bad=[
    {...good,BLACKSTAR_UAT_NONPROD:''},
    {...good,BLACKSTAR_UAT_PROJECT_REF:PRODUCTION,
      BLACKSTAR_UAT_URL:'https://'+PRODUCTION+'.supabase.co'},
    {...good,BLACKSTAR_UAT_URL:'https://example.com'},
    {...good,BLACKSTAR_UAT_URL:good.BLACKSTAR_UAT_URL+'/?a=1'},
    {...good,BLACKSTAR_UAT_URL:good.BLACKSTAR_UAT_URL+'/#x'},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:good.BLACKSTAR_UAT_OWNER_JWT},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:token(b,{session_id:a})},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:token(b,{iss:'https://other.supabase.co/auth/v1'})},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:token(b,{role:'service_role'})},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:token(b,{is_anonymous:true})},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:token(b,{session_id:''})},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:token(b,{aud:'anon'})},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:token(b,{exp:now-1})},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:token(b,{exp:now+90})},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:token(b,{iat:now+300})},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:token(b,{nbf:now+300})},
    {...good,BLACKSTAR_UAT_MEMBER_JWT:'not-a-jwt'},
    {...good,BLACKSTAR_UAT_ANON_KEY:'sb_secret_privileged-test-placeholder'},
    {...good,BLACKSTAR_UAT_ANON_KEY:'header.'+
      Buffer.from(JSON.stringify({role:'service_role',ref})).toString('base64url')+'.signature'},
    {...good,BLACKSTAR_UAT_ANON_KEY:'header.'+
      Buffer.from(JSON.stringify({role:'anon',ref:'otherprojectrefxxxxx'})).toString('base64url')+'.signature'},
  ];
  for(const input of bad)assert.throws(()=>validateIsolatedUatCredentials(input,now));
  process.stdout.write('Blackstar isolated JWT UAT preflight PASS: '+(bad.length+2)+' synthetic assertions; zero network requests.\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try {
    if(process.argv.length===3&&process.argv[2]==='--self-test') selfTest();
    else if(process.argv.length===2){
      validateIsolatedUatCredentials(process.env);
      process.stdout.write('Isolated JWT claim preflight PASS; API signature validation still required.\n');
    } else throw Error('Usage: node isolated-uat-jwt-guard.mjs [--self-test]');
  } catch(e) {
    process.stderr.write('Isolated UAT JWT preflight BLOCKED: '+(e instanceof Error?e.message:'Invalid input')+'\n');
    process.exitCode=1;
  }
}
