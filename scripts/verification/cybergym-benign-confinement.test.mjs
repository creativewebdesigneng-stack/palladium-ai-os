import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateBenignConfinementOutput, CONFINEMENT_SCHEMA } from './cybergym-benign-confinement.mjs'

const output = ({uid='65534',capEff='0000000000000000',capBnd='0000000000000000',
  nnp='1',seccomp='2',root='ro,relatime',
  v4='172.18.0.0/16 dev eth0 scope link src 172.18.0.2',v6=''}={}) => [
  'CYBERGYM_PROBE_START', 'UID='+uid, 'CapEff:\t'+capEff, 'CapBnd:\t'+capBnd,
  'NoNewPrivs:\t'+nnp, 'Seccomp:\t'+seccomp,
  'ROUTES4_START', v4, 'ROUTES4_END',
  'ROUTES6_START', v6, 'ROUTES6_END',
  'ROOT_FLAGS='+root, 'CYBERGYM_PROBE_END', '',
].join('\n')

test('synthetic positive fixture remains benchmark-blocked and untrusted', () => {
  const r=evaluateBenignConfinementOutput(output())
  assert.equal(r.schema,CONFINEMENT_SCHEMA)
  assert.equal(r.status,'BENIGN_CONFINEMENT_OBSERVED_EXECUTION_BLOCKED')
  assert.deepEqual(r.failed,[])
  for (const key of ['benchmarkExecuted','approvalGranted','independentlyAttested',
    'activeEgressProved','hostAccessProvedBlocked','imageOriginIndependentlyVerified']) {
    assert.equal(r[key],false,key)
  }
})
test('fails closed on elevated UID, capabilities, writable root, no-new-privs or seccomp failure', () => {
  for (const args of [{root:'rw,relatime'},{uid:'0'},{capEff:'0000000000002000'},
    {capBnd:'0000000000000001'},{nnp:'0'},{seccomp:'0'}]) {
    const r=evaluateBenignConfinementOutput(output(args))
    assert.equal(r.status,'BENIGN_CONFINEMENT_BLOCKED')
    assert.ok(r.failed.length>0)
  }
})
test('fails closed on IPv4 and IPv6 default routes or missing IPv4 route', () => {
  for (const args of [{v4:'default via 172.18.0.1 dev eth0'},
    {v6:'default via fe80::1 dev eth0'}, {v4:''}]) {
    assert.equal(evaluateBenignConfinementOutput(output(args)).status,'BENIGN_CONFINEMENT_BLOCKED')
  }
})
test('rejects malformed, duplicate and truncated fixture output', () => {
  for (const bad of [output().replace('CYBERGYM_PROBE_END',''),
    output().replace('CapEff:', 'Other:'),
    output().replace('ROUTES4_END','ROUTES4_FAIL'),
    output().replace('UID=65534','UID=65534\nUID=65534'),
    'x'.repeat(9000)]) {
    assert.throws(()=>evaluateBenignConfinementOutput(bad))
  }
})
