import test from 'node:test'
import assert from 'node:assert/strict'
import { runOwnerTrustedControllerBenign, BENIGN_CONTROLLER_SCHEMA, BenignControllerStageError, sanitizedBenignControllerFailure } from './cybergym-trusted-controller-benign.mjs'
import { AstraSmokeCompletionError } from './cybergym-native-smoke.mjs'

const validTopology = () => ({
  schema: 'blackstar.cybergym.controller-topology.v1',
  status: 'WINDOWS_BOUNDARY_OBSERVED_BENCHMARK_BLOCKED',
  failed: [],
  networkGateway: '172.18.0.1',
  checks: Object.fromEntries([
    'windowsHost', 'localDockerTransport', 'linuxDockerEngine',
    'isolatedEmptyNetwork', 'windowsListenerInventoryValid',
    'localModelLoopbackOnly', 'noWindowsSubmissionListener',
    'windowsGatewayOwnershipKnown',
  ].map((k) => [k, true])),
  approvalGranted: false, vulnerableBenchmarkExecuted: false,
  officialSubmissionServerTopologyVerified: false,
})
const validModel = () => ({
  schema: 'blackstar.cybergym.native-smoke.v1',
  status: 'LOCAL_MODEL_SMOKE_PASSED_BENCHMARK_BLOCKED',
  transport: '127.0.0.1-only', model: 'qwen3:8b-q4_K_M', provider: 'compatible',
  modelsEndpoint: 'PASS', noToolCompletion: 'PASS', completionLatencyMs: 23,
  benchmarkExecuted: false, executableApprovalGranted: false,
})
const validConfinement = () => ({
  schema: 'blackstar.cybergym.benign-confinement.v1',
  status: 'BENIGN_CONFINEMENT_OBSERVED_EXECUTION_BLOCKED',
  failed: [], checks: Object.fromEntries([
    'nonRootUser', 'noEffectiveCapabilities', 'noBoundingCapabilities',
    'noNewPrivileges', 'seccompFiltered', 'rootFilesystemReadOnly',
    'ipv4NoDefaultRoute', 'ipv6NoDefaultRoute',
  ].map((k) => [k, true])),
  networkEmptyAfterRun: true,
  benchmarkExecuted: false, approvalGranted: false,
})
const makeStages = (record, t=validTopology(), m=validModel(), c=validConfinement()) => ({
  topology: async () => { record.push('topology'); return t },
  model: async () => { record.push('model'); return m },
  confinement: () => { record.push('confinement'); return c },
})

test('synthetic fully passing host sequence still fails closed for official benchmark', async () => {
  const record=[]
  const r=await runOwnerTrustedControllerBenign(makeStages(record))
  assert.deepEqual(record,['topology','model','confinement'])
  assert.equal(r.schema,BENIGN_CONTROLLER_SCHEMA)
  assert.equal(r.status,'TRUSTED_HOST_BENIGN_SEQUENCE_OBSERVED_BENCHMARK_BLOCKED')
  assert.equal(r.stages.localAstraNoToolInference,'PASS')
  assert.equal(r.stages.networkEmptyAfterRun,true)
  assert.equal(r.gateway,'172.18.0.1')
  for(const key of [
    'agentCanReachModel','privateSubmissionServerReady','officialDatasetPinnedAndStaged',
    'vulnerableBenchmarkExecuted','approvalGranted','independentlyAttested',
    'modelGpuOffloadIndependentlyVerified',
  ]) assert.equal(r[key],false,key)
})

test('unsafe Windows topology blocks all subsequent effects', async () => {
  for(const makeUnsafe of [
    x=>{ x.checks.localModelLoopbackOnly=false },
    x=>{ x.checks.isolatedEmptyNetwork=false },
    x=>{ x.approvalGranted=true },
    x=>{ x.officialSubmissionServerTopologyVerified=true },
  ]) {
    const record=[],topology=validTopology();makeUnsafe(topology)
    await assert.rejects(runOwnerTrustedControllerBenign(
      makeStages(record,topology)),/topology check blocked \(validation_failed\)/)
    assert.deepEqual(record,['topology'])
  }
})

test('local model incorrect identity, provider or response blocks Docker phase', async () => {
  for(const makeUnsafe of [
    x=>{ x.model='paid-fallback' },
    x=>{ x.noToolCompletion='FAIL' },
    x=>{ x.transport='https://example.org' },
    x=>{ x.benchmarkExecuted=true },
    x=>{ x.executableApprovalGranted=true },
  ]) {
    const record=[],m=validModel();makeUnsafe(m)
    await assert.rejects(runOwnerTrustedControllerBenign(
      makeStages(record,validTopology(),m)),/astra_model check blocked \(validation_failed\)/)
    assert.deepEqual(record,['topology','model'])
  }
})

test('benign Docker fixture missing safety control never becomes an official pass', async () => {
  for(const makeUnsafe of [
    x=>{ x.checks.rootFilesystemReadOnly=false },
    x=>{ x.checks.noBoundingCapabilities=false },
    x=>{ x.networkEmptyAfterRun=false },
    x=>{ x.approvalGranted=true },
  ]) {
    const record=[],c=validConfinement();makeUnsafe(c)
    await assert.rejects(runOwnerTrustedControllerBenign(
      makeStages(record,validTopology(),validModel(),c)),/benign_docker check blocked \(validation_failed\)/)
    assert.deepEqual(record,['topology','model','confinement'])
  }
})

test('unexpected missing stage functions refuse any execution', async () => {
  await assert.rejects(runOwnerTrustedControllerBenign({ topology: ()=>validTopology() }),
    /setup check blocked \(missing_stage\)/)
})

test('exceptions in model phase prevent any Docker launch', async () => {
  const record=[]
  const stages=makeStages(record)
  stages.model=async()=>{record.push('model');throw new Error('Local exact-match failed')}
  await assert.rejects(runOwnerTrustedControllerBenign(stages),/astra_model check blocked \(model_unclassified_failure\)/)
  assert.deepEqual(record,['topology','model'])
})

test('untrusted-looking fabricated completed benchmark state is never accepted', async () => {
  const t=validTopology();t.vulnerableBenchmarkExecuted=true
  const record=[]
  await assert.rejects(runOwnerTrustedControllerBenign(makeStages(record,t)),/topology check blocked \(validation_failed\)/)
  assert.deepEqual(record,['topology'])
})

test('known local model failure maps to precise safe reason while preventing Docker', async () => {
  const cases = [
    ['Local Astra generated an invalid or incomplete smoke response', 'model_completion_rejected'],
    ['Pinned native Astra model not advertised by localhost endpoint', 'model_not_advertised'],
    ['Local inference model identity did not match pinned Astra model', 'model_identity_mismatch'],
    ['Local model request timed out', 'model_timeout'],
    ['Local model request failed (no provider fallback attempted)', 'model_transport_failed'],
    ['Local model HTTP status was not 200 (redirects prohibited)', 'model_http_status_rejected'],
    ['Local model response was not valid bounded JSON', 'model_invalid_json'],
    ['Local model response exceeded the 64 KiB cap', 'model_response_oversize'],
  ]
  for (const [message, reason] of cases) {
    const called = []
    const stages = makeStages(called)
    stages.model = async () => { called.push('model'); throw new Error(message) }
    let caught
    try { await runOwnerTrustedControllerBenign(stages) } catch (e) { caught = e }
    assert.ok(caught instanceof BenignControllerStageError)
    assert.equal(caught.stage, 'astra_model')
    assert.equal(caught.reason, reason)
    assert.deepEqual(called, ['topology', 'model'])
    assert.match(sanitizedBenignControllerFailure(caught), /no approval granted/)
  }
})

test('untrusted exception body and model response are never echoed in diagnostics', async () => {
  const token = 'sensitive-local-model-response-with-token'
  const stages = makeStages([])
  stages.model = () => { throw new Error(token) }
  let caught
  try { await runOwnerTrustedControllerBenign(stages) } catch (e) { caught = e }
  const message = sanitizedBenignControllerFailure(caught)
  assert.equal(message, 'CyberGym trusted benign controller BLOCKED: stage=astra_model reason=model_unclassified_failure; no approval granted')
  assert.ok(!message.includes(token))
  assert.ok(!caught.message.includes(token))
  assert.equal(sanitizedBenignControllerFailure(new Error(token)),
    'CyberGym trusted benign controller BLOCKED: stage=setup reason=unclassified_failure; no approval granted')
})

test('Docker exception returns only generic safe stage failure and no model output', async () => {
  const record=[]
  const stages=makeStages(record)
  stages.confinement=async()=>{ record.push('confinement'); throw new Error('private-hostpath-and-docker-details') }
  let caught
  try { await runOwnerTrustedControllerBenign(stages) } catch (e) { caught=e }
  assert.equal(caught.stage,'benign_docker')
  assert.equal(caught.reason,'stage_observation_failed')
  assert.deepEqual(record,['topology','model','confinement'])
  assert.equal(sanitizedBenignControllerFailure(caught),
    'CyberGym trusted benign controller BLOCKED: stage=benign_docker reason=stage_observation_failed; no approval granted')
})


test('typed model acceptance failure is sanitized, specific and stops before Docker', async () => {
  const cases=[
    ['punctuation_after_ready','model_punctuation_after_ready'],
    ['empty_content','model_empty_content'],
    ['non_stop_finish','model_non_stop_finish'],
    ['missing_message','model_missing_message'],
    ['case_mismatch','model_case_mismatch'],
    ['content_mismatch','model_content_mismatch'],
  ]
  for (const [reason,expected] of cases) {
    const called=[]
    const stages=makeStages(called)
    stages.model=async()=>{called.push('model');throw new AstraSmokeCompletionError(reason)}
    let caught
    try { await runOwnerTrustedControllerBenign(stages) } catch(e){caught=e}
    assert.ok(caught instanceof BenignControllerStageError)
    assert.equal(caught.stage,'astra_model')
    assert.equal(caught.reason,expected)
    assert.deepEqual(called,['topology','model'])
    assert.equal(sanitizedBenignControllerFailure(caught),
      'CyberGym trusted benign controller BLOCKED: stage=astra_model reason='+expected+'; no approval granted')
  }
})
