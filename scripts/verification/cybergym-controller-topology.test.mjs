import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CYBERGYM_TOPOLOGY_SCHEMA, evaluateCyberGymControllerTopology,
} from './cybergym-controller-topology.mjs'

function observed() {
  return {
    platform: 'win32',
    dockerOverridesPresent: false,
    dockerEndpoint: 'npipe:////./pipe/dockerDesktopLinuxEngine',
    dockerServer: { Os: 'linux', Version: '29.9.2' },
    network: [{
      Name: 'cybergym-internal', Driver: 'bridge',
      Internal: true, Attachable: false,
      IPAM: { Config: [{ Gateway: '172.18.0.1' }] }, Containers: {},
    }],
    listeners: [{ LocalAddress: '127.0.0.1', LocalPort: 11434 }],
    windowsOwnsGateway: false,
  }
}

test('owner-like local topology observes Windows boundary but NEVER authorizes benchmark', () => {
  const result = evaluateCyberGymControllerTopology(observed())
  assert.equal(result.schema, CYBERGYM_TOPOLOGY_SCHEMA)
  assert.equal(result.status, 'WINDOWS_BOUNDARY_OBSERVED_BENCHMARK_BLOCKED')
  assert.deepEqual(result.failed, [])
  assert.equal(result.networkGateway, '172.18.0.1')
  assert.equal(result.windowsOwnsDockerGateway, false)
  for (const field of [
    'dockerVmListenerInspectionPerformed', 'ubuntuListenerInspectionPerformed',
    'containerToModelRouteVerified', 'officialSubmissionServerTopologyVerified',
    'activeHostFirewallVerified', 'modelInferencePerformed',
    'vulnerableBenchmarkExecuted', 'approvalGranted', 'independentlyAttested',
  ]) assert.equal(result[field], false, field)
})

test('wildcard or LAN-bound Ollama fails closed despite valid Docker metadata', () => {
  for (const host of ['0.0.0.0', '::', '192.168.1.20', '172.18.0.1']) {
    const x = observed()
    x.listeners.push({ LocalAddress: host, LocalPort: 11434 })
    const result = evaluateCyberGymControllerTopology(x)
    assert.equal(result.status, 'CONTROLLER_TOPOLOGY_BLOCKED')
    assert.equal(result.checks.localModelLoopbackOnly, false)
  }
})

test('any Windows CyberGym submission listener remains blocked, including loopback', () => {
  for (const host of ['0.0.0.0', '127.0.0.1', '::1']) {
    const x = observed()
    x.listeners.push({ LocalAddress: host, LocalPort: 8666 })
    assert.equal(evaluateCyberGymControllerTopology(x).checks.noWindowsSubmissionListener, false)
  }
})

test('no model listener and malformed listener metadata both block', () => {
  const empty = observed(); empty.listeners = []
  assert.equal(evaluateCyberGymControllerTopology(empty).checks.localModelLoopbackOnly, false)
  for (const malformed of [null, {}, [{ LocalAddress: '127.0.0.1', LocalPort: 90 }],
    [{ LocalAddress: '127.0.0.1', LocalPort: '11434' }],
    [{ LocalAddress: '127.0.0.1', LocalPort: 11434, Unexpected: 'x' }].map(x => ({...x,LocalAddress: null}))]) {
    const x = observed(); x.listeners = malformed
    assert.equal(evaluateCyberGymControllerTopology(x).status, 'CONTROLLER_TOPOLOGY_BLOCKED')
  }
})

test('remote Docker and overrides block before a trusted local controller can be claimed', () => {
  for (const value of ['tcp://127.0.0.1:2375', 'ssh://remote', 'npipe:////external/pipe/docker']) {
    const x = observed(); x.dockerEndpoint = value
    assert.equal(evaluateCyberGymControllerTopology(x).checks.localDockerTransport, false)
  }
  const x = observed(); x.dockerOverridesPresent = true
  assert.equal(evaluateCyberGymControllerTopology(x).checks.localDockerTransport, false)
})

test('non-Linux Docker or unsafe networks fail closed', () => {
  const x = observed(); x.dockerServer.Os = 'windows'
  assert.equal(evaluateCyberGymControllerTopology(x).checks.linuxDockerEngine, false)
  for (const change of [(n) => { n.Internal = false }, (n) => { n.Attachable = true },
    (n) => { n.Containers = { abc: {} } }, (n) => { n.IPAM.Config[0].Gateway = '8.8.8.8' }]) {
    const y = observed(); change(y.network[0])
    assert.equal(evaluateCyberGymControllerTopology(y).checks.isolatedEmptyNetwork, false)
  }
})

test('unknown gateway ownership is not silently inferred', () => {
  const x = observed(); delete x.windowsOwnsGateway
  const result = evaluateCyberGymControllerTopology(x)
  assert.equal(result.checks.windowsGatewayOwnershipKnown, false)
  assert.equal(result.windowsOwnsDockerGateway, null)
})

test('IPv6 loopback is allowed but still Windows-only evidence', () => {
  const x = observed(); x.listeners.push({ LocalAddress: '::1', LocalPort: 11434 })
  const result = evaluateCyberGymControllerTopology(x)
  assert.equal(result.checks.localModelLoopbackOnly, true)
  assert.equal(result.visibility, 'windows-listeners-only')
  assert.equal(result.containerToModelRouteVerified, false)
})
