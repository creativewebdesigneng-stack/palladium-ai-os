import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CYBERGYM_HOST_READINESS_SCHEMA, parseNvidiaGpuCsv, isLocalDockerPipeEndpoint,
  validateObservedCyberGymNetwork, evaluateCyberGymHostReadiness,
  collectLocalCyberGymHostReadiness,
} from './cybergym-host-readiness.mjs'

const GiB = 1024 ** 3
const observed = () => ({
  platform: 'win32',
  nodeVersion: '24.1.0',
  gpuCsv: 'NVIDIA GeForce GTX 1080 Ti, 11264\n',
  ramBytes: 16 * GiB,
  diskFreeBytes: 100 * GiB,
  storageDriveType: 3,
  dockerOverridesPresent: false,
  dockerEndpoint: 'npipe:////./pipe/dockerDesktopLinuxEngine',
  dockerServer: { Version: '28.0.1' },
  dockerNetwork: [{
    Name: 'cybergym-internal', Driver: 'bridge', Internal: true, Attachable: false,
    IPAM: { Config: [{ Gateway: '172.26.0.1' }] }, Containers: {},
  }],
})

test('valid synthetic host observations still block benchmark execution and approval', () => {
  const result = evaluateCyberGymHostReadiness(observed())
  assert.equal(result.schema, CYBERGYM_HOST_READINESS_SCHEMA)
  assert.equal(result.status, 'HOST_PREREQUISITES_OBSERVED_EXECUTION_BLOCKED')
  assert.deepEqual(result.missing, [])
  assert.equal(result.hardware.maxGpuVramMiB, 11264)
  assert.equal(result.hardware.scratchDriveFreeGiB, 100)
  for (const property of [
    'benchmarkExecuted','gpuInferenceVerified','modelInferenceVerified','approvalGranted',
    'independentlyAttested','privateServerListenerVerified','outboundIsolationEnforced',
    'officialDatasetDownloaded','fullDatasetStorageCertified',
  ]) assert.equal(result[property], false, property)
})

test('fails closed on missing GPU and too little video memory', () => {
  const noGpu = observed(); noGpu.gpuCsv = null
  const absent = evaluateCyberGymHostReadiness(noGpu)
  assert.equal(absent.status, 'HOST_PREREQUISITES_BLOCKED')
  assert.equal(absent.checks.nvidiaGpuDetected, false)
  assert.equal(absent.checks.gpuHasAtLeast8GiBVram, false)
  const lowGpu = observed(); lowGpu.gpuCsv = 'NVIDIA GTX 1050, 4096'
  assert.equal(evaluateCyberGymHostReadiness(lowGpu).checks.gpuHasAtLeast8GiBVram, false)
})

test('GPU parser excludes malformed, fake, serial-laden and uncontrolled output', () => {
  for (const csv of ['', 'AMD Radeon, 11264', 'NVIDIA GPU, 11264, serial', 'NVIDIA GPU, -1', 'NVIDIA GPU, 0', '\n']) {
    assert.equal(parseNvidiaGpuCsv(csv), null)
  }
  assert.deepEqual(parseNvidiaGpuCsv('NVIDIA One, 8192\nNVIDIA Two, 11264'), {
    count: 2, maxVramMiB: 11264,
  })
})

test('remote Docker transport or environment overrides block readiness even with a plausible network', () => {
  assert.equal(isLocalDockerPipeEndpoint('npipe:////./pipe/dockerDesktopLinuxEngine'), true)
  for (const target of ['tcp://127.0.0.1:2375','tcp://10.0.0.7:2376',
    'ssh://runner@remote','https://example.com','npipe:////remote/pipe/name',
    'npipe:////./pipe/../../bad', null]) {
    assert.equal(isLocalDockerPipeEndpoint(target), false)
    const x = observed(); x.dockerEndpoint = target
    const r = evaluateCyberGymHostReadiness(x)
    assert.equal(r.status, 'HOST_PREREQUISITES_BLOCKED')
    assert.equal(r.checks.dockerTransportLocal, false)
  }
  const y = observed(); y.dockerOverridesPresent = true
  assert.equal(evaluateCyberGymHostReadiness(y).checks.dockerTransportLocal, false)
})
test('rejects public, wildcard and non-internal Docker networks', () => {
  const invalid = ['0.0.0.0', '127.0.0.1', '8.8.8.8', '169.254.0.1', '172.32.0.1']
  for (const ip of invalid) {
    const x = observed(); x.dockerNetwork[0].IPAM.Config[0].Gateway = ip
    assert.equal(validateObservedCyberGymNetwork(x.dockerNetwork), null)
  }
  const x = observed(); x.dockerNetwork[0].Internal = false
  assert.equal(evaluateCyberGymHostReadiness(x).checks.dockerInternalNetworkObserved, false)
})

test('rejects any currently attached containers until their confinement is audited', () => {
  const x = observed(); x.dockerNetwork[0].Containers = { '123abc': { Name: 'unaudited' } }
  assert.equal(evaluateCyberGymHostReadiness(x).checks.dockerInternalNetworkObserved, false)
})

test('fail closed for unavailable Docker Engine or absent network', () => {
  const x = observed(); x.dockerServer = null; x.dockerNetwork = null
  const result = evaluateCyberGymHostReadiness(x)
  assert.equal(result.status, 'HOST_PREREQUISITES_BLOCKED')
  assert.deepEqual(result.missing.filter((k) => k.startsWith('docker')), ['dockerEngineResponding', 'dockerInternalNetworkObserved'])
})

test('Node version, OS, RAM and free disk thresholds are prerequisites, not official download authorization', () => {
  const x = observed(); x.nodeVersion = '22.18.0'
  x.platform = 'linux'; x.ramBytes = 8 * GiB; x.diskFreeBytes = 10 * GiB
  const result = evaluateCyberGymHostReadiness(x)
  for (const key of ['windowsHost','nodeVersionSupported','hostRamAtLeast12GiB','scratchDriveAtLeast20GiBFree']) {
    assert.equal(result.checks[key], false, key)
  }
  assert.equal(result.fullDatasetStorageCertified, false)
  x.nodeVersion = '22.19.0'
  assert.equal(evaluateCyberGymHostReadiness(x).checks.nodeVersionSupported, true)
})

test('unknown disk space or device resources remain unknown, never fabricated as zero', () => {
  const x = observed(); x.diskFreeBytes = null; x.ramBytes = null
  const result = evaluateCyberGymHostReadiness(x)
  assert.equal(result.hardware.scratchDriveFreeGiB, null)
  assert.equal(result.hardware.hostRamGiB, null)
  assert.equal(result.status, 'HOST_PREREQUISITES_BLOCKED')
})

test('mapped network drives never pass the local scratch check', () => {
  for (const kind of [null, 4, 5, 6]) {
    const x = observed()
    x.storageDriveType = kind
    const result = evaluateCyberGymHostReadiness(x)
    assert.equal(result.checks.scratchDriveLocalOrRemovable, false)
    assert.equal(result.status, 'HOST_PREREQUISITES_BLOCKED')
  }
  const removable = observed(); removable.storageDriveType = 2
  assert.equal(evaluateCyberGymHostReadiness(removable).checks.scratchDriveLocalOrRemovable, true)
})
test('prevents UNC, relative or nested paths from becoming storage/probe inputs', () => {
  for (const path of ['\\\\server\\share\\', '../', 'C:\\Users\\Admin\\secret', '/tmp', 'M:\\..\\', 'M:/']) {
    assert.throws(() => collectLocalCyberGymHostReadiness(path), /local Windows drive root/)
  }
})

test('refuses malformed observed host objects', () => {
  assert.throws(() => evaluateCyberGymHostReadiness(null), /Host observation/)
  assert.throws(() => evaluateCyberGymHostReadiness([]), /Host observation/)
})
