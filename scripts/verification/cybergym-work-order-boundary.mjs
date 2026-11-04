/**
 * CyberGym work-order boundary on the trusted Windows host.
 *
 * This is NOT a new agent, approval queue or privileged service. It accepts
 * only a tiny, operator-invoked, benign QA work-order contract and invokes the
 * existing restricted host smoke. A request to run the official/vulnerable
 * CyberGym harness is ALWAYS denied here, regardless of supplied metadata.
 *
 * No HTTP listener, TCP socket, Docker privilege delegation, shell/eval,
 * untrusted command, benchmark target or automatic approval is introduced.
 */
import { lstatSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runOwnerTrustedControllerBenign } from './cybergym-trusted-controller-benign.mjs'

export const WORK_ORDER_SCHEMA = 'blackstar.cybergym.work-order.v1'
export const WORK_ORDER_DECISION_SCHEMA = 'blackstar.cybergym.work-order-decision.v1'
export const BENIGN_ACTION = 'benign-trusted-host-smoke'
export const OFFICIAL_ACTION = 'official-benchmark'
const MAX_BYTES = 2_048
const UUID_V4 = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
const ALLOWED_FIELDS = ['schema', 'action', 'requestId']

function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
}

/**
 * This check NEVER recognizes work-order-supplied approval, credentials,
 * Docker options, URLs, commands, targets, model output or tool scopes.
 */
export function evaluateCyberGymWorkOrder(value) {
  if (!isPlainRecord(value) || Object.keys(value).some(key => !ALLOWED_FIELDS.includes(key))) {
    throw new Error('Work order has unsupported fields or type')
  }
  if (value.schema !== WORK_ORDER_SCHEMA || typeof value.requestId !== 'string' ||
      !UUID_V4.test(value.requestId)) {
    throw new Error('Work order schema or identifier rejected')
  }
  if (value.action !== BENIGN_ACTION && value.action !== OFFICIAL_ACTION) {
    throw new Error('Work order action rejected')
  }
  return {
    schema: WORK_ORDER_DECISION_SCHEMA,
    status: value.action === BENIGN_ACTION
      ? 'BENIGN_OPERATOR_ONLY_OFFICIAL_EXECUTION_BLOCKED'
      : 'OFFICIAL_EXECUTION_DENIED',
    action: value.action,
    operatorInvocationRequired: true,
    untrustedInputCanGrantApproval: false,
    arbitraryCommandsAccepted: false,
    arbitraryModelEndpointsAccepted: false,
    dockerOptionsAccepted: false,
    untrustedContainerReceivesDockerApi: false,
    officialEvaluatorConnected: false,
    officialBenchmarkExecutionPermitted: false,
    approvalGranted: false,
    independentlyAttested: false,
  }
}

/**
 * No model, networking or Docker operations when inspecting a request.
 * Reject UNC paths and Windows device paths before touching filesystem.
 */
export function readCyberGymWorkOrderFile(filename) {
  if (typeof filename !== 'string' || filename.length < 5 || filename.length > 1024 ||
      filename.includes('\0') || filename.startsWith('\\\\') || filename.startsWith('//')) {
    throw new Error('Invalid local work-order file path')
  }
  const file = path.resolve(filename)
  if (process.platform === 'win32' && !/^[a-z]:\\/i.test(file)) {
    throw new Error('Only local Windows drive paths are accepted')
  }
  if (path.extname(file).toLowerCase() !== '.json') {
    throw new Error('Only local JSON work orders are accepted')
  }
  const meta = lstatSync(file)
  if (!meta.isFile() || meta.isSymbolicLink() || meta.size < 1 || meta.size > MAX_BYTES) {
    throw new Error('Work order must be a bounded regular non-link file')
  }
  const raw = readFileSync(file)
  if (raw.length > MAX_BYTES) throw new Error('Work order too large')
  // Windows PowerShell 5.1 Set-Content -Encoding UTF8 emits a UTF-8 BOM.
  const decoded = raw.toString('utf8')
  const input = JSON.parse(decoded.charCodeAt(0) === 0xfeff ? decoded.slice(1) : decoded)
  evaluateCyberGymWorkOrder(input)
  return input
}

/**
 * The only executable action in this module is an existing harmless
 * Windows-host QA smoke, after an explicit CLI --run-benign invocation.
 * The call accepts no user-supplied command, model, env, path or Docker args.
 * The runBenign injection is exclusively for synthetic unit tests; the CLI
 * binds to the existing real controller implementation.
 */
export async function runOperatorBenignWorkOrder(value, runBenign = runOwnerTrustedControllerBenign) {
  const decision = evaluateCyberGymWorkOrder(value)
  if (decision.action !== BENIGN_ACTION ||
      decision.status !== 'BENIGN_OPERATOR_ONLY_OFFICIAL_EXECUTION_BLOCKED') {
    throw new Error('Official execution is disabled')
  }
  if (typeof runBenign !== 'function') throw new Error('Benign host implementation missing')
  const result = await runBenign()
  if (result?.schema !== 'blackstar.cybergym.trusted-controller-benign.v1' ||
      result.status !== 'TRUSTED_HOST_BENIGN_SEQUENCE_OBSERVED_BENCHMARK_BLOCKED' ||
      result.stages?.windowsBoundary !== 'PASS' ||
      result.stages?.localAstraNoToolInference !== 'PASS' ||
      result.stages?.benignDockerConfinement !== 'PASS' ||
      result.stages?.networkEmptyAfterRun !== true ||
      result.approvalGranted !== false ||
      result.vulnerableBenchmarkExecuted !== false ||
      result.privateSubmissionServerReady !== false ||
      result.agentCanReachModel !== false ||
      result.independentlyAttested !== false) {
    throw new Error('Existing benign controller did not return accepted bounded evidence')
  }
  return {
    schema: WORK_ORDER_DECISION_SCHEMA,
    status: 'BENIGN_HOST_CHECK_OBSERVED_OFFICIAL_EXECUTION_BLOCKED',
    action: BENIGN_ACTION,
    evidence: {
      windowsBoundary: 'PASS', localAstraNoToolInference: 'PASS',
      benignDockerConfinement: 'PASS', networkEmptyAfterRun: true,
      model: 'qwen3:8b-q4_K_M', modelTransport: '127.0.0.1-only',
    },
    officialBenchmarkExecutionPermitted: false,
    approvalGranted: false, independentlyAttested: false,
    privateSubmissionServerReady: false, agentCanReachModel: false,
  }
}

async function main() {
  if (process.argv.length !== 4 ||
      !['--inspect', '--run-benign'].includes(process.argv[2])) {
    throw new Error('Usage: node scripts/verification/cybergym-work-order-boundary.mjs --inspect|--run-benign <local-work-order.json>')
  }
  const mode = process.argv[2]
  const input = readCyberGymWorkOrderFile(process.argv[3])
  if (mode === '--run-benign' && process.platform !== 'win32') {
    throw new Error('Only an operator on the Windows host may run the benign fixture')
  }
  const result = mode === '--inspect'
    ? evaluateCyberGymWorkOrder(input)
    : await runOperatorBenignWorkOrder(input)
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  if (result.status === 'OFFICIAL_EXECUTION_DENIED') process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    // Never print external input, exception bodies, credentials, paths,
    // prompts, generated content or private host details.
    process.stderr.write('CyberGym work order BLOCKED: invalid, denied or locally failed; official execution not permitted\n')
    process.exitCode = 2
  })
}
