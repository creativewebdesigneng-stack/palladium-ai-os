/**
 * Read-only, owner-initiated Windows topology audit for the CyberGym controller.
 *
 * No containers, downloads, network requests, model inference, web listeners,
 * submission server, credentials, vulnerability execution or approval grants.
 * This is an observation of local Windows namespace + Docker metadata ONLY.
 */
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { isLocalDockerPipeEndpoint, validateObservedCyberGymNetwork } from './cybergym-host-readiness.mjs'

export const CYBERGYM_TOPOLOGY_SCHEMA = 'blackstar.cybergym.controller-topology.v1'
const MAX_MS = 8_000
const LOOPBACK = new Set(['127.0.0.1', '::1'])

function object(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
function listenersValid(value) {
  return Array.isArray(value) && value.length <= 64 && value.every((row) =>
    object(row) && typeof row.LocalAddress === 'string' &&
    row.LocalAddress.length >= 2 && row.LocalAddress.length <= 48 &&
    (row.LocalPort === 11434 || row.LocalPort === 8666)
  )
}
function isLinuxServer(value) {
  return object(value) && value.Os === 'linux' &&
    typeof value.Version === 'string' && /^\d+\.\d+(?:\.\d+)?$/.test(value.Version)
}

/** A valid Windows-only observation never authorizes CyberGym execution. */
export function evaluateCyberGymControllerTopology(observed) {
  if (!object(observed)) throw new Error('Topology observation must be an object')
  const network = validateObservedCyberGymNetwork(observed.network)
  const listeners = observed.listeners
  const validListeners = listenersValid(listeners)
  const modelListeners = validListeners ? listeners.filter((v) => v.LocalPort === 11434) : []
  const serverListeners = validListeners ? listeners.filter((v) => v.LocalPort === 8666) : []
  const checks = {
    windowsHost: observed.platform === 'win32',
    localDockerTransport: observed.dockerOverridesPresent === false &&
      isLocalDockerPipeEndpoint(observed.dockerEndpoint),
    linuxDockerEngine: isLinuxServer(observed.dockerServer),
    isolatedEmptyNetwork: Boolean(network),
    windowsListenerInventoryValid: validListeners,
    localModelLoopbackOnly: validListeners && modelListeners.length >= 1 &&
      modelListeners.every((row) => LOOPBACK.has(row.LocalAddress)),
    noWindowsSubmissionListener: validListeners && serverListeners.length === 0,
    windowsGatewayOwnershipKnown: typeof observed.windowsOwnsGateway === 'boolean',
  }
  const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([key]) => key)
  const source = 'owner-windows-and-docker-metadata-only'
  return {
    schema: CYBERGYM_TOPOLOGY_SCHEMA,
    status: failed.length
      ? 'CONTROLLER_TOPOLOGY_BLOCKED'
      : 'WINDOWS_BOUNDARY_OBSERVED_BENCHMARK_BLOCKED',
    source,
    checks,
    failed,
    networkGateway: network?.gateway ?? null,
    windowsOwnsDockerGateway: typeof observed.windowsOwnsGateway === 'boolean'
      ? observed.windowsOwnsGateway : null,
    localModelPort: 11434,
    submissionPort: 8666,
    visibility: 'windows-listeners-only',
    dockerVmListenerInspectionPerformed: false,
    ubuntuListenerInspectionPerformed: false,
    containerToModelRouteVerified: false,
    officialSubmissionServerTopologyVerified: false,
    activeHostFirewallVerified: false,
    modelInferencePerformed: false,
    vulnerableBenchmarkExecuted: false,
    approvalGranted: false,
    independentlyAttested: false,
  }
}

function command(program, args) {
  try {
    return execFileSync(program, args, {
      encoding: 'utf8', timeout: MAX_MS, maxBuffer: 128 * 1024,
      windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    throw new Error('Read-only local topology query failed')
  }
}
function parseJson(value) {
  try { return JSON.parse(value) }
  catch { throw new Error('Read-only topology query returned invalid JSON') }
}

/** Owner calls this on Windows; no application or benchmark endpoint is opened. */
export function collectLocalCyberGymControllerTopology() {
  if (process.platform !== 'win32') throw new Error('Windows workstation required')
  const dockerOverridesPresent =
    ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']
      .some((key) => Boolean(process.env[key]))
  if (dockerOverridesPresent) throw new Error('Docker endpoint overrides prohibited')
  const dockerEndpoint = parseJson(command('docker', [
    'context','inspect','--format','{{json .Endpoints.docker.Host}}',
  ]))
  if (!isLocalDockerPipeEndpoint(dockerEndpoint)) {
    throw new Error('Only local Docker Windows named-pipe transport is permitted')
  }
  const dockerServer = parseJson(command('docker', [
    'version','--format','{{json .Server}}',
  ]))
  const network = parseJson(command('docker', [
    'network','inspect','cybergym-internal',
  ]))
  const validNetwork = validateObservedCyberGymNetwork(network)
  if (!validNetwork) throw new Error('Expected empty internal non-attachable CyberGym network')
  const windowsScript = '$a=@(Get-NetTCPConnection -State Listen -LocalPort 11434,8666 -ErrorAction SilentlyContinue | ForEach-Object { [PSCustomObject]@{LocalAddress=$_.LocalAddress;LocalPort=$_.LocalPort} }); ConvertTo-Json -InputObject $a -Compress -Depth 3'
  const listeners = parseJson(command('powershell.exe', [
    '-NoProfile','-NonInteractive','-Command',windowsScript,
  ]))
  // Gateway is an already-validated private IPv4 literal (never an arbitrary
  // shell path, hostname or operator expression).
  const gateway = validNetwork.gateway
  const ownerScript = '(Get-NetIPAddress -IPAddress "' + gateway +
    '" -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0'
  const ownerAnswer = command('powershell.exe', [
    '-NoProfile','-NonInteractive','-Command',ownerScript,
  ]).trim()
  if (!['True','False'].includes(ownerAnswer)) {
    throw new Error('Windows gateway ownership could not be determined')
  }
  return evaluateCyberGymControllerTopology({
    platform: process.platform, dockerOverridesPresent, dockerEndpoint,
    dockerServer, network, listeners, windowsOwnsGateway: ownerAnswer === 'True',
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || process.argv[2] !== '--read-only') {
    process.stderr.write('Usage: node scripts/verification/cybergym-controller-topology.mjs --read-only\n')
    process.exitCode = 2
  } else {
    try {
      const result = collectLocalCyberGymControllerTopology()
      process.stdout.write(JSON.stringify(result, null, 2) + '\n')
      if (result.failed.length) process.exitCode = 1
    } catch (error) {
      process.stderr.write('CyberGym controller topology BLOCKED: ' +
        (error instanceof Error ? error.message : 'unknown error') + '\n')
      process.exitCode = 2
    }
  }
}
