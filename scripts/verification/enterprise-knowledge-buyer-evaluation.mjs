/**
 * Offline, aggregate-only acceptance scoring for Blackstar Knowledge evidence packets.
 * This is a buyer-labelled retrieval evaluation, NOT an access-control test, AI
 * answer accuracy test, security certification or customer sign-off.
 *
 * No network, database, models, credentials or customer data are needed for self-test.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const uuidPattern = new RegExp('^' + UUID + '$', 'i');
const citationPattern = new RegExp('^document:(' + UUID + ')#chunk:(' + UUID + ')$', 'i');
const categories = ['direct', 'ambiguous', 'contradiction', 'no_evidence', 'prompt_injection'];
const maxCases = 200;
const maxExcerpts = 8;
const maxExcerptCharacters = 900;
const ratio = (numerator, denominator) => denominator ? Number((numerator / denominator).toFixed(4)) : null;
const invalid = () => new Error('Evaluation input failed schema validation. Review the offline fixture structure.');

/**
 * Consume existing KnowledgeEvidencePacket results and buyer-owned labels.
 * Inputs are never persisted or echoed. Returned measurements are aggregate only.
 * A listed document is a test-fixture assertion, never proof of live authorisation.
 */
export function evaluateKnowledgeCases(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      input.schemaVersion !== 1 || !Array.isArray(input.cases) ||
      input.cases.length < 1 || input.cases.length > maxCases) throw invalid();

  const counts = {
    cases: input.cases.length, answerableCases: 0, unanswerableCases: 0,
    answerableWithHit: 0, unanswerableCorrectEmpty: 0,
    expectedCitations: 0, returnedCitations: 0, relevantReturnedCitations: 0,
    scopeViolationCount: 0, citationMismatchCount: 0, duplicateCitationCount: 0,
    packetContractViolationCount: 0,
  };
  const byCategory = Object.fromEntries(categories.map(category => [category, { cases: 0, withRelevantHit: 0 }]));

  for (let i = 0; i < input.cases.length; i++) {
    const item = input.cases[i];
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        !categories.includes(item.category) ||
        !Array.isArray(item.allowedDocumentIds) || item.allowedDocumentIds.length < 1 ||
        item.allowedDocumentIds.length > 3 ||
        !item.allowedDocumentIds.every(id => typeof id === 'string' && uuidPattern.test(id)) ||
        !Array.isArray(item.expectedCitations) || item.expectedCitations.length > 50 ||
        !item.expectedCitations.every(c => typeof c === 'string' && citationPattern.test(c)) ||
        !item.observed || typeof item.observed !== 'object' || Array.isArray(item.observed) ||
        !Array.isArray(item.observed.excerpts) || item.observed.excerpts.length > 100) throw invalid();

    const allowed = new Set(item.allowedDocumentIds.map(id => id.toLowerCase()));
    const expected = new Set(item.expectedCitations.map(c => c.toLowerCase()));
    if (allowed.size !== item.allowedDocumentIds.length || expected.size !== item.expectedCitations.length ||
        [...expected].some(c => !allowed.has(citationPattern.exec(c)[1].toLowerCase())) ||
        (item.category === 'no_evidence' && expected.size !== 0)) throw invalid();

    const observed = item.observed;
    const seen = new Set();
    let relevantForCase = 0;
    byCategory[item.category].cases++;
    counts.expectedCitations += expected.size;
    counts.returnedCitations += observed.excerpts.length;
    if (expected.size) counts.answerableCases++;
    else counts.unanswerableCases++;

    if (observed.excerpts.length > maxExcerpts || observed.evidenceOnly !== true ||
        observed.answerGenerated !== false ||
        observed.requestedDocumentCount !== allowed.size ||
        !Number.isInteger(observed.matchedDocumentCount) ||
        !['retrieved_excerpts', 'no_authorised_excerpts'].includes(observed.status) ||
        (observed.excerpts.length === 0) !== (observed.status === 'no_authorised_excerpts')) {
      counts.packetContractViolationCount++;
    }

    const returnedDocuments = new Set();
    for (const excerpt of observed.excerpts) {
      if (!excerpt || typeof excerpt !== 'object' || Array.isArray(excerpt) ||
          typeof excerpt.documentId !== 'string' ||
          typeof excerpt.chunkId !== 'string' ||
          typeof excerpt.citation !== 'string' ||
          typeof excerpt.excerpt !== 'string' ||
          !excerpt.excerpt.trim() || excerpt.excerpt.length > maxExcerptCharacters) {
        counts.packetContractViolationCount++;
        continue;
      }
      const documentId = excerpt.documentId.toLowerCase();
      const chunkId = excerpt.chunkId.toLowerCase();
      const citation = excerpt.citation.toLowerCase();
      returnedDocuments.add(documentId);
      if (!allowed.has(documentId)) counts.scopeViolationCount++;
      const match = citationPattern.exec(citation);
      if (!uuidPattern.test(documentId) || !uuidPattern.test(chunkId) || !match ||
          match[1].toLowerCase() !== documentId || match[2].toLowerCase() !== chunkId) {
        counts.citationMismatchCount++;
        continue;
      }
      if (seen.has(citation)) {
        counts.duplicateCitationCount++;
        continue;
      }
      seen.add(citation);
      if (expected.has(citation)) {
        relevantForCase++;
        counts.relevantReturnedCitations++;
      }
    }
    if (observed.matchedDocumentCount !== returnedDocuments.size) counts.packetContractViolationCount++;
    if (expected.size && relevantForCase) {
      counts.answerableWithHit++;
      byCategory[item.category].withRelevantHit++;
    }
    if (!expected.size && observed.excerpts.length === 0) counts.unanswerableCorrectEmpty++;
  }

  const policyChecksPassed = counts.scopeViolationCount === 0 &&
    counts.citationMismatchCount === 0 && counts.duplicateCitationCount === 0 &&
    counts.packetContractViolationCount === 0;

  return {
    kind: 'offline_buyer_labelled_retrieval_evaluation',
    liveAuthorisationTested: false,
    answerAccuracyTested: false,
    customerAcceptanceCertified: false,
    policyChecksPassed,
    counts,
    metrics: {
      citationPrecision: ratio(counts.relevantReturnedCitations, counts.returnedCitations),
      citationRecall: ratio(counts.relevantReturnedCitations, counts.expectedCitations),
      answerableHitRate: ratio(counts.answerableWithHit, counts.answerableCases),
      noEvidenceCorrectEmptyRate: ratio(counts.unanswerableCorrectEmpty, counts.unanswerableCases),
    },
    byCategory,
    limitation: 'Offline test-fixture labels do not prove real tenant rights, retrieval completeness, generated answer correctness, buyer ROI, security certification or UAT acceptance.',
  };
}

async function selfTest() {
  const a = '00000000-0000-4000-8000-000000000001';
  const b = '00000000-0000-4000-8000-000000000002';
  const c = '00000000-0000-4000-8000-000000000003';
  const citation = (document, chunk) => 'document:' + document + '#chunk:' + chunk;
  const excerpt = (document, chunk, overrides = {}) => ({
    documentId: document, chunkId: chunk, citation: citation(document, chunk),
    excerpt: 'Synthetic approved source', ...overrides,
  });
  const packet = excerpts => ({
    status: excerpts.length ? 'retrieved_excerpts' : 'no_authorised_excerpts',
    evidenceOnly: true, answerGenerated: false, requestedDocumentCount: 1,
    matchedDocumentCount: new Set(excerpts.map(x => x.documentId)).size,
    excerpts,
  });
  const makeCase = (category, expected, returned) => ({
    category, allowedDocumentIds: [a], expectedCitations: expected,
    observed: packet(returned),
  });
  const good = { schemaVersion: 1, cases: [
    makeCase('direct', [citation(a, b)], [excerpt(a, b)]),
    makeCase('no_evidence', [], []),
    makeCase('prompt_injection', [], []),
    makeCase('contradiction', [citation(a, b)], []),
  ] };
  const result = evaluateKnowledgeCases(good);
  assert.equal(result.policyChecksPassed, true);
  assert.equal(result.metrics.citationPrecision, 1);
  assert.equal(result.metrics.citationRecall, 0.5);
  assert.equal(result.metrics.answerableHitRate, 0.5);
  assert.equal(result.metrics.noEvidenceCorrectEmptyRate, 1);
  assert.equal(result.customerAcceptanceCertified, false);
  const badScope = evaluateKnowledgeCases({ schemaVersion: 1, cases: [
    makeCase('direct', [citation(a, b)], [excerpt(c, b)]),
  ] });
  assert.equal(badScope.policyChecksPassed, false);
  assert.equal(badScope.counts.scopeViolationCount, 1);
  const badCitation = evaluateKnowledgeCases({ schemaVersion: 1, cases: [
    makeCase('direct', [citation(a, b)], [excerpt(a, b, { citation: citation(a, c) })]),
  ] });
  assert.equal(badCitation.counts.citationMismatchCount, 1);
  const duplicate = evaluateKnowledgeCases({ schemaVersion: 1, cases: [
    makeCase('direct', [citation(a, b)], [excerpt(a, b), excerpt(a, b)]),
  ] });
  assert.equal(duplicate.counts.duplicateCitationCount, 1);
  const overLimit = evaluateKnowledgeCases({ schemaVersion: 1, cases: [
    makeCase('direct', [citation(a, b)], Array.from({length: 9}, (_, i) => excerpt(a, c, {chunkId: c,
      citation: citation(a, c), excerpt: 'Synthetic ' + i}))),
  ] });
  assert.equal(overLimit.policyChecksPassed, false);
  assert.ok(overLimit.counts.packetContractViolationCount > 0);
  const falsePositive = evaluateKnowledgeCases({schemaVersion:1,cases:[
    makeCase('no_evidence', [], [excerpt(a, b)]),
  ]});
  assert.equal(falsePositive.metrics.noEvidenceCorrectEmptyRate, 0);
  assert.throws(() => evaluateKnowledgeCases({schemaVersion:1,cases:[
    makeCase('no_evidence', [citation(a,b)], []),
  ]}));
  assert.throws(() => evaluateKnowledgeCases({schemaVersion:1,cases:[
    makeCase('direct', [citation(c,b)], []),
  ]}));
  process.stdout.write('Enterprise Knowledge buyer evaluation self-test PASS (synthetic, offline, eight assertions groups; no customer data)\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length === 3 && process.argv[2] === '--self-test') await selfTest();
    else if (process.argv.length === 4 && process.argv[2] === '--input') {
      const input = JSON.parse(await readFile(process.argv[3], 'utf8'));
      const report = evaluateKnowledgeCases(input);
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      if (!report.policyChecksPassed) process.exitCode = 2;
    } else {
      throw invalid();
    }
  } catch {
    // Deliberately never print paths, case identifiers, excerpts, questions or JSON.
    process.stderr.write('Enterprise Knowledge evaluation BLOCKED: invalid fixture or unsafe evaluation input.\n');
    process.exitCode = 1;
  }
}