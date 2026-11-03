/**
 * One opt-in, owner-local, benign trusted-controller acceptance sequence.
 *
 * Reuses existing Windows topology, pinned loopback Astra smoke and benign
 * Docker confinement inspectors; never gives a container model or Docker API
 * access. Not a CyberGym official runner, server, PoC engine or approval.
 */
import { pathToFileURL } from 'node:url'
import {
  collectLocalCyberGymControllerTopology,
  CYBERGYM_TOPOLOGY_SCHEMA,
} from './cybergym-controller-topology.mjs'
import {
  probeOwnerLocalAstraNoTool,
  ASTRA_CYBERGYM_SMOKE_SCHEMA,
} from './cybergym-native-smoke.mjs'
import {
  runOwnerBenignConfinement,
  CONFINEMENT_SCHEMA,
} from './cybergym-benign-confinement.mjs'

export const BENIGN_CONTROLLER_SCHEMA = 'blackstar.cybergym.trusted-controller-benign.v1'
const REQUIRED_TOPOLOGY = [
  'windowsHost', 'localDockerTransport', 'linuxDockerEngine',
  'isolatedEmptyNetwork', 'windowsListenerInventoryValid',
  'localModelLoopbackOnly', 'noWindowsSubmissionListener',
  'windowsGatewayOwnershipKnown',
]
const REQUIRED_CONFINEMENT = [
  'nonRootUser', 'noEffectiveCapabilities', 'noBoundingCapabilities',
  'noNewPrivileges', 'seccompFiltered', 'rootFilesystemReadOnly',
  'ipv4NoDefaultRoute', 'ipv6NoDefaultRoute',
]

function allTrue(value, keys) {
  return value !== null && typeof value === 'object' &&
    !Array.isArray(value) && keys.every((key) => value[key] === true)
}
function topologyPassed(report) {
  return report?.schema === CYBERGYM_TOPOLOGY_SCHEMA &&
    report.status === 'WINDOWS_BOUNDARY_OBSERVED_BENCHMARK_BLOCKED' &&
    Array.isArray(report.failed) && report.failed.length === 0 &&
    allTrue(report.checks, REQUIRED_TOPOLOGY) &&
    report.approvalGranted === false && report.vulnerableBenchmarkExecuted === false &&
    report.officialSubmissionServerTopologyVerified === false
}
function modelPassed(report) {
  return report?.schema === ASTRA_CYBERGYM_SMOKE_SCHEMA &&
    report.status === 'LOCAL_MODEL_SMOKE_PASSED_BENCHMARK_BLOCKED' &&
    report.transport === '127.0.0.1-only' &&
    report.model === 'qwen3:8b-q4_K_M' && report.provider === 'compatible' &&
    report.modelsEndpoint === 'PASS' && report.noToolCompletion === 'PASS' &&
    report.benchmarkExecuted === false && report.executableApprovalGranted === false
}
function confinementPassed(report) {
  return report?.schema === CONFINEMENT_SCHEMA &&
    report.status === 'BENIGN_CONFINEMENT_OBSERVED_EXECUTION_BLOCKED' &&
    Array.isArray(report.failed) && report.failed.length === 0 &&
    allTrue(report.checks, REQUIRED_CONFINEMENT) &&
    report.networkEmptyAfterRun === true &&
    report.benchmarkExecuted === false && report.approvalGranted === false
}

/**
 * This sequence runs on the trusted owner host ONLY. Injection exists for
 * synthetic unit tests; the CLI always calls its real fixed implementation.
 *
 * On failure, no later stage is invoked. A successful benign run still
 * explicitly blocks official benchmark execution.
 */
export async function runOwnerTrustedControllerBenign(
  stages = {
    topology: collectLocalCyberGymControllerTopology,
    model: probeOwnerLocalAstraNoTool,
    confinement: runOwnerBenignConfinement,
  },
) {
  if (process.platform !== 'win32' && stages.topology === collectLocalCyberGymControllerTopology) {
    throw new Error('Windows owner host required')
  }
  if (!stages || typeof stages.topology !== 'function' ||
      typeof stages.model !== 'function' || typeof stages.confinement !== 'function') {
    throw new Error('Missing fixed controller verification stage')
  }
  const topology = await stages.topology()
  if (!topologyPassed(topology)) {
    throw new Error('Topology check blocked; model and Docker probes not started')
  }
  const model = await stages.model()
  if (!modelPassed(model)) {
    throw new Error('Local native model check blocked; Docker probe not started')
  }
  const confinement = await stages.confinement()
  if (!confinementPassed(confinement)) {
    throw new Error('Benign container confinement or cleanup check blocked')
  }
  return {
    schema: BENIGN_CONTROLLER_SCHEMA,
    status: 'TRUSTED_HOST_BENIGN_SEQUENCE_OBSERVED_BENCHMARK_BLOCKED',
    source: 'operator-initiated-windows-host',
    stages: {
      windowsBoundary: 'PASS',
      localAstraNoToolInference: 'PASS',
      benignDockerConfinement: 'PASS',
      networkEmptyAfterRun: true,
    },
    model: 'qwen3:8b-q4_K_M',
    modelTransport: '127.0.0.1-only',
    modelCompletionLatencyMs: model.completionLatencyMs,
    network: 'cybergym-internal',
    gateway: topology.networkGateway,
    modelGpuOffloadIndependentlyVerified: false,
    agentCanReachModel: false,
    privateSubmissionServerReady: false,
    officialDatasetPinnedAndStaged: false,
    vulnerableBenchmarkExecuted: false,
    approvalGranted: false,
    independentlyAttested: false,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || process.argv[2] !== '--benign-host-check') {
    process.stderr.write('Usage: node scripts/verification/cybergym-trusted-controller-benign.mjs --benign-host-check\n')
    process.exitCode = 2
  } else {
    runOwnerTrustedControllerBenign().then((result) => {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    }).catch((error) => {
      // Do not dump local HTTP response text, secrets, host paths or PoCs.
      const known = error instanceof Error && /^((Topology check blocked)|(Local native model check blocked)|(Benign container confinement)|(Windows owner host required)|(Missing fixed controller))/.test(error.message)
      process.stderr.write('CyberGym trusted benign controller BLOCKED: ' +
        (known ? error.message : 'local stage failed; no approval granted') + '\n')
      process.exitCode = 2
    })
  }
}
