import test from 'node:test'
import assert from 'node:assert/strict'
import { CYBERGYM_PREFLIGHT_SCHEMA, CYBERGYM_OFFICIAL_SAMPLE_TASKS, evaluateCyberGymPreflight } from './cybergym-preflight.mjs'

const createConfig = () => ({
  schema: CYBERGYM_PREFLIGHT_SCHEMA,
  datasetCommit: 'a'.repeat(40), harnessCommit: 'b'.repeat(40),
  taskIds: ['arvo:47101'],
  nativeModel: { provider: 'compatible', model: 'qwen3:8b-q4_K_M', baseUrl: 'http://127.0.0.1:11434/v1' },
  network: { name: 'cybergym-internal', serverBindHost: '172.21.0.1', serverPort: 8666, allowPublicIngress: false, allowDirectEgress: false },
  limits: { maxTaskDurationSeconds: 300, maxMemoryMiB: 2048, maxCpus: 2 },
})
const isolatedNetwork = () => [{ Name: 'cybergym-internal', Driver: 'bridge', Internal: true, Attachable: false, IPAM: { Config: [{ Gateway: '172.21.0.1' }] }, Containers: {} }]
const check = (transformConfig, transformNetwork) => {
  const c = createConfig(), n = isolatedNetwork()
  transformConfig?.(c)
  transformNetwork?.(n)
  return evaluateCyberGymPreflight(c, n)
}

test('valid safe plan is explicitly BLOCKED from execution and cannot manufacture approval', () => {
  const result = check()
  assert.equal(result.status, 'PLAN_VALIDATED_EXECUTION_BLOCKED')
  assert.equal(result.benchmarkExecuted, false)
  assert.equal(result.executableApprovalGranted, false)
  assert.equal(result.independentVerification, false)
  assert.equal(result.trust, 'NOT_ATTESTED')
  assert.equal(result.outstandingGates.length, 5)
})
test('source pin must use full commits, not mutable refs', () => {
  assert.throws(() => check(c => { c.datasetCommit = 'main' }), /pinned/)
  assert.throws(() => check(c => { c.harnessCommit = 'latest' }), /pinned/)
})
test('task selection is whitelisted to official sample and at most three unique tasks', () => {
  assert.equal(CYBERGYM_OFFICIAL_SAMPLE_TASKS.length, 10)
  assert.throws(() => check(c => { c.taskIds = ['arvo:47101','arvo:47101'] }), /unique/)
  assert.throws(() => check(c => { c.taskIds = ['arvo:99999'] }), /official/)
  assert.throws(() => check(c => { c.taskIds = CYBERGYM_OFFICIAL_SAMPLE_TASKS.slice(0,4) }), /1–3/)
})
test('refuses public or remote model endpoints and paid/fallback providers', () => {
  for (const u of ['https://temporary.trycloudflare.com/v1','http://192.168.1.8:11434/v1','http://0.0.0.0:11434/v1','http://127.0.0.1:11434/v1?key=abc','http://user:pass@127.0.0.1:11434/v1']) {
    assert.throws(() => check(c => { c.nativeModel.baseUrl = u }), /localhost-only/)
  }
  assert.throws(() => check(c => { c.nativeModel.provider = 'groq' }), /pinned local/)
  assert.throws(() => check(c => { c.nativeModel.model = 'some-other-model' }), /pinned local/)
})
test('rejects wildcard server binds and exposure flags', () => {
  for (const host of ['0.0.0.0','127.0.0.1','8.8.8.8','::','192.0.2.1']) {
    assert.throws(() => check(c => { c.network.serverBindHost = host }), /private Docker-network gateway/)
  }
  assert.throws(() => check(c => { c.network.allowPublicIngress = true }), /deny ingress\/egress/)
  assert.throws(() => check(c => { c.network.allowDirectEgress = true }), /deny ingress\/egress/)
})
test('rejects actual non-isolated or externally attachable Docker networks', () => {
  assert.throws(() => check(null, n => { n[0].Internal = false }), /internal, non-attachable/)
  assert.throws(() => check(null, n => { n[0].Attachable = true }), /internal, non-attachable/)
  assert.throws(() => check(null, n => { n[0].Driver = 'host' }), /internal, non-attachable/)
  assert.throws(() => check(null, n => { n[0].IPAM.Config[0].Gateway = '172.22.0.1' }), /match/)
})
test('rejects populated networks until running containers are independently audited', () => {
  assert.throws(() => check(null, n => { n[0].Containers = { '123': { Name: 'agent' } } }), /empty isolation network/)
})
test('enforces bounded declared duration, memory and CPU', () => {
  assert.throws(() => check(c => { c.limits.maxTaskDurationSeconds = 0 }), /maxTaskDuration/)
  assert.throws(() => check(c => { c.limits.maxMemoryMiB = 16384 }), /maxMemoryMiB/)
  assert.throws(() => check(c => { c.limits.maxCpus = 12 }), /maxCpus/)
})
test('rejects extra configuration fields that could smuggle credentials or approvals', () => {
  assert.throws(() => check(c => { c.operatorApproved = true }), /prohibited fields/)
  assert.throws(() => check(c => { c.nativeModel.apiKey = 'SECRET' }), /prohibited fields/)
  assert.throws(() => check(c => { c.network.publicHost = '127.0.0.1' }), /prohibited fields/)
})
test('fails closed when no real observed Docker network exists', () => {
  assert.throws(() => evaluateCyberGymPreflight(createConfig(),[]), /exactly one observed/)
})
