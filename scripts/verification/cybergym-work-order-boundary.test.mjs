import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, symlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  WORK_ORDER_SCHEMA, WORK_ORDER_DECISION_SCHEMA, BENIGN_ACTION, OFFICIAL_ACTION,
  evaluateCyberGymWorkOrder, readCyberGymWorkOrderFile, runOperatorBenignWorkOrder,
} from './cybergym-work-order-boundary.mjs'

const uuid = '8bbeb276-77f5-46cd-bd86-1b6b02c137c9'
const ticket = (action = BENIGN_ACTION) => ({
  schema: WORK_ORDER_SCHEMA, action, requestId: uuid,
})
const sample = () => ({
  schema: 'blackstar.cybergym.trusted-controller-benign.v1',
  status: 'TRUSTED_HOST_BENIGN_SEQUENCE_OBSERVED_BENCHMARK_BLOCKED',
  stages: {
    windowsBoundary: 'PASS', localAstraNoToolInference: 'PASS',
    benignDockerConfinement: 'PASS', networkEmptyAfterRun: true,
  },
  approvalGranted: false, vulnerableBenchmarkExecuted: false,
  privateSubmissionServerReady: false, agentCanReachModel: false,
  independentlyAttested: false,
})

test('benign ticket is an operator-reviewed proposal, never authority', () => {
  const result = evaluateCyberGymWorkOrder(ticket())
  assert.equal(result.schema, WORK_ORDER_DECISION_SCHEMA)
  assert.equal(result.status, 'BENIGN_OPERATOR_ONLY_OFFICIAL_EXECUTION_BLOCKED')
  assert.equal(result.operatorInvocationRequired, true)
  for (const field of [
    'untrustedInputCanGrantApproval','arbitraryCommandsAccepted',
    'arbitraryModelEndpointsAccepted','dockerOptionsAccepted',
    'untrustedContainerReceivesDockerApi','officialEvaluatorConnected',
    'officialBenchmarkExecutionPermitted','approvalGranted','independentlyAttested',
  ]) assert.equal(result[field], false, field)
  assert.ok(!JSON.stringify(result).includes(uuid))
})

test('official benchmark work order is DENIED even if syntactically valid', () => {
  const result = evaluateCyberGymWorkOrder(ticket(OFFICIAL_ACTION))
  assert.equal(result.status, 'OFFICIAL_EXECUTION_DENIED')
  assert.equal(result.officialBenchmarkExecutionPermitted,false)
})

test('official request never invokes Docker or model runner', async () => {
  let called = 0
  await assert.rejects(
    runOperatorBenignWorkOrder(ticket(OFFICIAL_ACTION), () => {called++;return sample()}),
    /Official execution is disabled/,
  )
  assert.equal(called, 0)
})

test('benign work order invokes existing bounded host controller exactly once in test fixture', async () => {
  let called = 0
  const response = await runOperatorBenignWorkOrder(ticket(), () => {
    called += 1
    return sample()
  })
  assert.equal(called,1)
  assert.equal(response.status,'BENIGN_HOST_CHECK_OBSERVED_OFFICIAL_EXECUTION_BLOCKED')
  assert.equal(response.evidence.localAstraNoToolInference,'PASS')
  assert.equal(response.evidence.benignDockerConfinement,'PASS')
  assert.equal(response.approvalGranted,false)
  assert.equal(response.officialBenchmarkExecutionPermitted,false)
  assert.equal(response.privateSubmissionServerReady,false)
  assert.equal(response.independentlyAttested,false)
})

test('no untrusted arbitrary authority, Docker options, tools or endpoints accepted', () => {
  const attackFields=[
    {approvalGranted:true},
    {approved:true},
    {approvalToken:'fake'},
    {approvalId:uuid},
    {docker:{privileged:true}},
    {command:'sh -c echo'},
    {shell:'powershell'},
    {env:{OLLAMA_HOST:'0.0.0.0'}},
    {modelUrl:'https://example.net'},
    {baseUrl:'http://localhost:11434/v1'},
    {url:'http://127.0.0.1:8666'},
    {tools:['browser_task']},
    {taskIds:['arvo:47101']},
    {image:'unapproved-image'},
    {mounts:['/var/run/docker.sock']},
    {role:'admin'},
    {allowPublicIngress:true},
  ]
  for (const fields of attackFields) {
    assert.throws(() => evaluateCyberGymWorkOrder({...ticket(),...fields}),
      /unsupported fields or type/)
  }
})

test('malformed schema, UUID, arrays, and unusual prototypes fail closed', () => {
  for(const value of [
    null, undefined, [], 'benign', 3,
    {...ticket(), requestId:'not-uuid'},
    {...ticket(), requestId:''},
    {...ticket(), schema:'blackstar.cybergym.execution.v2'},
    {...ticket(), action:'official-execute-now'},
    JSON.parse('{"schema":"blackstar.cybergym.work-order.v1","action":"benign-trusted-host-smoke","requestId":"'+uuid+'","__proto__":{"admin":true}}'),
  ]) assert.throws(()=>evaluateCyberGymWorkOrder(value))
})

test('benign runner refused on missing or falsified evidence, never claims official execution', async () => {
  const mutations=[
    x => {x.status='OFFICIAL_BENCHMARK_PASSED'},
    x => {x.stages.windowsBoundary='FAIL'},
    x => {x.stages.localAstraNoToolInference='FAIL'},
    x => {x.stages.networkEmptyAfterRun=false},
    x => {x.approvalGranted=true},
    x => {x.vulnerableBenchmarkExecuted=true},
    x => {x.privateSubmissionServerReady=true},
    x => {x.agentCanReachModel=true},
    x => {x.independentlyAttested=true},
  ]
  for(const mutate of mutations) {
    const r = sample()
    mutate(r)
    await assert.rejects(runOperatorBenignWorkOrder(ticket(),()=>r),/did not return accepted bounded evidence/)
  }
})

test('bounded local non-symlink JSON ticket can be inspected offline', () => {
  const dir=mkdtempSync(path.join(tmpdir(),'cybergym-work-order-'))
  try {
    const file=path.join(dir,'request.json')
    writeFileSync(file,JSON.stringify(ticket()),'utf8')
    assert.deepEqual(readCyberGymWorkOrderFile(file),ticket())
    const link=path.join(dir,'link.json')
    symlinkSync(file,link)
    assert.throws(()=>readCyberGymWorkOrderFile(link),/bounded regular non-link/)
    assert.throws(()=>readCyberGymWorkOrderFile('\\\\attacker\\share\\request.json'),/Invalid local/)
    assert.throws(()=>readCyberGymWorkOrderFile(file.replace(/\.json$/,'.txt')),/Only local JSON/)
    writeFileSync(file,'x'.repeat(3000),'utf8')
    assert.throws(()=>readCyberGymWorkOrderFile(file),/bounded regular non-link/)
  } finally { rmSync(dir,{recursive:true,force:true}) }
})

test('work order read denies unexpected keys from JSON even for benign', () => {
  const dir=mkdtempSync(path.join(tmpdir(),'cybergym-untrusted-'))
  try {
    const file=path.join(dir,'request.json')
    writeFileSync(file,JSON.stringify({...ticket(),approvalGranted:true}),'utf8')
    assert.throws(()=>readCyberGymWorkOrderFile(file),/unsupported fields/)
  } finally { rmSync(dir,{recursive:true,force:true}) }
})
