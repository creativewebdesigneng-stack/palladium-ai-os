import test from 'node:test'
import assert from 'node:assert/strict'
import { CYBERGYM_EVIDENCE_SCHEMA, CYBERGYM_FULL_TASK_COUNT, summariseCyberGymEvidence } from './cybergym-evidence.mjs'

const fixture = () => ({
  schema: CYBERGYM_EVIDENCE_SCHEMA,
  benchmark: 'cybergym',
  datasetCommit: 'a'.repeat(40),
  harnessCommit: 'b'.repeat(40),
  agent: 'Blackstar Astra (synthetic test only)',
  provider: 'compatible',
  model: 'qwen3:8b-q4_K_M',
  environment: 'isolated-local',
  taskResults: [
    { taskId: 'arvo:47101', outcome: 'reported_solved', vulExitCode: 1, fixExitCode: 0, artifactSha256: 'c'.repeat(64) },
    { taskId: 'oss-fuzz:42535201', outcome: 'reported_unsolved', vulExitCode: 0, fixExitCode: 1 },
    { taskId: 'arvo:3938', outcome: 'blocked', vulExitCode: null, fixExitCode: null },
  ],
})

test('normalises self-reported results without claiming attestation or full-benchmark success', () => {
  const result = summariseCyberGymEvidence(fixture())
  assert.equal(result.trust, 'UNVERIFIED')
  assert.equal(result.independentlyAttested, false)
  assert.equal(result.officialLeaderboardEligible, false)
  assert.deepEqual(result.totals, {
    submitted: 3, inspected: 2, reportedSolved: 1, reportedUnsolved: 1, blocked: 1,
    reportableSubsetFraction: 0.5,
    fullBenchmarkCoverageFraction: 3 / CYBERGYM_FULL_TASK_COUNT,
  })
  assert.equal(result.tasks[0].taskId, 'arvo:3938')
})

test('canonical checksum is independent of task ordering and not an attestation', () => {
  const input = fixture()
  const a = summariseCyberGymEvidence(input)
  input.taskResults.reverse()
  const b = summariseCyberGymEvidence(input)
  assert.equal(a.untrustedReportChecksumSha256, b.untrustedReportChecksumSha256)
  assert.equal(b.trust, 'UNVERIFIED')
})

test('rejects duplicate task IDs', () => {
  const input = fixture()
  input.taskResults.push({ ...input.taskResults[0] })
  assert.throws(() => summariseCyberGymEvidence(input), /Duplicate task ID/)
})

test('rejects forged success with missing exit evidence', () => {
  const input = fixture()
  input.taskResults[0].vulExitCode = null
  assert.throws(() => summariseCyberGymEvidence(input), /both upstream exit codes/)
})

test('rejects blocked cases pretending to have executed', () => {
  const input = fixture()
  input.taskResults[2].fixExitCode = 0
  assert.throws(() => summariseCyberGymEvidence(input), /blocked tasks/)
})

test('rejects external environments and spoofed benchmark names', () => {
  const input = fixture()
  input.environment = 'production'
  assert.throws(() => summariseCyberGymEvidence(input), /isolated-local/)
  input.environment = 'isolated-local'
  input.benchmark = 'cybergym-e2e'
  assert.throws(() => summariseCyberGymEvidence(input), /Unsupported/)
})

test('rejects unknown embedded fields that might contain payloads, secrets or fake attestations', () => {
  const input = fixture()
  input.taskResults[0].poc = 'malicious payload'
  assert.throws(() => summariseCyberGymEvidence(input), /unsupported fields/)
  delete input.taskResults[0].poc
  input.certified = true
  assert.throws(() => summariseCyberGymEvidence(input), /unsupported fields/)
})

test('rejects malformed task IDs, hashes, revisions and scores', () => {
  const input = fixture()
  input.taskResults[0].taskId = 'http://example.org'
  assert.throws(() => summariseCyberGymEvidence(input), /task identifier/)
  input.taskResults[0].taskId = 'arvo:47101'
  input.taskResults[0].artifactSha256 = '../secrets'
  assert.throws(() => summariseCyberGymEvidence(input), /SHA-256/)
  input.taskResults[0].artifactSha256 = 'c'.repeat(64)
  input.datasetCommit = 'main'
  assert.throws(() => summariseCyberGymEvidence(input), /40-character/)
  input.datasetCommit = 'a'.repeat(40)
  input.taskResults[0].vulExitCode = NaN
  assert.throws(() => summariseCyberGymEvidence(input), /integer exit code/)
})

test('returns null subset rate instead of fabricating a zero or success when every task is blocked', () => {
  const input = fixture()
  input.taskResults = [{ taskId: 'arvo:3938', outcome: 'blocked', vulExitCode: null, fixExitCode: null }]
  const output = summariseCyberGymEvidence(input)
  assert.equal(output.totals.reportableSubsetFraction, null)
  assert.equal(output.totals.inspected, 0)
})
