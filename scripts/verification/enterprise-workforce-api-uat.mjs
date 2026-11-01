/**
 * Blackstar Enterprise Workforce — isolated, authenticated, READ-ONLY API UAT.
 *
 * The safe mock self-test cannot certify live agent or browser execution. Real
 * mode needs explicit isolated Supabase project + two distinct signed-in
 * synthetic test sessions and twelve pre-existing run IDs.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateIsolatedUatCredentials } from './isolated-uat-jwt-guard.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES = ['approved_execution', 'rejected_approval', 'denied_tool', 'tool_failure'];
const WORKFLOWS = ['research_briefing','customer_triage_draft','engineering_qa_draft'];
const MAX_ROWS = 100;
const validId = x => typeof x === 'string' && UUID.test(x);
function check(ok, code) {
  if (!ok) throw new Error(code);
}

export function prepareWorkforceUat(e, manifest) {
  const claims = validateIsolatedUatCredentials(e);
  check(manifest?.schemaVersion === 1 && Array.isArray(manifest.scenarios) &&
    manifest.scenarios.length === 3, 'manifest_invalid');
  const seenRuns = new Set(), seenApprovals = new Set();
  const workflows = new Set();
  const cases = [];
  for (const scenario of manifest.scenarios) {
    check(WORKFLOWS.includes(scenario?.id) && !workflows.has(scenario.id) &&
      validId(scenario.agentId) && Array.isArray(scenario.cases) &&
      scenario.cases.length === 4, 'scenario_invalid');
    workflows.add(scenario.id);
    const caseNames = new Set();
    for (const item of scenario.cases) {
      check(TYPES.includes(item?.kind) && !caseNames.has(item.kind) &&
        validId(item.runId) && !seenRuns.has(item.runId) &&
        typeof item.tool === 'string' && /^[a-z][a-z0-9_]{1,39}$/.test(item.tool),
        'case_invalid');
      check((item.kind === 'denied_tool' && item.approvalId === null) ||
        (item.kind !== 'denied_tool' && validId(item.approvalId) &&
        !seenApprovals.has(item.approvalId)), 'approval_fixture_invalid');
      caseNames.add(item.kind);seenRuns.add(item.runId);
      if (item.approvalId) seenApprovals.add(item.approvalId);
      cases.push({ ...item, workflow:scenario.id, agentId:scenario.agentId });
    }
    check(TYPES.every(type => caseNames.has(type)), 'missing_trial');
  }
  check(WORKFLOWS.every(w => workflows.has(w)) && cases.length === 12,'missing_workflow');
  return {
    base: e.BLACKSTAR_UAT_URL, key:e.BLACKSTAR_UAT_ANON_KEY,
    ownerJWT:e.BLACKSTAR_UAT_OWNER_JWT, memberJWT:e.BLACKSTAR_UAT_MEMBER_JWT,
    owner:claims.owner, member:claims.member, cases,
  };
}

const fields = {
  agent_tasks:'id,user_id,agent_id,status',
  approval_requests:'id,user_id,agent_id,status,action_type,details,decided_by,decided_at,execution_status,executed_at,execution_result',
  tool_executions:'id,user_id,agent_id,agent_task_id,tool,status,input,created_at',
  mission_audit_logs:'id,user_id,agent_id,action,status,target_type,target_id,created_at,metadata',
};
async function readRows(c, transport, table, column, id, jwt) {
  const params = new URLSearchParams({select:fields[table],[column]:'eq.'+id,limit:String(MAX_ROWS)});
  const response = await transport(new URL('/rest/v1/'+table+'?'+params,c.base), {
    method:'GET',redirect:'error',signal:AbortSignal.timeout(15000),
    headers:{ apikey:c.key,Authorization:'Bearer '+jwt,Accept:'application/json','Cache-Control':'no-store' },
  });
  check(response.status === 200, 'data_api_unavailable');
  const rows = await response.json();
  check(Array.isArray(rows) && rows.length < MAX_ROWS,'ambiguous_or_unbounded_rows');
  return rows;
}

/**
 * Uses the real owner JWT and independent member JWT. The member must have no
 * visibility of any owner-owned run, approval, execution or audit row. No
 * simulated success is considered proof. Approval rows and audit rows are
 * independently read; no model output is accepted as an execution receipt.
 *
 * Even a real API PASS is not proof of the Playwright worker's actual network
 * side effect: independently compare browser worker/server logs and Preview UAT.
 */
export async function verifyWorkforceUat(c, transport = fetch, options = {}) {
  const failures = {};
  let casesPassed = 0, apiChecks = 0;
  const expect = (ok, code) => { apiChecks++; if (!ok) failures[code] = (failures[code] ?? 0) + 1; };
  for (const item of c.cases) {
    let passed = true;
    const verify = (ok, code) => { if (!ok) passed = false; expect(ok, code); };
    try {
      const taskOwner = await readRows(c,transport,'agent_tasks','id',item.runId,c.ownerJWT);
      const taskMember = await readRows(c,transport,'agent_tasks','id',item.runId,c.memberJWT);
      verify(taskMember.length === 0,'member_can_read_run');
      const task = taskOwner[0];
      verify(taskOwner.length === 1 && task?.user_id === c.owner &&
        task?.agent_id === item.agentId, 'owner_run_missing_or_mismatch');
      const desired = item.kind === 'approved_execution' ? ['completed'] :
        item.kind === 'rejected_approval' ? ['cancelled'] : ['failed','blocked','cancelled'];
      verify(desired.includes(task?.status),'run_status_inconsistent');

      const toolOwner = await readRows(c,transport,'tool_executions','agent_task_id',item.runId,c.ownerJWT);
      const toolMember = await readRows(c,transport,'tool_executions','agent_task_id',item.runId,c.memberJWT);
      verify(toolMember.length === 0,'member_can_read_tool_evidence');
      verify(toolOwner.every(row => row.user_id === c.owner &&
        row.agent_id === item.agentId && row.agent_task_id === item.runId),
      'tool_ledger_ownership_mismatch');

      const auditTask = await readRows(c,transport,'mission_audit_logs','target_id',item.runId,c.ownerJWT);
      const auditMember = await readRows(c,transport,'mission_audit_logs','target_id',item.runId,c.memberJWT);
      verify(auditMember.length === 0,'member_can_read_task_audit');
      verify(auditTask.every(row => row.user_id === c.owner &&
        (row.agent_id === null || row.agent_id === item.agentId)), 'task_audit_ownership_mismatch');

      if (item.kind === 'denied_tool') {
        verify(taskOwner.length === 1 && !['completed','running'].includes(task.status),
          'unauthorised_run_was_not_blocked');
        verify(toolOwner.some(row => row.tool === item.tool && row.status === 'failed' &&
          typeof row.input?.policy_code === 'string' && row.input.policy_code.length > 0 &&
          row.input.redacted === true), 'missing_policy_denial');
        verify(!toolOwner.some(row => row.tool === item.tool && row.status === 'succeeded'), 'unauthorised_tool_succeeded');
        verify(auditTask.some(row => row.status === 'denied' &&
          row.action === 'agent.tool_policy_denied' && row.agent_id === item.agentId &&
          row.metadata?.tool === item.tool &&
          typeof row.metadata?.policy_code === 'string'),
          'missing_denial_audit');
      } else {
        const approvals = await readRows(c,transport,'approval_requests','id',item.approvalId,c.ownerJWT);
        const memberApprovals = await readRows(c,transport,'approval_requests','id',item.approvalId,c.memberJWT);
        verify(memberApprovals.length === 0,'member_can_read_approval');
        const approval = approvals[0];
        verify(approvals.length === 1 && approval?.user_id === c.owner &&
          approval?.agent_id === item.agentId && approval?.details?.agent_task_id === item.runId &&
          (approval?.action_type === 'agent_browser_task' && item.tool === 'browser_task' ||
           approval?.action_type === 'agent_tool_task' && approval?.details?.tool === item.tool),
          'approval_run_tool_association_invalid');
        const auditApproval = await readRows(c,transport,'mission_audit_logs','target_id',item.approvalId,c.ownerJWT);
        const memberAudit = await readRows(c,transport,'mission_audit_logs','target_id',item.approvalId,c.memberJWT);
        verify(memberAudit.length === 0,'member_can_read_approval_audit');
        verify(auditApproval.every(row => row.user_id === c.owner &&
          row.target_type === 'approval_request'),'approval_audit_invalid');
        const finalAction = item.kind === 'rejected_approval' ? 'external_action_rejected' :
          item.kind === 'approved_execution' ? 'external_action_executed' : 'external_action_failed';
        verify(auditApproval.some(row => row.action === finalAction &&
          row.agent_id === item.agentId), 'missing_final_approval_audit');

        const decisionTime = Date.parse(approval?.decided_at || '');
        verify(Number.isFinite(decisionTime) && approval?.decided_by === c.owner,
          'missing_operator_decision');
        const laterActions = toolOwner.filter(row =>
          row.tool === item.tool && Date.parse(row.created_at || '') >= decisionTime);
        const executionAudit = auditTask.filter(row =>
          (row.action === 'agent.browser_approval_execution' ||
           row.action === 'agent.tool_approval_execution' ||
           row.action === 'agent.browser_approval_result' ||
           row.action === 'agent.tool_approval_result') &&
           row.metadata?.approval_request_id === item.approvalId);

        if (item.kind === 'approved_execution') {
          verify(approval?.status === 'approved' && approval?.execution_status === 'succeeded' &&
            approval?.execution_result?.simulated === false && Number.isFinite(Date.parse(approval?.executed_at||'')),
            'unverified_approval_success');
          verify(executionAudit.some(row => row.action.endsWith('_approval_result') &&
            row.metadata?.simulated === false), 'missing_durable_approved_result_audit');
          verify(laterActions.some(row => row.status === 'succeeded'), 'missing_real_tool_ledger_success');
        } else if (item.kind === 'rejected_approval') {
          verify(approval?.status === 'rejected' && approval?.execution_status == null &&
            approval?.executed_at == null, 'rejection_not_terminal');
          verify(executionAudit.length === 0,'execution_audit_after_rejection');
          verify(laterActions.length === 0, 'tool_executed_after_rejection');
        } else {
          verify(approval?.status === 'approved' && approval?.execution_status === 'failed' &&
            Number.isFinite(Date.parse(approval?.executed_at||'')), 'failed_action_not_recorded');
          verify(!laterActions.some(row => row.status === 'succeeded'), 'failed_action_has_success_receipt');
          verify(auditApproval.some(row => row.action === 'external_action_failed' &&
            row.status === 'failed'),'missing_failure_audit');
        }
      }
    } catch {
      passed=false;
      expect(false,'api_error_or_missing_required_evidence');
    }
    if(passed) casesPassed++;
  }
  return {
    kind:'isolated_authenticated_workforce_api_uat',
    source:options.mockTransport ? 'synthetic_mock_transport' : 'isolated_supabase_data_api',
    casesChecked:c.cases.length,casesPassed,apiChecks,
    status:casesPassed===c.cases.length ? 'api_evidence_consistent' : 'blocked_or_failed',
    failures,
    customerAcceptanceCertified:false, browserWorkerSideEffectVerified:false,
    limitation:'API ledger consistency and RLS negative checks alone do not certify browser network execution, no-hidden-side-effects, overall AI answer quality or buyer UAT.',
  };
}

function fixture() {
  const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
  const owner=id(1), member=id(2), ref='abcdefghijklmnopqrst';
  const now=Math.floor(Date.now()/1000);
  const jwt=sub=>'test.'+Buffer.from(JSON.stringify({sub,session_id:sub,iss:'https://'+ref+'.supabase.co/auth/v1',aud:'authenticated',role:'authenticated',is_anonymous:false,iat:now-60,exp:now+3600})).toString('base64url')+'.sig';
  const manifest={schemaVersion:1,scenarios:WORKFLOWS.map((name,i)=>({
    id:name,agentId:id(i+100),cases:TYPES.map((kind,j)=>({
      kind,runId:id(1000+i*10+j),approvalId:kind==='denied_tool'?null:id(2000+i*10+j),tool:'browser_task'
    }))
  }))};
  const env={BLACKSTAR_UAT_NONPROD:'I_CONFIRM_ISOLATED_TEST_DATABASE',BLACKSTAR_UAT_PROJECT_REF:ref,
    BLACKSTAR_UAT_URL:'https://'+ref+'.supabase.co',BLACKSTAR_UAT_ANON_KEY:'sb_publishable_synthetic-key-example',
    BLACKSTAR_UAT_OWNER_JWT:jwt(owner),BLACKSTAR_UAT_MEMBER_JWT:jwt(member)};
  return { c:prepareWorkforceUat(env,manifest),manifest,env };
}

async function selfTest() {
  const {c,manifest,env}=fixture();
  assert.equal(c.cases.length,12);
  assert.throws(()=>prepareWorkforceUat({...env,BLACKSTAR_UAT_PROJECT_REF:'piwhiuangitqvwvwwcga',
    BLACKSTAR_UAT_URL:'https://piwhiuangitqvwvwwcga.supabase.co'},manifest));
  assert.throws(()=>prepareWorkforceUat(env,{...manifest,scenarios:manifest.scenarios.slice(0,2)}));
  assert.throws(()=>prepareWorkforceUat(env,{...manifest,scenarios:[
    {...manifest.scenarios[0],cases:[...manifest.scenarios[0].cases.slice(0,3),manifest.scenarios[0].cases[0]]},
    ...manifest.scenarios.slice(1)]}));
  const mocked = async (url,opts) => {
    assert.equal(opts.method,'GET');
    assert.equal(opts.redirect,'error');
    const owner = opts.headers.Authorization === 'Bearer '+c.ownerJWT;
    const table = url.pathname.split('/').pop();
    const key = table === 'tool_executions' ? 'agent_task_id' : table === 'mission_audit_logs' ? 'target_id' : 'id';
    const run = url.searchParams.get(key)?.slice(3);
    const item = c.cases.find(x=>x.runId===run || x.approvalId===run);
    if(!owner || !item)return Response.json([]);
    const base={user_id:c.owner,agent_id:item.agentId};
    const time='2026-10-30T12:00:00.000Z', later='2026-10-30T12:00:01.000Z';
    if(table==='agent_tasks')return Response.json([{id:item.runId,...base,
      status:item.kind==='approved_execution'?'completed':item.kind==='rejected_approval'?'cancelled':'failed'}]);
    if(table==='approval_requests')return Response.json([{id:item.approvalId,...base,
      action_type:'agent_browser_task',details:{agent_task_id:item.runId},decided_by:c.owner,
      decided_at:time, status:item.kind==='rejected_approval'?'rejected':'approved',
      execution_status:item.kind==='rejected_approval'?null:item.kind==='approved_execution'?'succeeded':'failed',
      executed_at:item.kind==='rejected_approval'?null:later,
      execution_result:item.kind==='approved_execution'?{simulated:false}:null}]);
    if(table==='tool_executions')return Response.json(item.kind==='rejected_approval'?[]:[{
      id:item.runId,...base,agent_task_id:item.runId,tool:item.tool,
      status:item.kind==='approved_execution'?'succeeded':'failed',
      input:item.kind==='denied_tool'?{redacted:true,policy_code:'TOOL_DENIED'}:{redacted:true},
      created_at:later}]);
    if(table==='mission_audit_logs') {
      const isApproval=run===item.approvalId;
      if(isApproval)return Response.json([{id:item.approvalId,...base,target_type:'approval_request',
        target_id:item.approvalId,action:item.kind==='rejected_approval'?'external_action_rejected':
        item.kind==='approved_execution'?'external_action_executed':'external_action_failed',
        status:item.kind==='tool_failure'?'failed':'success',created_at:later}]);
      const result=item.kind==='approved_execution'?[{id:item.runId,...base,
        target_type:'agent_task',target_id:item.runId,action:'agent.browser_approval_result',
        status:'success',metadata:{approval_request_id:item.approvalId,simulated:false},created_at:later}]:
        item.kind==='denied_tool'?[{id:item.runId,...base,target_type:'agent_task',target_id:item.runId,
          action:'agent.tool_policy_denied',status:'denied',
          metadata:{tool:item.tool,policy_code:'TOOL_DENIED'},created_at:later}]:[];
      return Response.json(result);
    }
    throw Error('Unexpected table');
  };
  const pass = await verifyWorkforceUat(c,mocked,{mockTransport:true});
  assert.equal(pass.status,'api_evidence_consistent');
  assert.equal(pass.casesPassed,12);
  assert.equal(pass.customerAcceptanceCertified,false);
  const leak = await verifyWorkforceUat(c,(url,opts)=>{
    if(opts.headers.Authorization==='Bearer '+c.memberJWT && url.pathname.endsWith('/agent_tasks'))
      return Promise.resolve(Response.json([{id:c.cases[0].runId}]));
    return mocked(url,opts);
  },{mockTransport:true});
  assert.equal(leak.status,'blocked_or_failed');
  assert.equal(leak.failures.member_can_read_run,12);
  const lostAudit=await verifyWorkforceUat(c,(url,opts)=>{
    if(url.pathname.endsWith('/mission_audit_logs') &&
       opts.headers.Authorization==='Bearer '+c.ownerJWT)return Promise.resolve(Response.json([]));
    return mocked(url,opts);
  },{mockTransport:true});
  assert.equal(lostAudit.status,'blocked_or_failed');
  assert.ok(lostAudit.failures.missing_final_approval_audit>0);
  process.stdout.write('Enterprise Workforce isolated API UAT MOCK self-test PASS: 12 synthetic cases + fail-closed negative checks; no network\n');
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    if(process.argv.length===3 && process.argv[2]==='--self-test') await selfTest();
    else if(process.argv.length===4 && process.argv[2]==='--manifest') {
      const manifest=JSON.parse(await readFile(process.argv[3],'utf8'));
      const c=prepareWorkforceUat(process.env,manifest);
      const report=await verifyWorkforceUat(c);
      process.stdout.write(JSON.stringify(report,null,2)+'\n');
      if(report.status!=='api_evidence_consistent')process.exitCode=2;
    }else throw Error('usage');
  }catch{
    // Never print token, project URL, input path, private row, exception, or test identifiers.
    process.stderr.write('Enterprise Workforce API UAT BLOCKED: unsafe environment, invalid fixture or incomplete evidence.\n');
    process.exitCode=1;
  }
}
