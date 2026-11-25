import { buildAgentMemoryContext, renderGovernedAgentMemoryPrompt } from '@/lib/memory/agent-context-policy'
import { recallMemoryFabric } from '@/lib/memory/memory-fabric.server'
import { loadMemoryPreferences } from '@/lib/memory/preferences.server'

type SupabaseMemoryClient = {
  from: (table: string) => any
  rpc: (functionName: string, args?: Record<string, unknown>) => any
}

/**
 * Recall only the authenticated user's memory through Blackstar Memory Fabric.
 * Preference or retrieval failures fail closed to an empty memory prompt.
 */
export async function loadAstraXMemoryPrompt(args: {
  sb: SupabaseMemoryClient
  userId: string
  query: string
}): Promise<string> {
  const query = args.query.trim().slice(0, 2000)
  if (!query) return ''

  try {
    const preferences = await loadMemoryPreferences(args.sb, args.userId)
    const context = { agentId: null, orgId: null }
    const recalled = await recallMemoryFabric({
      sb: args.sb,
      userId: args.userId,
      query,
      context,
      limit: 8,
      includeDocuments: true,
    })
    const memory = buildAgentMemoryContext({
      recalled,
      pinned: [],
      recent: [],
      context,
      preferences,
    })
    return renderGovernedAgentMemoryPrompt(memory)
  } catch {
    // Memory is optional context. A failed policy or access check must never
    // cause a broader query or an ungoverned fallback to another store.
    return ''
  }
}
