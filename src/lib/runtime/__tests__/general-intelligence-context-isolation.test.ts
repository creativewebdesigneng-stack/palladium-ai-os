import { describe, expect, it } from 'vitest'
import { isolateGeneralIntelligenceCurrentTaskContext } from '../general-intelligence-context-isolation'

describe('General Intelligence current-task context isolation', () => {
  it('keeps the trusted system context and current objective while dropping legacy task replay', () => {
    const isolated = isolateGeneralIntelligenceCurrentTaskContext({
      messages: [
        { role: 'system', content: 'Trusted agent instructions\nRELEVANT MEMORY: verified deployment fact' },
        { role: 'user', content: 'Old unrelated task' },
        { role: 'assistant', content: 'Old unverified answer that must not influence this run' },
        { role: 'user', content: 'Another historical task' },
        { role: 'assistant', content: 'Another historical answer' },
        { role: 'user', content: 'Current objective from prepared context' },
      ],
      input: 'Current objective from authenticated request',
    })

    expect(isolated).toEqual([
      { role: 'system', content: 'Trusted agent instructions\nRELEVANT MEMORY: verified deployment fact' },
      { role: 'user', content: 'Current objective from authenticated request' },
    ])
    expect(JSON.stringify(isolated)).not.toContain('Old unverified answer')
    expect(JSON.stringify(isolated)).not.toContain('Another historical answer')
    expect(JSON.stringify(isolated)).toContain('RELEVANT MEMORY')
  })

  it('creates a bounded empty system slot when prepared context has no system message', () => {
    expect(isolateGeneralIntelligenceCurrentTaskContext({
      messages: [{ role: 'assistant', content: 'legacy output' }],
      input: 'Fresh objective',
    })).toEqual([
      { role: 'system', content: '' },
      { role: 'user', content: 'Fresh objective' },
    ])
  })
})
