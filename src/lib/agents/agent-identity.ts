export const AGENT_SKINS = [
  { id: 'violet-core', label: 'Violet Core', from: '#7c3aed', to: '#312e81', accent: '#c4b5fd' },
  { id: 'cyan-sentinel', label: 'Cyan Sentinel', from: '#0891b2', to: '#164e63', accent: '#a5f3fc' },
  { id: 'emerald-operator', label: 'Emerald Operator', from: '#059669', to: '#064e3b', accent: '#a7f3d0' },
  { id: 'gold-executive', label: 'Gold Executive', from: '#b7791f', to: '#3f2d12', accent: '#fde68a' },
  { id: 'rose-creative', label: 'Rose Creative', from: '#db2777', to: '#4a1942', accent: '#fbcfe8' },
  { id: 'obsidian', label: 'Obsidian', from: '#27272a', to: '#09090b', accent: '#d4d4d8' },
] as const

export const AGENT_PRESENTATION_STYLES = [
  { id: 'professional', label: 'Professional', description: 'Polished, measured and businesslike.' },
  { id: 'warm', label: 'Warm', description: 'Friendly, supportive and conversational.' },
  { id: 'direct', label: 'Direct', description: 'Brief, decisive and action-oriented.' },
  { id: 'technical', label: 'Technical', description: 'Precise, analytical and implementation-focused.' },
  { id: 'creative', label: 'Creative', description: 'Expressive, exploratory and idea-rich.' },
  { id: 'coach', label: 'Coach', description: 'Encouraging, structured and progress-focused.' },
] as const

export const AGENT_VOICE_STYLES = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'warm', label: 'Warm' },
  { id: 'calm', label: 'Calm' },
  { id: 'confident', label: 'Confident' },
  { id: 'energetic', label: 'Energetic' },
] as const

export const AGENT_AVATAR_STYLES = [
  { id: 'core', label: 'AI Core' },
  { id: 'monogram', label: 'Monogram' },
  { id: 'synthetic-human', label: 'Synthetic Human' },
  { id: 'character', label: 'Character' },
] as const

const skinIds = new Set(AGENT_SKINS.map((item) => item.id))
const presentationIds = new Set(AGENT_PRESENTATION_STYLES.map((item) => item.id))
const voiceIds = new Set(AGENT_VOICE_STYLES.map((item) => item.id))
const avatarIds = new Set(AGENT_AVATAR_STYLES.map((item) => item.id))

export type AgentIdentity = {
  skin: string
  avatarStyle: string
  presentationStyle: string
  voiceStyle: string
  tagline: string
  humanised: boolean
  disclosure: 'AI agent'
}

export const DEFAULT_AGENT_IDENTITY: AgentIdentity = {
  skin: 'violet-core',
  avatarStyle: 'core',
  presentationStyle: 'professional',
  voiceStyle: 'neutral',
  tagline: '',
  humanised: false,
  disclosure: 'AI agent',
}

function cleanChoice(value: unknown, allowed: Set<string>, fallback: string) {
  const candidate = typeof value === 'string' ? value.trim() : ''
  return allowed.has(candidate) ? candidate : fallback
}

export function normaliseAgentIdentity(value: unknown): AgentIdentity {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
  return {
    skin: cleanChoice(raw['skin'], skinIds, DEFAULT_AGENT_IDENTITY.skin),
    avatarStyle: cleanChoice(raw['avatarStyle'], avatarIds, DEFAULT_AGENT_IDENTITY.avatarStyle),
    presentationStyle: cleanChoice(raw['presentationStyle'], presentationIds, DEFAULT_AGENT_IDENTITY.presentationStyle),
    voiceStyle: cleanChoice(raw['voiceStyle'], voiceIds, DEFAULT_AGENT_IDENTITY.voiceStyle),
    tagline: typeof raw['tagline'] === 'string' ? raw['tagline'].trim().slice(0, 140) : '',
    humanised: raw['humanised'] === true,
    disclosure: 'AI agent',
  }
}

export function agentIdentityFromPreferences(preferences: unknown): AgentIdentity {
  const raw = preferences && typeof preferences === 'object' && !Array.isArray(preferences)
    ? preferences as Record<string, unknown>
    : {}
  return normaliseAgentIdentity(raw['identity'])
}

export function skinDefinition(id: string) {
  return AGENT_SKINS.find((skin) => skin.id === id) ?? AGENT_SKINS[0]
}

export function identityPromptInstruction(identity: AgentIdentity) {
  const presentation = AGENT_PRESENTATION_STYLES.find((item) => item.id === identity.presentationStyle)
  return [
    'AGENT PRESENTATION IDENTITY',
    `Presentation style: ${presentation?.label ?? 'Professional'} — ${presentation?.description ?? ''}`,
    `Voice style preference: ${identity.voiceStyle}`,
    identity.tagline ? `Identity tagline: ${identity.tagline}` : '',
    identity.humanised
      ? 'Humanised presentation is enabled: use natural conversational cadence, warmth and continuity where appropriate, while remaining explicit that you are an AI agent.'
      : 'Humanised presentation is disabled: keep the presentation clearly synthetic and task-focused.',
    'You are an AI agent. Never claim to be a human person, employee, licensed professional, or other real-world identity merely because a humanised skin or voice is selected.',
  ].filter(Boolean).join('\n')
}
