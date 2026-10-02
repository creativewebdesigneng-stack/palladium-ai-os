import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  DEFAULT_AGENT_IDENTITY,
  identityPromptInstruction,
  normaliseAgentIdentity,
} from '../agent-identity'

const agentsFunctions = readFileSync(new URL('../agents.functions.ts', import.meta.url), 'utf8')
const runtime = readFileSync(new URL('../../runtime/runtime.server.ts', import.meta.url), 'utf8')
const builder = readFileSync(new URL('../../../components/agent-builder/ConfigLeft.jsx', import.meta.url), 'utf8')
const preview = readFileSync(new URL('../../../components/agent-builder/LivePreview.jsx', import.meta.url), 'utf8')
const primaryCard = readFileSync(new URL('../../../components/agents/AgentCard.jsx', import.meta.url), 'utf8')
const workforceCard = readFileSync(new URL('../../../components/workforce/AgentCard.jsx', import.meta.url), 'utf8')

describe('Blackstar agent identity and humanisation contract', () => {
  it('normalises identity with an unremovable AI disclosure', () => {
    const identity = normaliseAgentIdentity({
      skin: 'gold-executive',
      avatarStyle: 'synthetic-human',
      presentationStyle: 'warm',
      voiceStyle: 'confident',
      tagline: 'Executive operator',
      humanised: true,
      disclosure: 'human',
    })
    expect(identity.disclosure).toBe('AI agent')
    expect(identity.skin).toBe('gold-executive')
    expect(identity.humanised).toBe(true)
    expect(normaliseAgentIdentity(null)).toEqual(DEFAULT_AGENT_IDENTITY)
  })

  it('stores identity inside existing preferences rather than creating another agent authority model', () => {
    expect(agentsFunctions).toContain("identity: normaliseAgentIdentity")
    expect(agentsFunctions).toContain('preferences,')
    expect(agentsFunctions).toContain('allowed_tools')
    expect(agentsFunctions).not.toContain('identity_allowed_tools')
    expect(agentsFunctions).not.toContain('identity_permissions')
  })

  it('uses identity only as presentation context at runtime', () => {
    const instruction = identityPromptInstruction(normaliseAgentIdentity({
      presentationStyle: 'creative',
      voiceStyle: 'warm',
      humanised: true,
    }))
    expect(instruction).toContain('You are an AI agent')
    expect(instruction).toContain('Never claim to be a human person')
    expect(runtime).toContain('identityPromptInstruction(identity)')
    expect(runtime).toContain('agentIdentityFromPreferences(agent.preferences)')
  })

  it('surfaces identity consistently in builder, live preview and agent/workforce cards', () => {
    expect(builder).toContain("id: 'identity'")
    expect(builder).toContain('Humanised presentation')
    expect(builder).toContain("disclosure: 'AI agent'")
    expect(preview).toContain('AgentIdentityAvatar')
    expect(primaryCard).toContain('AgentIdentityAvatar')
    expect(workforceCard).toContain('AgentIdentityAvatar')
  })

  it('states that identity cannot expand runtime authority', () => {
    expect(builder).toContain('without changing its permissions or runtime authority')
    expect(builder).toContain('never grants new tools, approvals or financial authority')
  })
})
