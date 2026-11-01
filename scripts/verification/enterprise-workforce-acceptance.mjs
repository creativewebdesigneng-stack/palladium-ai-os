/**
 * Blackstar Enterprise AI Workforce: offline evidence-consistency gate.
 *
 * Consumes manually normalised, approved test exports from existing personal_agents,
 * agent_tasks, approval_requests and mission_audit_logs. Does NOT query Supabase,
 * claim execution, validate cryptographic authenticity or certify a customer rollout.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const WORKFLOWS = Object.freeze([
  'research_briefing',
  'customer_triage_draft',
  'engineering_qa_draft',
]);
const TRIALS = Object.freeze([
  'approved_execution',
  'rejected_approval',
  'denied_tool',
  'tool_failure',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WHEN = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/;
const LIMIT_EVENTS = 12;

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function isId(value) {
  return typeof value === 'string' && UUID.test(value);
}
function isWhen(value) {
  return typeof value === 'string' && WHEN.test(value) && Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === (value.includes('.') ? new Date(value).toISOString() : value.replace('Z', '.000Z'));
}
function invalid() {
  throw new Error('Invalid or incomplete offline workforce evidence fixture.');
}
const safe = (event, type) => isObject(event) && event.type === type;
const validStatus = (status, allowed) => allowed.includes(status);

function inspectTrial(trial, scenario, globalRunIds) {
  const problems = [];
  const fail = code => problems.push(code);
  if (!isObject(trial) || !TRIALS.includes(trial.case) || !isObject(trial.run) ||
      !Array.isArray(trial.events) || trial.events.length > LIMIT_EVENTS) invalid();
  const run = trial.run;
  if (!isId(run.id) || !isId(run.agentId) || !isId(run.ownerId) ||
      typeof run.status !== 'string' ||
      !validStatus(run.status, ['completed', 'failed', 'cancelled', 'blocked'])) invalid();

  if (globalRunIds.has(run.id.toLowerCase())) fail('reused_run_id');
  globalRunIds.add(run.id.toLowerCase());
  if (run.agentId !== scenario.agentId || run.ownerId !== scenario.ownerId) fail('run_owner_or_agent_mismatch');

  const decisions = trial.events.filter(e => safe(e, 'approval_decision'));
  const executions = trial.events.filter(e => safe(e, 'tool_execution'));
  const audits = trial.events.filter(e => safe(e, 'audit'));
  if (trial.events.some(e => !isObject(e) ||
      !['approval_decision', 'tool_execution', 'audit'].includes(e.type) ||
      !isWhen(e.at) || e.runId !== run.id ||
      e.agentId !== run.agentId || e.ownerId !== run.ownerId)) fail('invalid_event_association');
  if (audits.length !== 1) fail('missing_or_duplicate_audit');
  const audit = audits[0];
  if (audit && !validStatus(audit.status, ['success', 'denied', 'failed'])) fail('invalid_audit_status');
  if (decisions.length > 1 || executions.length > 1) fail('duplicate_decision_or_execution');
  const decision = decisions[0];
  const execution = executions[0];

  if (decision && (!isId(decision.approvalId) ||
      !validStatus(decision.status, ['approved', 'rejected']) ||
      decision.decidedBy !== scenario.ownerId)) fail('invalid_decision');
  if (execution && (!isId(execution.approvalId) ||
      !validStatus(execution.status, ['success', 'failed']) ||
      !scenario.allowedTools.includes(execution.toolName))) fail('unapproved_tool_or_execution_record');
  if (execution && decision && (execution.approvalId !== decision.approvalId ||
      Date.parse(execution.at) <= Date.parse(decision.at))) fail('execution_not_after_matching_approval');
  if (audit) {
    const last = execution || decision;
    if (last && Date.parse(audit.at) < Date.parse(last.at)) fail('audit_predates_action');
  }

  switch (trial.case) {
    case 'approved_execution':
      if (run.status !== 'completed' || decisions.length !== 1 ||
          decision?.status !== 'approved' || executions.length !== 1 ||
          execution?.status !== 'success' || audit?.status !== 'success') fail('approved_path_missing_proof');
      break;
    case 'rejected_approval':
      if (!['failed', 'cancelled', 'blocked'].includes(run.status) ||
          decisions.length !== 1 || decision?.status !== 'rejected' ||
          executions.length !== 0 || audit?.status !== 'denied') fail('rejected_path_not_denied');
      break;
    case 'denied_tool':
      if (!['failed', 'cancelled', 'blocked'].includes(run.status) ||
          executions.length !== 0 || decisions.length !== 0 ||
          audit?.status !== 'denied') fail('unauthorised_tool_path_not_blocked');
      break;
    case 'tool_failure':
      if (run.status !== 'failed' || decisions.length !== 1 ||
          decision?.status !== 'approved' || executions.length !== 1 ||
          execution?.status !== 'failed' || audit?.status !== 'failed') fail('failure_path_missing_proof');
      break;
  }
  return [...new Set(problems)];
}

/** Pure, aggregate-only local consistency test. No claims of runtime verification. */
export function evaluateEnterpriseWorkforceAcceptance(input) {
  if (!isObject(input) || input.schemaVersion !== 1 ||
      !Array.isArray(input.scenarios) || input.scenarios.length !== WORKFLOWS.length) invalid();

  const byWorkflow = {};
  const problemCounts = {};
  const seenScenarios = new Set();
  const runIds = new Set();
  let totalCases = 0, passingCases = 0;

  for (const scenario of input.scenarios) {
    if (!isObject(scenario) || !WORKFLOWS.includes(scenario.id) ||
        seenScenarios.has(scenario.id) || !isId(scenario.agentId) || !isId(scenario.ownerId) ||
        scenario.requiresApproval !== true || !Array.isArray(scenario.allowedTools) ||
        scenario.allowedTools.length < 1 || scenario.allowedTools.length > 12 ||
        !scenario.allowedTools.every(x => typeof x === 'string' && /^[a-z][a-z0-9_]{1,39}$/.test(x)) ||
        new Set(scenario.allowedTools).size !== scenario.allowedTools.length ||
        !Array.isArray(scenario.trials) || scenario.trials.length !== TRIALS.length) invalid();
    seenScenarios.add(scenario.id);
    const seenTrials = new Set();
    let passed = 0;
    for (const trial of scenario.trials) {
      if (!isObject(trial) || seenTrials.has(trial.case)) invalid();
      seenTrials.add(trial.case);
      const findings = inspectTrial(trial, scenario, runIds);
      totalCases++;
      if (!findings.length) { passed++; passingCases++; }
      for (const finding of findings) problemCounts[finding] = (problemCounts[finding] ?? 0) + 1;
    }
    if (TRIALS.some(test => !seenTrials.has(test))) invalid();
    byWorkflow[scenario.id] = { casesChecked: TRIALS.length, casesPassed: passed };
  }
  if (WORKFLOWS.some(id => !seenScenarios.has(id))) invalid();

  return {
    kind: 'offline_workforce_evidence_consistency',
    status: passingCases === totalCases ? 'offline_contract_pass' : 'review_required',
    casesChecked: totalCases,
    casesPassed: passingCases,
    byWorkflow,
    problemCounts,
    liveAgentExecutionTested: false,
    liveApprovalBoundaryTested: false,
    liveAuditPersistenceTested: false,
    customerAcceptanceCertified: false,
    limitation: 'Manually normalised records cannot prove authentic execution, full audit coverage, absence of hidden actions, connector reliability, tenant isolation or buyer UAT. Verify original scoped records and independently run live negative tests.',
  };
}

function syntheticFixture() {
  const id = seed => '00000000-0000-4000-8000-' + seed.toString(16).padStart(12, '0');
  const when = n => new Date(Date.UTC(2026, 9, 30, 12, 0, n)).toISOString();
  const ownerId = id(6000);
  const scenarios = WORKFLOWS.map((name, i) => {
    const agentId = id(100 + i);
    return {
      id: name, agentId, ownerId, requiresApproval: true, allowedTools: ['browser_task', 'document_search'],
      trials: TRIALS.map((kind, j) => {
        const runId = id(1000 + i * 10 + j);
        const approvalId = id(2000 + i * 10 + j);
        const base = { runId, agentId, ownerId };
        const decision = status => ({ ...base, type: 'approval_decision', at: when(1), approvalId, status,
          decidedBy: ownerId });
        const action = status => ({ ...base, type: 'tool_execution', at: when(2), approvalId, status,
          toolName: 'browser_task' });
        const audit = status => ({ ...base, type: 'audit', at: when(3), status });
        const cases = {
          approved_execution: {status:'completed', events:[decision('approved'),action('success'),audit('success')]},
          rejected_approval: {status:'cancelled', events:[decision('rejected'),audit('denied')]},
          denied_tool: {status:'blocked', events:[audit('denied')]},
          tool_failure: {status:'failed', events:[decision('approved'),action('failed'),audit('failed')]},
        };
        return { case: kind, run: { id: runId, agentId, ownerId, status: cases[kind].status },
          events: cases[kind].events };
      }),
    };
  });
  return { schemaVersion: 1, scenarios };
}

function selfTest() {
  const fixture = syntheticFixture();
  const baseline = evaluateEnterpriseWorkforceAcceptance(fixture);
  assert.equal(baseline.status, 'offline_contract_pass');
  assert.equal(baseline.casesChecked, 12);
  assert.equal(baseline.casesPassed, 12);
  assert.equal(baseline.customerAcceptanceCertified, false);
  const test = mutation => {
    const cloned = structuredClone(fixture);
    mutation(cloned);
    return evaluateEnterpriseWorkforceAcceptance(cloned);
  };
  assert.equal(test(x => x.scenarios[0].trials[1].events.splice(1, 0, x.scenarios[0].trials[0].events[1]))
    .status, 'review_required'); // rejected approval never permits an action
  assert.equal(test(x => x.scenarios[0].trials[0].events[1].at =
    x.scenarios[0].trials[0].events[0].at).status, 'review_required');
  assert.equal(test(x => x.scenarios[0].trials[0].events.pop()).status, 'review_required');
  assert.equal(test(x => x.scenarios[0].trials[0].events[1].toolName = 'untrusted_tool')
    .status, 'review_required');
  assert.equal(test(x => x.scenarios[0].trials[3].events[1].status = 'success')
    .status, 'review_required');
  assert.equal(test(x => x.scenarios[0].trials[2].events[0].status = 'success')
    .status, 'review_required');
  assert.equal(test(x => x.scenarios[0].trials[0].run.ownerId = x.scenarios[1].agentId)
    .status, 'review_required');
  assert.throws(() => test(x => x.scenarios[0].trials.pop()));
  assert.throws(() => test(x => x.scenarios[0].requiresApproval = false));
  assert.throws(() => test(x => x.scenarios[0].trials[0].events.push({type:'audit',at:'invalid'})), 
    /offline workforce evidence/);
  process.stdout.write('Enterprise Workforce acceptance self-test PASS (12 synthetic paths and negative controls; no network)\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length === 3 && process.argv[2] === '--self-test') selfTest();
    else if (process.argv.length === 4 && process.argv[2] === '--input') {
      const input = JSON.parse(await readFile(process.argv[3], 'utf8'));
      const report = evaluateEnterpriseWorkforceAcceptance(input);
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      if (report.status !== 'offline_contract_pass') process.exitCode = 2;
    } else invalid();
  } catch {
    // Never echo customer records, filenames, tokens, agent/run IDs or transcripts.
    process.stderr.write('Enterprise Workforce acceptance BLOCKED: invalid or incomplete offline evidence.\n');
    process.exitCode = 1;
  }
}
