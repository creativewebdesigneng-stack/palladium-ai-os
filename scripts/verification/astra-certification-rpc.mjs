// Isolated PGlite acceptance of the existing, Astra-hardened service-role RPC.
// All users, evidence and scores are fabricated; no external DB is contacted.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
let assertions = 0
const check = (condition, reason) => { assert.ok(condition, reason); assertions++ }
const query = async (sql, params=[]) => (await db.query(sql, params)).rows
const denied = async (sql, reason) => { await assert.rejects(() => db.query(sql)); assertions++; }
const uuid = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0')
const owner = uuid(9000)
const stranger = uuid(9001)
const suite = 'blackstar-astra-reasoning-certification-v2'
const model = 'fixture-astra-model'
const ids = Array.from({ length: 20 }, (_, i) => uuid(i+1))
const scoreIds = ids.map((_,i) => uuid(i+201))
const responseIds = ids.map((_,i) => uuid(i+101))

await db.exec([
  'create role anon;',
  'create role authenticated;',
  'create role service_role bypassrls;',
  'create table public.model_eval_runs (id uuid primary key, user_id uuid not null, org_id uuid, status text, completed_at timestamptz, metadata jsonb);',
  'create table public.model_eval_responses (id uuid primary key, run_id uuid not null, provider text, model text);',
  'create table public.model_eval_scores (id uuid primary key, run_id uuid not null, response_id uuid not null, evaluator_type text, score numeric);',
  'create table public.model_eval_verified_evidence (id uuid primary key default gen_random_uuid(), user_id uuid, organization_id uuid, model_id text, provider text, model text, suite_id text, task_class text, score numeric, sample_count integer, benchmark_hash text, evaluator_hash text, model_config_hash text, verifier text, completed_at timestamptz, verified_at timestamptz default now());',
  'create table public.model_eval_verified_evidence_runs (evidence_id uuid, run_id uuid);',
].join('\n'))
await db.exec(readFileSync('supabase/migrations/20261023030200_harden_astra_certification_rpc.sql', 'utf8'))

check((await query("select has_function_privilege('anon','public.certify_native_intelligence_model_evaluation(uuid[],text,text,text,text,text,text,text,text,text)','EXECUTE') as allowed"))[0].allowed===false, 'anonymous callers denied')
check((await query("select has_function_privilege('authenticated','public.certify_native_intelligence_model_evaluation(uuid[],text,text,text,text,text,text,text,text,text)','EXECUTE') as allowed"))[0].allowed===false, 'authenticated callers denied')
check((await query("select has_function_privilege('service_role','public.certify_native_intelligence_model_evaluation(uuid[],text,text,text,text,text,text,text,text,text)','EXECUTE') as allowed"))[0].allowed===true, 'service role preserved')

for (let i=0;i<ids.length;i++){
  const metadata = { astra_activation: {
    server_verified:true, suite_id:suite, task_class:'reasoning',
    provider:'compatible', model, case_id:'v2-case-'+String(i+1).padStart(2,'0'),
    provenance_signature:'test-only-hmac-value',
  } }
  await query('insert into public.model_eval_runs(id,user_id,org_id,status,completed_at,metadata) values ($1::uuid,$2::uuid,null,$3,now(),$4::jsonb)',[ids[i],owner,'completed',JSON.stringify(metadata)])
  await query('insert into public.model_eval_responses(id,run_id,provider,model) values ($1::uuid,$2::uuid,$3,$4)',[responseIds[i],ids[i],'compatible',model])
  await query('insert into public.model_eval_scores(id,run_id,response_id,evaluator_type,score) values ($1::uuid,$2::uuid,$3::uuid,$4,$5)',[scoreIds[i],ids[i],responseIds[i],'llm_judge',90])
}

const call = (engine='blackstar-astra-v0.1') => {
  const runIds = 'array['+ids.map(id=>"'"+id+"'::uuid").join(',')+']'
  const constants = ["'"+engine+"'","'compatible'","'"+model+"'","'"+suite+"'","'reasoning'","'"+'a'.repeat(64)+"'","'"+'b'.repeat(64)+"'","'"+'c'.repeat(64)+"'","'test-verifier'"]
  return 'select (public.certify_native_intelligence_model_evaluation('+[runIds,...constants].join(',')+')).score as score'
}

check(Number((await query(call()))[0].score)===0.9, 'signed Astra fixture qualifies at 90%')
await query('update public.model_eval_scores set score=40')
await denied(call(),'low scoring Astra may not be certified')
check(Number((await query('select count(*)::integer as n from public.model_eval_verified_evidence'))[0].n)===1,'failing score does not create evidence')
await query('update public.model_eval_scores set score=90')

await query("update public.model_eval_runs set metadata=jsonb_set(metadata,'{astra_activation,suite_id}',to_jsonb($1::text)) where id=$2::uuid",['wrong-suite',ids[0]])
await denied(call(),'Astra versioned suite mismatch denied')
await query("update public.model_eval_runs set metadata=jsonb_set(metadata,'{astra_activation,suite_id}',to_jsonb($1::text)) where id=$2::uuid",[suite,ids[0]])

await query("update public.model_eval_runs set metadata=jsonb_set(metadata,'{astra_activation,case_id}',to_jsonb($1::text)) where id=$2::uuid",['v2-case-01',ids[1]])
await denied(call(),'duplicate benchmark case denied')
await query("update public.model_eval_runs set metadata=jsonb_set(metadata,'{astra_activation,case_id}',to_jsonb($1::text)) where id=$2::uuid",['v2-case-02',ids[1]])

await query('update public.model_eval_scores set evaluator_type=$1 where id=$2::uuid',['formula',scoreIds[0]])
await denied(call(),'Astra non-independent evaluator type denied')
await query('update public.model_eval_scores set evaluator_type=$1 where id=$2::uuid',['llm_judge',scoreIds[0]])

await query('update public.model_eval_runs set user_id=$1::uuid where id=$2::uuid',[stranger,ids[0]])
await denied(call(),'cross-owner mixed run set denied')
await query('update public.model_eval_runs set user_id=$1::uuid where id=$2::uuid',[owner,ids[0]])

await query('update public.model_eval_scores set score=40,evaluator_type=$1',['formula'])
await query("update public.model_eval_runs set metadata='{}'::jsonb")
check(Number((await query(call('ordinary-native-model')))[0].score)===0.4,'non-Astra generic RPC retains original non-LLM low-score behavior')
await db.close()
console.log('Astra certification RPC: '+assertions+' isolated Postgres checks passed.')
