import test from 'node:test'
import assert from 'node:assert/strict'
import { runOwnerTrustedControllerBenign, BENIGN_CONTROLLER_SCHEMA } from './cybergym-trusted-controller-benign.mjs'

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
      makeStages(record,topology)),/Topology check blocked/)
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
      makeStages(record,validTopology(),m)),/Local native model check blocked/)
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
      makeStages(record,validTopology(),validModel(),c)),/confinement or cleanup check blocked/)
    assert.deepEqual(record,['topology','model','confinement'])
  }
})

test('unexpected missing stage functions refuse any execution', async () => {
  await assert.rejects(runOwnerTrustedControllerBenign({ topology: ()=>validTopology() }),
    /Missing fixed controller verification stage/)
})

test('exceptions in model phase prevent any Docker launch', async () => {
  const record=[]
  const stages=makeStages(record)
  stages.model=async()=>{record.push('model');throw new Error('Local exact-match failed')}
  await assert.rejects(runOwnerTrustedControllerBenign(stages),/Local exact-match failed/)
  assert.deepEqual(record,['topology','model'])
})

test('untrusted-looking fabricated completed benchmark state is never accepted', async () => {
  const t=validTopology();t.vulnerableBenchmarkExecuted=true
  const record=[]
  await assert.rejects(runOwnerTrustedControllerBenign(makeStages(record,t)),/Topology check blocked/)
  assert.deepEqual(record,['topology'])
})
