/**
 * Offline CyberGym evidence bridge for Blackstar Astra.
 *
 * Accepts a *local operator report*, not proof of benchmark success. It never
 * invokes a model, runs a PoC, reads artifacts, contacts a host, or writes to
 * Blackstar's live certification/attestation tables.
 *
 * The complete CyberGym harness remains upstream and must run in a separate
 * local isolated environment. See docs/integrations/cybergym-local-benchmark.md.
 */
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const CYBERGYM_FULL_TASK_COUNT = 1507
export const CYBERGYM_EVIDENCE_SCHEMA = 'blackstar.cybergym.offline-report.v1'
const MAX_REPORT_BYTES = 1024 * 1024
const HEX_40 = /^[a-f0-9]{40}$/i
const HEX_64 = /^[a-f0-9]{64}$/i
const TASK_ID = /^(?:arvo|oss-fuzz):[1-9][0-9]{0,11}$/
const RESULTS = new Set(['reported_solved', 'reported_unsolved', 'blocked'])

function record(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} must be an object`)
  }
  return value
}

function onlyKeys(value, allowed, name) {
  const unrecognised = Object.keys(value).filter((key) => !allowed.includes(key))
  if (unrecognised.length) throw new Error(`${name} contains unsupported fields: ${unrecognised.join(', ')}`)
}

function boundedString(value, name, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value)) {
    throw new Error(`${name} must be a non-empty, bounded single-line string`)
  }
  return value.trim()
}

function exitCode(value, name) {
  if (value === null) return null
  if (!Number.isInteger(value) || value < -255 || value > 255) {
    throw new Error(`${name} must be an integer exit code or null`)
  }
  return value
}

/**
 * A checksum of a *self-reported* result file is not an attestation.
 * Neither "reported_solved" nor a local artifact digest is verified by this
 * bridge. Never feed these values into Blackstar's trusted certification gate.
 */
export function summariseCyberGymEvidence(input) {
  const report = record(input, 'report')
  onlyKeys(report, ['schema', 'benchmark', 'datasetCommit', 'harnessCommit', 'agent', 'provider', 'model', 'environment', 'taskResults'], 'report')
  if (report.schema !== CYBERGYM_EVIDENCE_SCHEMA || report.benchmark !== 'cybergym') {
    throw new Error('Unsupported CyberGym report schema or benchmark')
  }
  if (!HEX_40.test(report.datasetCommit) || !HEX_40.test(report.harnessCommit)) {
    throw new Error('Dataset and harness revisions must be full 40-character Git commit SHAs')
  }
  const agent = boundedString(report.agent, 'agent')
  const provider = boundedString(report.provider, 'provider')
  const model = boundedString(report.model, 'model')
  if (report.environment !== 'isolated-local') {
    throw new Error('Only isolated-local CyberGym runs are in scope')
  }
  if (!Array.isArray(report.taskResults) || report.taskResults.length < 1 || report.taskResults.length > CYBERGYM_FULL_TASK_COUNT) {
    throw new Error('taskResults must contain 1–1507 entries')
  }

  const uniqueIds = new Set()
  const tasks = report.taskResults.map((value, index) => {
    const name = `taskResults[${index}]`
    const result = record(value, name)
    onlyKeys(result, ['taskId', 'outcome', 'vulExitCode', 'fixExitCode', 'artifactSha256'], name)
    if (typeof result.taskId !== 'string' || !TASK_ID.test(result.taskId)) {
      throw new Error(`${name}.taskId is not a supported CyberGym task identifier`)
    }
    if (uniqueIds.has(result.taskId)) throw new Error(`Duplicate task ID: ${result.taskId}`)
    uniqueIds.add(result.taskId)
    if (!RESULTS.has(result.outcome)) throw new Error(`${name}.outcome is invalid`)
    const vulExitCode = exitCode(result.vulExitCode, `${name}.vulExitCode`)
    const fixExitCode = exitCode(result.fixExitCode, `${name}.fixExitCode`)
    if (result.outcome === 'reported_solved' && (vulExitCode === null || fixExitCode === null)) {
      throw new Error(`${name} cannot report solved without both upstream exit codes`)
    }
    if (result.outcome === 'blocked' && (vulExitCode !== null || fixExitCode !== null)) {
      throw new Error(`${name} blocked tasks must not include execution results`)
    }
    if (result.artifactSha256 !== null && result.artifactSha256 !== undefined && !HEX_64.test(result.artifactSha256)) {
      throw new Error(`${name}.artifactSha256 must be a SHA-256 digest, null, or omitted`)
    }
    return {
      taskId: result.taskId,
      outcome: result.outcome,
      vulExitCode,
      fixExitCode,
      artifactSha256: result.artifactSha256 ?? null,
    }
  }).sort((a, b) => a.taskId.localeCompare(b.taskId))

  const reportedSolved = tasks.filter((task) => task.outcome === 'reported_solved').length
  const reportedUnsolved = tasks.filter((task) => task.outcome === 'reported_unsolved').length
  const blocked = tasks.filter((task) => task.outcome === 'blocked').length
  const inspected = reportedSolved + reportedUnsolved
  const reportBody = {
    schema: CYBERGYM_EVIDENCE_SCHEMA,
    benchmark: 'cybergym',
    source: 'operator-supplied-offline-report',
    trust: 'UNVERIFIED',
    independentlyAttested: false,
    officialLeaderboardEligible: false,
    candidate: { agent, provider, model },
    environment: report.environment,
    datasetCommit: report.datasetCommit.toLowerCase(),
    harnessCommit: report.harnessCommit.toLowerCase(),
    totals: {
      submitted: tasks.length,
      inspected,
      reportedSolved,
      reportedUnsolved,
      blocked,
      reportableSubsetFraction: inspected === 0 ? null : reportedSolved / inspected,
      fullBenchmarkCoverageFraction: tasks.length / CYBERGYM_FULL_TASK_COUNT,
    },
    tasks,
  }
  // A deterministic checksum for comparing reports, NOT a trusted signature.
  const digest = createHash('sha256').update(JSON.stringify(reportBody)).digest('hex')
  return { ...reportBody, untrustedReportChecksumSha256: digest }
}

async function main() {
  const [, , filePath, ...extra] = process.argv
  if (!filePath || extra.length) {
    throw new Error('Usage: node scripts/verification/cybergym-evidence.mjs <local-report.json>')
  }
  const meta = await stat(filePath)
  if (!meta.isFile() || meta.size > MAX_REPORT_BYTES) throw new Error('Report must be a local regular file of at most 1 MiB')
  const raw = await readFile(filePath, 'utf8')
  if (Buffer.byteLength(raw, 'utf8') > MAX_REPORT_BYTES) throw new Error('Report exceeds 1 MiB')
  const summary = summariseCyberGymEvidence(JSON.parse(raw))
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`CyberGym report rejected: ${error instanceof Error ? error.message : 'unknown error'}\n`)
    process.exitCode = 1
  })
}
