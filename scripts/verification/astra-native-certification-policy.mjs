// Runs without a package install: Bun's TypeScript loader resolves the existing
// Astra profile and the new pure certificate policy. This is an isolated policy
// smoke test, NOT a substitute for build, dependency audit or full Vitest.
import assert from 'node:assert/strict'
import { hasPinnedAstraCertificationCandidate as qualifies } from '../../src/lib/evals/astra-certification-candidate-policy.ts'
const native = { OPENAI_COMPATIBLE_BASE_URL: 'https://native.example/v1',
  BLACKSTAR_NATIVE_MODEL: 'blackstar-native-candidate' }
const bootstrap = { GROQ_API_KEY: 'fixture-boot-key',
  BLACKSTAR_ASTRA_MODEL: 'qwen/qwen3.8-27b' }
const check = (taskClass, candidateModel, env, expected, name) => {
  assert.equal(qualifies({taskClass, candidateModel, env}), expected, name)
  console.log('PASS:', name)
}
check('reasoning', 'qwen/qwen3.8-27b', bootstrap, false, 'Groq bootstrap cannot certify as a native Astra model')
check('general', 'blackstar-astra-v0.1', { ...native,
  BLACKSTAR_ASTRA_MODEL: 'blackstar-astra-v0.1' }, false, 'engine identity is not trained model weights')
check('general', 'unconfigured', {OPENAI_COMPATIBLE_BASE_URL:'https://native.example/v1'}, false,
  'native endpoint without exact model pin cannot certify')
check('general', 'blackstar-native-candidate', native, true, 'explicit compatible route and native model pin permit an attempt')
check('coding', 'coding-candidate', {...native, BLACKSTAR_ASTRA_CODING_MODEL:'coding-candidate'}, true,
  'task-specific model can qualify on its own pinned endpoint')
check('reasoning', 'coding-candidate', {...native, BLACKSTAR_ASTRA_CODING_MODEL:'coding-candidate'}, false,
  'wrong task specialist cannot substitute for the requested candidate')
console.log('Astra native-route policy: 6 dependency-free checks passed. No model was called.')
