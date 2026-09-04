export type ProvenanceActorType = 'human' | 'agent' | 'system'

export interface ProvenanceEventInput {
  id: string
  actorId: string
  actorType: ProvenanceActorType
  action: string
  reason: string
  timestamp: string
  parentIds?: string[]
  evidence?: string[]
  previousHash?: string
}

export interface ProvenanceEvent extends ProvenanceEventInput {
  hash: string
}

function stableHash(input: string): string {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function canonicalize(event: ProvenanceEventInput): string {
  return JSON.stringify({
    id: event.id,
    actorId: event.actorId,
    actorType: event.actorType,
    action: event.action,
    reason: event.reason,
    timestamp: event.timestamp,
    parentIds: [...(event.parentIds ?? [])].sort(),
    evidence: [...(event.evidence ?? [])].sort(),
    previousHash: event.previousHash ?? null,
  })
}

export function createProvenanceEvent(input: ProvenanceEventInput): ProvenanceEvent {
  if (!input.id.trim() || !input.actorId.trim() || !input.action.trim() || !input.reason.trim()) {
    throw new Error('Provenance events require id, actorId, action and reason')
  }
  if (Number.isNaN(Date.parse(input.timestamp))) {
    throw new Error('Provenance event timestamp must be valid ISO-compatible date/time')
  }

  return {
    ...input,
    parentIds: [...new Set(input.parentIds ?? [])].sort(),
    evidence: [...new Set(input.evidence ?? [])].sort(),
    hash: stableHash(canonicalize(input)),
  }
}

export function appendProvenanceEvent(
  chain: ProvenanceEvent[],
  input: Omit<ProvenanceEventInput, 'previousHash'>,
): ProvenanceEvent[] {
  const previousHash = chain.at(-1)?.hash
  const event = createProvenanceEvent({ ...input, ...(previousHash ? { previousHash } : {}) })
  return [...chain, event]
}

export function verifyProvenanceChain(chain: ProvenanceEvent[]): { valid: boolean; brokenAt?: string } {
  for (let index = 0; index < chain.length; index += 1) {
    const event = chain[index]!
    const expectedPrevious = index === 0 ? undefined : chain[index - 1]!.hash
    if (event.previousHash !== expectedPrevious) {
      return { valid: false, brokenAt: event.id }
    }

    const { hash, ...input } = event
    if (createProvenanceEvent(input).hash !== hash) {
      return { valid: false, brokenAt: event.id }
    }
  }
  return { valid: true }
}

export function traceProvenance(chain: ProvenanceEvent[], eventId: string): ProvenanceEvent[] {
  const byId = new Map(chain.map((event) => [event.id, event]))
  const visited = new Set<string>()
  const result: ProvenanceEvent[] = []
  const visit = (id: string) => {
    if (visited.has(id)) return
    visited.add(id)
    const event = byId.get(id)
    if (!event) return
    for (const parentId of event.parentIds ?? []) visit(parentId)
    result.push(event)
  }
  visit(eventId)
  return result
}
