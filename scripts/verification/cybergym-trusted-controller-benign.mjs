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
    Number.isFinite(report.completionLatencyMs) && report.completionLatencyMs >= 0 &&
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
 * These allowlisted diagnostics contain no provider responses, paths, tokens,
 * prompts, stack traces or environment values. The reason is a category,
 * not a copy of an underlying exception.
 */
export class BenignControllerStageError extends Error {
  constructor(stage, reason) {
    super(`${stage} check blocked (${reason}); no execution approval granted`)
    this.name = 'BenignControllerStageError'
    this.stage = stage
    this.reason = reason
  }
}

const MODEL_SAFE_ERROR_CODES = new Map([
  ['Pinned native Astra model not advertised by localhost endpoint', 'model_not_advertised'],
  ['Local inference model identity did not match pinned Astra model', 'model_identity_mismatch'],
  ['Local Astra generated an invalid or incomplete smoke response', 'model_completion_rejected'],
  ['Local model request timed out', 'model_timeout'],
  ['Local model request failed (no provider fallback attempted)', 'model_transport_failed'],
  ['Local model HTTP status was not 200 (redirects prohibited)', 'model_http_status_rejected'],
  ['Local model response was not valid bounded JSON', 'model_invalid_json'],
  ['Local model response exceeded the 64 KiB cap', 'model_response_oversize'],
])

async function guardedStage(stage, callback) {
  try {
    return await callback()
  } catch (error) {
    const reason = stage === 'astra_model' && error instanceof Error
      ? (MODEL_SAFE_ERROR_CODES.get(error.message) ?? 'model_unclassified_failure')
      : 'stage_observation_failed'
    throw new BenignControllerStageError(stage, reason)
  }
}

/** No raw exception text is ever emitted by the user-invoked CLI. */
export function sanitizedBenignControllerFailure(error) {
  const stage = error instanceof BenignControllerStageError ? error.stage : 'setup'
  const reason = error instanceof BenignControllerStageError ? error.reason : 'unclassified_failure'
  // Only this module can produce these constant tokens in normal operation.
  const allowedStage = ['topology', 'astra_model', 'benign_docker', 'setup'].includes(stage)
    ? stage : 'setup'
  const allowedReason = /^[a-z_]{1,48}$/.test(reason) ? reason : 'unclassified_failure'
  return `CyberGym trusted benign controller BLOCKED: stage=${allowedStage} reason=${allowedReason}; no approval granted`
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
    throw new BenignControllerStageError('setup', 'windows_host_required')
  }
  if (!stages || typeof stages.topology !== 'function' ||
      typeof stages.model !== 'function' || typeof stages.confinement !== 'function') {
    throw new BenignControllerStageError('setup', 'missing_stage')
  }
  const topology = await guardedStage('topology', stages.topology)
  if (!topologyPassed(topology)) {
    throw new BenignControllerStageError('topology', 'validation_failed')
  }
  const model = await guardedStage('astra_model', stages.model)
  if (!modelPassed(model)) {
    throw new BenignControllerStageError('astra_model', 'validation_failed')
  }
  const confinement = await guardedStage('benign_docker', stages.confinement)
  if (!confinementPassed(confinement)) {
    throw new BenignControllerStageError('benign_docker', 'validation_failed')
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
      // No raw model response, private reasoning, host path or arbitrary error text.
      process.stderr.write(sanitizedBenignControllerFailure(error) + '\n')
      process.exitCode = 2
    })
  }
}
