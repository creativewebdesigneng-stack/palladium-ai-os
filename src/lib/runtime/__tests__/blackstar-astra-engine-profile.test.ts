import { afterEach, describe, expect, it } from 'vitest'
import {
  blackstarAstraModelForTaskClass,
  isBlackstarAstraServingIdentity,
} from '../blackstar-astra-engine-profile'

afterEach(() => {
  delete process.env['BLACKSTAR_ASTRA_MODEL']
  delete process.env['BLACKSTAR_ASTRA_REASONING_MODEL']
  delete process.env['BLACKSTAR_ASTRA_CODING_MODEL']
  delete process.env['BLACKSTAR_ASTRA_AGENTIC_MODEL']
})

describe('Blackstar Astra specialist model profile', () => {
  it('falls back every task class to the base Astra model when specialists are not configured', () => {
    process.env['BLACKSTAR_ASTRA_MODEL'] = 'astra-base-v1'
    expect(blackstarAstraModelForTaskClass('reasoning')).toBe('astra-base-v1')
    expect(blackstarAstraModelForTaskClass('coding')).toBe('astra-base-v1')
    expect(blackstarAstraModelForTaskClass('agentic')).toBe('astra-base-v1')
    expect(blackstarAstraModelForTaskClass('general')).toBe('astra-base-v1')
  })

  it('selects configured reasoning, coding and agentic specialists independently', () => {
    process.env['BLACKSTAR_ASTRA_MODEL'] = 'astra-base-v1'
    process.env['BLACKSTAR_ASTRA_REASONING_MODEL'] = 'astra-reason-v1'
    process.env['BLACKSTAR_ASTRA_CODING_MODEL'] = 'astra-code-v1'
    process.env['BLACKSTAR_ASTRA_AGENTIC_MODEL'] = 'astra-agent-v1'
    expect(blackstarAstraModelForTaskClass('reasoning')).toBe('astra-reason-v1')
    expect(blackstarAstraModelForTaskClass('coding')).toBe('astra-code-v1')
    expect(blackstarAstraModelForTaskClass('tool_use')).toBe('astra-agent-v1')
    expect(blackstarAstraModelForTaskClass('agentic')).toBe('astra-agent-v1')
    expect(blackstarAstraModelForTaskClass('general')).toBe('astra-base-v1')
  })

  it('recognises only currently configured Astra serving identities', () => {
    process.env['BLACKSTAR_ASTRA_MODEL'] = 'astra-base-v1'
    process.env['BLACKSTAR_ASTRA_REASONING_MODEL'] = 'astra-reason-v1'
    expect(isBlackstarAstraServingIdentity('compatible', 'astra-base-v1')).toBe(true)
    expect(isBlackstarAstraServingIdentity('compatible', 'astra-reason-v1')).toBe(true)
    expect(isBlackstarAstraServingIdentity('openai', 'astra-reason-v1')).toBe(false)

    process.env['BLACKSTAR_ASTRA_REASONING_MODEL'] = 'astra-reason-v2'
    expect(isBlackstarAstraServingIdentity('compatible', 'astra-reason-v1')).toBe(false)
    expect(isBlackstarAstraServingIdentity('compatible', 'astra-reason-v2')).toBe(true)
  })
})
