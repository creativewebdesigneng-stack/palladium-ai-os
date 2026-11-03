/**
 * Operator-initiated, benign CyberGym confinement probe on the local workstation.
 * No benchmark, vulnerable code, model call, public listener, mounts or published ports.
 * Uses only a cached image (--pull=never) and never grants approval/certification.
 */
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { validateObservedCyberGymNetwork, isLocalDockerPipeEndpoint } from './cybergym-host-readiness.mjs'

export const CONFINEMENT_SCHEMA = 'blackstar.cybergym.benign-confinement.v1'
const PROBE_TIMEOUT_MS = 30_000
const IMAGE = 'busybox:1.37.0'
const PROBE = [
  'set -eu',
  'echo CYBERGYM_PROBE_START',
  "printf 'UID='; id -u",
  "grep -E '^(CapEff|CapBnd|NoNewPrivs|Seccomp):' /proc/self/status",
  'echo ROUTES4_START',
  'ip -4 route',
  'echo ROUTES4_END',
  'echo ROUTES6_START',
  'ip -6 route',
  'echo ROUTES6_END',
  "printf 'ROOT_FLAGS='",
  "awk '$2==\"/\" {print $4; found=1; exit} END {if (!found) exit 3}' /proc/mounts",
  'echo CYBERGYM_PROBE_END',
].join('; ')

function routeBlock(text, begin, end) {
  const first = text.indexOf(begin + '\n')
  const last = text.indexOf('\n' + end)
  if (first === -1 || last < first || text.lastIndexOf(begin + '\n') !== first) {
    throw new Error('Missing or repeated route section')
  }
  return text.slice(first + begin.length + 1, last).trim()
}

/** Parse bounded fixture output; classify observations only, never authorize execution. */
export function evaluateBenignConfinementOutput(stdout) {
  if (typeof stdout !== 'string' || !stdout.startsWith('CYBERGYM_PROBE_START\n') ||
      !stdout.trimEnd().endsWith('CYBERGYM_PROBE_END') || stdout.length > 8192) {
    throw new Error('Incomplete or excessive confinement output')
  }
  const ipv4 = routeBlock(stdout, 'ROUTES4_START', 'ROUTES4_END')
  const ipv6 = routeBlock(stdout, 'ROUTES6_START', 'ROUTES6_END')
  const field = (name) => {
    const matches = [...stdout.matchAll(new RegExp('^' + name + '[:=]\\s*([^\\r\\n]+)$', 'gm'))]
    if (matches.length !== 1) throw new Error('Expected exactly one ' + name + ' observation')
    return matches[0][1].trim()
  }
  const flags = field('ROOT_FLAGS')
  const checks = {
    nonRootUser: field('UID') === '65534',
    noEffectiveCapabilities: field('CapEff') === '0000000000000000',
    noBoundingCapabilities: field('CapBnd') === '0000000000000000',
    noNewPrivileges: field('NoNewPrivs') === '1',
    seccompFiltered: field('Seccomp') === '2',
    rootFilesystemReadOnly: flags.split(',')[0] === 'ro',
    ipv4NoDefaultRoute: Boolean(ipv4) && !/^default(?:\s|$)/m.test(ipv4),
    ipv6NoDefaultRoute: !/^default(?:\s|$)/m.test(ipv6),
  }
  const failed = Object.keys(checks).filter((key) => !checks[key])
  return {
    schema: CONFINEMENT_SCHEMA,
    status: failed.length ? 'BENIGN_CONFINEMENT_BLOCKED' : 'BENIGN_CONFINEMENT_OBSERVED_EXECUTION_BLOCKED',
    checks, failed,
    source: 'local-benign-container-only',
    imageTag: IMAGE,
    imageOriginIndependentlyVerified: false,
    activeEgressProved: false,
    hostAccessProvedBlocked: false,
    benchmarkExecuted: false,
    approvalGranted: false,
    independentlyAttested: false,
  }
}

function docker(args) {
  try {
    return execFileSync('docker', args, {
      encoding: 'utf8', timeout: PROBE_TIMEOUT_MS, maxBuffer: 64 * 1024,
      windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    throw new Error('Local Docker benign probe unavailable or failed; no execution approval granted')
  }
}

/** Runs only after an explicit owner CLI flag on Windows, never in CI. */
export function runOwnerBenignConfinement() {
  if (process.platform !== 'win32' || ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH']
    .some((key) => Boolean(process.env[key]))) {
    throw new Error('Windows host with no Docker endpoint overrides required')
  }
  const endpoint = JSON.parse(docker(['context', 'inspect', '--format', '{{json .Endpoints.docker.Host}}']))
  if (!isLocalDockerPipeEndpoint(endpoint)) throw new Error('Remote Docker endpoints are prohibited')
  const before = JSON.parse(docker(['network', 'inspect', 'cybergym-internal']))
  if (!validateObservedCyberGymNetwork(before)) throw new Error('Empty internal non-attachable bridge is required')
  const imageId = docker(['image', 'inspect', IMAGE, '--format', '{{.Id}}']).trim()
  if (!/^sha256:[0-9a-f]{64}$/.test(imageId)) throw new Error('Cached image is missing or invalid')
  const output = docker(['run', '--rm', '--pull=never',
    '--network', 'cybergym-internal', '--read-only', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges', '--pids-limit', '32',
    '--memory', '64m', '--cpus', '0.5', '--user', '65534:65534',
    imageId, 'sh', '-c', PROBE])
  const result = evaluateBenignConfinementOutput(output)
  const after = JSON.parse(docker(['network', 'inspect', 'cybergym-internal']))
  if (!validateObservedCyberGymNetwork(after)) throw new Error('Post-run network cleanup could not be verified')
  return { ...result, networkEmptyAfterRun: true }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || process.argv[2] !== '--benign-container-check') {
    process.stderr.write('Usage: node scripts/verification/cybergym-benign-confinement.mjs --benign-container-check\n')
    process.exitCode = 2
  } else {
    try {
      const result = runOwnerBenignConfinement()
      process.stdout.write(JSON.stringify(result, null, 2) + '\n')
      if (result.failed.length) process.exitCode = 1
    } catch (error) {
      process.stderr.write('CyberGym benign confinement BLOCKED: ' + error.message + '\n')
      process.exitCode = 2
    }
  }
}
