import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_AGENT_IDENTITY,
  identityPromptInstruction,
  normaliseAgentIdentity,
} from '../agent-identity'

const agents = readFileSync(new URL('../agents.functions.ts', import.meta.url), 'utf8')
const runtime = readFileSync(new URL('../../runtime/runtime.server.ts', import.meta.url), 'utf8')
const builder = readFileSync(new URL('../../../screens/AgentBuilder.jsx', import.meta.url), 'utf8')
const wizard = readFileSync(new URL('../../../screens/AgentWizard.jsx', import.meta.url), 'utf8')
const config = readFileSync(new URL('../../../components/agent-builder/ConfigLeft.jsx', import.meta.url), 'utf8')
const missionBuilder = readFileSync(new URL('../../../components/mission/AgentBuilder.jsx', import.meta.url), 'utf8')
const missionFunctions = readFileSync(new URL('../../mission/mission.functions.ts', import.meta.url), 'utf8')

describe('Blackstar agent identity boundary', () => {
  it('normalises untrusted identity values to the governed catalogue', () => {
    const identity = normaliseAgentIdentity({
      skin: 'not-real',
      avatarStyle: 'synthetic-human',
      presentationStyle: 'warm',
      voiceStyle: 'calm',
      tagline: '  Operations partner  ',
      humanised: true,
      disclosure: 'human employee',
    })
    expect(identity.skin).toBe(DEFAULT_AGENT_IDENTITY.skin)
    expect(identity.avatarStyle).toBe('synthetic-human')
    expect(identity.presentationStyle).toBe('warm')
    expect(identity.voiceStyle).toBe('calm')
    expect(identity.tagline).toBe('Operations partner')
    expect(identity.humanised).toBe(true)
    expect(identity.disclosure).toBe('AI agent')
  })

  it('hard-codes AI disclosure in runtime presentation context', () => {
    const prompt = identityPromptInstruction(normaliseAgentIdentity({ humanised: true }))
    expect(prompt).toContain('You are an AI agent.')
    expect(prompt).toContain('Never claim to be a human person')
    expect(runtime).toContain('identityPromptInstruction(identity)')
  })

  it('stores identity inside existing preferences instead of creating a shadow agent model', () => {
    expect(agents).toContain('identity: normaliseAgentIdentity')
    expect(builder).toContain('identity: config.identity')
    expect(wizard).toContain('identity: d.identity')
    expect(missionBuilder).toContain('identity: form.identity')
    expect(missionFunctions).toContain('normaliseAgentIdentity')
    expect(config).toContain("disclosure: 'AI agent'")
    expect(wizard).toContain("disclosure: 'AI agent'")
    expect(missionBuilder).toContain("disclosure: 'AI agent'")
  })

  it('does not derive tools approvals or autonomy from identity', () => {
    const identitySource = readFileSync(new URL('../agent-identity.ts', import.meta.url), 'utf8')
    expect(identitySource).not.toContain('allowed_tools')
    expect(identitySource).not.toContain('requires_approval')
    expect(identitySource).not.toContain('autonomy')
    expect(identitySource).not.toContain('allowed_providers')
  })
})
