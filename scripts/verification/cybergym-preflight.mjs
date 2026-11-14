/**
 * Read-only CyberGym safety preflight. No model calls, network requests,
 * container creation, benchmark execution or approval grants.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { isIP } from 'node:net'
import { pathToFileURL } from 'node:url'

export const CYBERGYM_PREFLIGHT_SCHEMA = 'blackstar.cybergym.preflight.v1'
export const CYBERGYM_OFFICIAL_SAMPLE_TASKS = Object.freeze([
  'arvo:47101', 'arvo:3938', 'arvo:24993', 'arvo:1065', 'arvo:10400',
  'arvo:368', 'oss-fuzz:42535201', 'oss-fuzz:42535468',
  'oss-fuzz:370689421', 'oss-fuzz:385167047',
])
const ALLOWED_TASKS = new Set(CYBERGYM_OFFICIAL_SAMPLE_TASKS)
const PINNED_SHA = /^[0-9a-f]{40}$/i

function isObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function expectFields(value, allowed, name) {
  if (!isObject(value)) throw new Error(name + ' must be an object')
  const extra = Object.keys(value).filter((key) => !allowed.includes(key))
  if (extra.length) throw new Error(name + ' has prohibited fields: ' + extra.join(', '))
}
function integerBetween(value, low, high, name) {
  if (!Number.isSafeInteger(value) || value < low || value > high) {
    throw new Error(name + ' must be an integer from ' + low + ' to ' + high)
  }
}
function isPrivateIPv4(value) {
  if (isIP(value) !== 4) return false
  const [a, b] = value.split('.').map(Number)
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

/** The plan is only a declaration. Actual runtime enforcement is NOT attested. */
export function validateCyberGymPreflightPlan(config) {
  expectFields(config, ['schema','datasetCommit','harnessCommit','taskIds','nativeModel','network','limits'], 'config')
  if (config.schema !== CYBERGYM_PREFLIGHT_SCHEMA) throw new Error('Unsupported preflight schema')
  if (!PINNED_SHA.test(config.datasetCommit) || !PINNED_SHA.test(config.harnessCommit)) {
    throw new Error('Dataset and harness must be pinned to full 40-character Git commit SHAs')
  }
  if (!Array.isArray(config.taskIds) || config.taskIds.length < 1 || config.taskIds.length > 3) {
    throw new Error('Only 1–3 official sample tasks are permitted in a preflight plan')
  }
  if (config.taskIds.some((id) => !ALLOWED_TASKS.has(id)) || new Set(config.taskIds).size !== config.taskIds.length) {
    throw new Error('Task IDs must be unique members of the official 10-task CyberGym sample')
  }

  expectFields(config.nativeModel, ['provider','model','baseUrl'], 'nativeModel')
  if (config.nativeModel.provider !== 'compatible' || config.nativeModel.model !== 'qwen3:8b-q4_K_M') {
    throw new Error('Only the pinned local Astra compatible model is allowed; no fallbacks')
  }
  if (typeof config.nativeModel.baseUrl !== 'string') throw new Error('Native model URL is required')
  let modelUrl
  try { modelUrl = new URL(config.nativeModel.baseUrl) } catch { throw new Error('Invalid native model URL') }
  if (modelUrl.protocol !== 'http:' || modelUrl.hostname !== '127.0.0.1' ||
      !/^\d{2,5}$/.test(modelUrl.port) || modelUrl.port === '80' ||
      modelUrl.pathname !== '/v1' || modelUrl.search || modelUrl.hash ||
      modelUrl.username || modelUrl.password) {
    throw new Error('Model endpoint must be an explicit localhost-only HTTP /v1 address')
  }

  expectFields(config.network, ['name','serverBindHost','serverPort','allowPublicIngress','allowDirectEgress'], 'network')
  if (config.network.name !== 'cybergym-internal' || config.network.serverPort !== 8666 ||
      config.network.allowPublicIngress !== false || config.network.allowDirectEgress !== false) {
    throw new Error('Network plan must use the isolated CyberGym network, port and deny ingress/egress')
  }
  if (!isPrivateIPv4(config.network.serverBindHost)) {
    throw new Error('Benchmark server must bind to a private Docker-network gateway, never a public or wildcard interface')
  }

  expectFields(config.limits, ['maxTaskDurationSeconds','maxMemoryMiB','maxCpus'], 'limits')
  integerBetween(config.limits.maxTaskDurationSeconds, 30, 900, 'limits.maxTaskDurationSeconds')
  integerBetween(config.limits.maxMemoryMiB, 256, 8192, 'limits.maxMemoryMiB')
  integerBetween(config.limits.maxCpus, 1, 6, 'limits.maxCpus')
  return config
}

/**
 * Compare proposed settings with an observed Docker network. A valid preflight
 * NEVER permits execution; separate operator, firewall and container audits are
 * still mandatory.
 */
export function evaluateCyberGymPreflight(config, networkInspect) {
  validateCyberGymPreflightPlan(config)
  if (!Array.isArray(networkInspect) || networkInspect.length !== 1) {
    throw new Error('Expected exactly one observed Docker network record')
  }
  const network = networkInspect[0]
  if (!isObject(network) || network.Name !== 'cybergym-internal' ||
      network.Driver !== 'bridge' || network.Internal !== true || network.Attachable !== false) {
    throw new Error('Actual Docker network must be an internal, non-attachable bridge')
  }
  if (!Array.isArray(network.IPAM?.Config) || network.IPAM.Config.length !== 1 ||
      network.IPAM.Config[0]?.Gateway !== config.network.serverBindHost) {
    throw new Error('Configured server bind must match the observed isolated Docker network gateway')
  }
  if (Object.keys(network.Containers ?? {}).length !== 0) {
    throw new Error('Preflight requires an empty isolation network; running containers need separate inspection')
  }

  return {
    schema: CYBERGYM_PREFLIGHT_SCHEMA,
    status: 'PLAN_VALIDATED_EXECUTION_BLOCKED',
    trust: 'NOT_ATTESTED',
    executableApprovalGranted: false,
    benchmarkExecuted: false,
    independentVerification: false,
    network: { name: network.Name, gateway: config.network.serverBindHost, internal: true, attachedContainers: 0 },
    nativeModel: { provider: config.nativeModel.provider, model: config.nativeModel.model, endpointClass: 'localhost-only' },
    pinnedSource: { datasetCommit: config.datasetCommit.toLowerCase(), harnessCommit: config.harnessCommit.toLowerCase() },
    taskIds: [...config.taskIds].sort(),
    proposedLimits: { ...config.limits },
    outstandingGates: [
      'operator approval for actual vulnerable benchmark execution',
      'host listener/firewall and inbound reachability independently tested',
      'real container privilege, mount, network, and resource limits verified',
      'local model inference route and output identity verified without paid fallback',
      'official CyberGym scoring evidence independently validated',
    ],
  }
}

function readDockerNetwork() {
  try {
    const raw = execFileSync('docker', ['network', 'inspect', 'cybergym-internal'], {
      encoding: 'utf8', timeout: 8000, maxBuffer: 256 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
    })
    return JSON.parse(raw)
  } catch {
    throw new Error('Docker internal network inspection unavailable; preflight BLOCKED (network may not exist)')
  }
}

function runCLI() {
  const file = process.argv[2]
  if (!file || process.argv.length !== 3) {
    throw new Error('Usage: node scripts/verification/cybergym-preflight.mjs <local-config.json>')
  }
  const stats = statSync(file)
  if (!stats.isFile() || stats.size > 16_384) throw new Error('Config must be a regular JSON file at most 16 KiB')
  const config = JSON.parse(readFileSync(file, 'utf8'))
  validateCyberGymPreflightPlan(config)
  process.stdout.write(JSON.stringify(evaluateCyberGymPreflight(config, readDockerNetwork()), null, 2) + '\n')
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { runCLI() } catch (error) {
    process.stderr.write('CyberGym preflight BLOCKED: ' + (error instanceof Error ? error.message : 'unknown error') + '\n')
    process.exitCode = 1
  }
}
