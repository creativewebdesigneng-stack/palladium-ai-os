import { Bot, UserRound } from 'lucide-react'
import { agentIdentityFromPreferences, normaliseAgentIdentity, skinDefinition } from '@/lib/agents/agent-identity'

export default function AgentIdentityAvatar({
  name = 'Agent',
  identity,
  preferences,
  size = 'md',
  showDisclosure = false,
  className = '',
}) {
  const resolved = identity ? normaliseAgentIdentity(identity) : agentIdentityFromPreferences(preferences)
  const skin = skinDefinition(resolved.skin)
  const initial = String(name || 'A').trim().slice(0, 1).toUpperCase() || 'A'
  const dims = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const iconSize = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`relative grid ${dims} shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_14px_36px_rgba(0,0,0,.28)]`}
        style={{ background: `linear-gradient(145deg, ${skin.from}, ${skin.to})` }}
        title={`${name} · AI agent`}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.20),transparent_36%)]" />
        {resolved.avatarStyle === 'monogram' ? (
          <span className="relative z-10 text-sm font-semibold text-white">{initial}</span>
        ) : resolved.avatarStyle === 'synthetic-human' ? (
          <UserRound className={`relative z-10 ${iconSize} text-white/90`} />
        ) : resolved.avatarStyle === 'character' ? (
          <span className="relative z-10 text-base" aria-hidden>✦</span>
        ) : (
          <Bot className={`relative z-10 ${iconSize} text-white/90`} />
        )}
        <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full" style={{ background: skin.accent, boxShadow: `0 0 8px ${skin.accent}` }} />
      </span>
      {showDisclosure && (
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium text-white">{name}</span>
          <span className="block text-[9px] font-semibold uppercase tracking-[.16em] text-zinc-600">AI agent</span>
        </span>
      )}
    </span>
  )
}
