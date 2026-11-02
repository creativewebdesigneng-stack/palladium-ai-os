/**
 * Read-only, operator-initiated CyberGym host inventory for Blackstar Astra.
 *
 * Never installs, downloads, runs Docker containers, invokes vulnerable targets,
 * contacts the network, calls a model, or accesses secrets or production state.
 * Output contains ONLY bounded operational readiness facts, no host paths,
 * environment variables, Docker container payloads, device serials or tokens.
 */
import { execFileSync } from 'node:child_process'
import { statfsSync } from 'node:fs'
import { totalmem } from 'node:os'
import { isIP } from 'node:net'
import { pathToFileURL } from 'node:url'

export const CYBERGYM_HOST_READINESS_SCHEMA = 'blackstar.cybergym.host-readiness.v1'
const GiB = 1024 ** 3
const MAX_EXEC_MS = 8_000

function privateV4(value) {
  if (typeof value !== 'string' || isIP(value) !== 4) return false
  const [a, b] = value.split('.').map(Number)
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0
}
export function parseNvidiaGpuCsv(text) {
  if (typeof text !== 'string' || !text.trim()) return null
  const entries = text.trim().split(/\r?\n/).map((line) => {
    const m = /^([^,\r\n]{1,120}),\s*(\d{1,8})\s*$/.exec(line.trim())
    return m ? { name: m[1].trim(), vramMiB: Number(m[2]) } : null
  })
  if (!entries.length || entries.some((e) => !e || !/^NVIDIA\b/i.test(e.name) || !positiveInteger(e.vramMiB))) {
    return null
  }
  // Retain only the largest available NVIDIA VRAM size. Never output a serial.
  return { count: entries.length, maxVramMiB: Math.max(...entries.map((e) => e.vramMiB)) }
}
export function validateObservedCyberGymNetwork(value) {
  if (!Array.isArray(value) || value.length !== 1) return null
  const network = value[0]
  if (!isRecord(network) || network.Name !== 'cybergym-internal' || network.Driver !== 'bridge' ||
      network.Internal !== true || network.Attachable !== false ||
      !isRecord(network.IPAM) || !Array.isArray(network.IPAM.Config) ||
      network.IPAM.Config.length !== 1 ||
      !privateV4(network.IPAM.Config[0]?.Gateway) ||
      !isRecord(network.Containers) || Object.keys(network.Containers).length > 0) {
    return null
  }
  return { internalBridge: true, gateway: network.IPAM.Config[0].Gateway, attachedContainers: 0 }
}
function nodeAtLeast2219(version) {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) return false
  const [major, minor] = version.split('.').map(Number)
  return major > 22 || (major === 22 && minor >= 19)
}
/**
 * Pure evaluator used in CI with explicitly synthetic observations. This is
 * not an attestation and never authorises CyberGym execution.
 */
export function evaluateCyberGymHostReadiness(observed) {
  if (!isRecord(observed)) throw new Error('Host observation must be an object')
  const gpu = parseNvidiaGpuCsv(observed.gpuCsv)
  const network = validateObservedCyberGymNetwork(observed.dockerNetwork)
  const diskFreeBytes = observed.diskFreeBytes
  const ramBytes = observed.ramBytes
  const docker = observed.dockerServer
  const nodeVersion = observed.nodeVersion

  const checks = {
    windowsHost: observed.platform === 'win32',
    nodeVersionSupported: nodeAtLeast2219(nodeVersion),
    dockerEngineResponding: isRecord(docker) && typeof docker.Version === 'string' && /^\d+\.\d+/.test(docker.Version),
    dockerInternalNetworkObserved: Boolean(network),
    nvidiaGpuDetected: Boolean(gpu),
    gpuHasAtLeast8GiBVram: Boolean(gpu && gpu.maxVramMiB >= 8192),
    hostRamAtLeast12GiB: Number.isFinite(ramBytes) && ramBytes >= 12 * GiB,
    scratchDriveAtLeast20GiBFree: Number.isFinite(diskFreeBytes) && diskFreeBytes >= 20 * GiB,
  }
  const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key)
  return {
    schema: CYBERGYM_HOST_READINESS_SCHEMA,
    status: missing.length ? 'HOST_PREREQUISITES_BLOCKED' : 'HOST_PREREQUISITES_OBSERVED_EXECUTION_BLOCKED',
    checks,
    missing,
    hardware: {
      gpuCount: gpu?.count ?? null,
      maxGpuVramMiB: gpu?.maxVramMiB ?? null,
      hostRamGiB: Number.isFinite(ramBytes) && ramBytes >= 0 ? Math.floor(ramBytes / GiB) : null,
      scratchDriveFreeGiB: Number.isFinite(diskFreeBytes) && diskFreeBytes >= 0 ? Math.floor(diskFreeBytes / GiB) : null,
    },
    dockerNetwork: network,
    source: 'operator-local-readonly-diagnostics',
    officialDatasetDownloaded: false,
    fullDatasetStorageCertified: false,
    privateServerListenerVerified: false,
    outboundIsolationEnforced: false,
    modelInferenceVerified: false,
    gpuInferenceVerified: false,
    benchmarkExecuted: false,
    independentlyAttested: false,
    approvalGranted: false,
    nextGates: [
      'operator confirmation of actual device diagnostics and isolated scratch space',
      'independent listener, ingress and container privilege/mount/egress checks',
      'local Astra model inference and GPU utilisation evidence',
      'separate explicit approval before any vulnerable benchmark work',
      'official final-submission scoring and independent provenance verification',
    ],
  }
}
function command(program, args) {
  try {
    return execFileSync(program, args, {
      encoding: 'utf8', timeout: MAX_EXEC_MS, maxBuffer: 128 * 1024,
      windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return null
  }
}
function parseJson(text) {
  if (typeof text !== 'string') return null
  try { return JSON.parse(text) } catch { return null }
}
export function collectLocalCyberGymHostReadiness(storageRoot = 'M:\\') {
  // Only local drive root paths: never accept UNC shares, relative paths,
  // arbitrary file names, path traversal, or remote storage.
  if (typeof storageRoot !== 'string' || !/^[A-Za-z]:\\$/.test(storageRoot)) {
    throw new Error('Storage must be a local Windows drive root, for example M:\\')
  }
  let freeBytes = null
  try {
    const stats = statfsSync(storageRoot)
    if (stats && Number.isFinite(stats.bavail) && Number.isFinite(stats.bsize)) {
      freeBytes = stats.bavail * stats.bsize
    }
  } catch { /* absent drive -> blocked, not fabricated zero */ }
  return evaluateCyberGymHostReadiness({
    platform: process.platform,
    nodeVersion: process.versions.node,
    ramBytes: totalmem(),
    diskFreeBytes: freeBytes,
    gpuCsv: command('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits']),
    dockerServer: parseJson(command('docker', ['version', '--format', '{{json .Server}}'])),
    dockerNetwork: parseJson(command('docker', ['network', 'inspect', 'cybergym-internal'])),
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv[2]
  if (process.argv.length > 3 || (arg && !/^[A-Za-z]:\\$/.test(arg))) {
    process.stderr.write('Usage: node scripts/verification/cybergym-host-readiness.mjs [M:\\]\n')
    process.exitCode = 1
  } else {
    const result = collectLocalCyberGymHostReadiness(arg ?? 'M:\\')
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    if (result.missing.length) process.exitCode = 2
  }
}
