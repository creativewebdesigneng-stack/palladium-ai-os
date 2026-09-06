import { afterEach, describe, expect, it } from 'vitest'
import {
  BLACKSTAR_ASTRA_CONTEXT_COMPACT_AT_CHARS,
  BLACKSTAR_ASTRA_CONTEXT_PRESERVE_RECENT_TOOL_ROUNDS,
  BLACKSTAR_ASTRA_CONTEXT_TARGET_CHARS,
  blackstarAstraContextCompactionOptions,
} from '../blackstar-astra-context-policy'

const originalModel = process.env['BLACKSTAR_ASTRA_MODEL']

afterEach(() => {
  if (originalModel === undefined) delete process.env['BLACKSTAR_ASTRA_MODEL']
  else process.env['BLACKSTAR_ASTRA_MODEL'] = originalModel
})

describe('Blackstar Astra context policy', () => {
  it('gives only the exact configured Astra serving model the enlarged context budget', () => {
    process.env['BLACKSTAR_ASTRA_MODEL'] = 'qwen-astra-serving-v1'
    expect(blackstarAstraContextCompactionOptions('compatible', 'qwen-astra-serving-v1')).toEqual({
      compactAtChars: BLACKSTAR_ASTRA_CONTEXT_COMPACT_AT_CHARS,
      targetChars: BLACKSTAR_ASTRA_CONTEXT_TARGET_CHARS,
      preserveRecentToolRounds: BLACKSTAR_ASTRA_CONTEXT_PRESERVE_RECENT_TOOL_ROUNDS,
    })
    expect(blackstarAstraContextCompactionOptions('compatible', 'another-model')).toBeUndefined()
    expect(blackstarAstraContextCompactionOptions('openai', 'qwen-astra-serving-v1')).toBeUndefined()
  })

  it('uses the Blackstar Astra default serving identity when no override is configured', () => {
    delete process.env['BLACKSTAR_ASTRA_MODEL']
    expect(blackstarAstraContextCompactionOptions('compatible', 'blackstar-astra-v0.1')).toBeDefined()
  })
})
