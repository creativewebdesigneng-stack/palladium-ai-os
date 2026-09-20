import { recallMemoryFabric } from './memory-fabric.server';
import { loadMemoryPreferences } from './preferences.server';
import {
  buildAgentMemoryContext,
  renderGovernedAgentMemoryPrompt,
  type AgentContextMemoryRow,
  type AgentMemoryContext,
} from './agent-context-policy';
import type { MemoryFabricContext } from './memory-fabric';

type Sb = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

/**
 * Reuses Blackstar's current memory/knowledge index and preference controls.
 * The three recall paths are individually owner-scoped (pinned, recent) or
 * authority-checked (hybrid search); pure policy filters again before prompt use.
 * No new storage or model inference is introduced.
 */
export async function retrieveGovernedAgentMemory(args: {
  sb: Sb;
  userId: string;
  agentId: string | null;
  orgId?: string | null;
  query: string;
}): Promise<AgentMemoryContext> {
  const context: MemoryFabricContext = { agentId: args.agentId, orgId: args.orgId ?? null };
  const preferences = await loadMemoryPreferences(args.sb, args.userId);
  if (!preferences.short_term_enabled && !preferences.long_term_enabled && !preferences.document_memory_enabled && !preferences.organisation_sharing_enabled) {
    return { shortTerm: [], longTerm: [], organisation: [], documents: [] };
  }

  const readOwn = async (pinned: boolean): Promise<AgentContextMemoryRow[]> => {
    let q = args.sb.from('agent_memories')
      .select('id,title,content,source,memory_type,scope,category,agent_id,org_id,expires_at,pinned')
      .eq('user_id', args.userId);
    if (pinned) q = q.eq('pinned', true);
    else q = q.eq('memory_type', 'short_term');
    const { data, error } = await q.order('updated_at', { ascending: false }).limit(pinned ? 40 : 60);
    if (error) throw new Error('Could not load authorised agent memory.');
    return (data ?? []).map((row: Omit<AgentContextMemoryRow, 'kind'>) => ({ ...row, kind: 'memory' as const }));
  };

  const [recalled, pinned, recent] = await Promise.all([
    recallMemoryFabric({ sb: args.sb, userId: args.userId, query: args.query, context, limit: 25,
      includeDocuments: preferences.document_memory_enabled }),
    preferences.long_term_enabled || preferences.organisation_sharing_enabled ? readOwn(true) : Promise.resolve([]),
    preferences.short_term_enabled ? readOwn(false) : Promise.resolve([]),
  ]);
  return buildAgentMemoryContext({
    recalled: recalled.map((hit) => ({
      id: hit.id,
      content: hit.content,
      title: hit.title ?? null,
      source: hit.source,
      memory_type: hit.memory_type ?? (hit.kind === 'document' ? 'knowledge' : 'long_term'),
      scope: hit.scope ?? 'private',
      agent_id: hit.agent_id,
      org_id: hit.org_id,
      kind: hit.kind,
      document_id: hit.document_id ?? null,
    })),
    pinned,
    recent,
    context,
    preferences,
  });
}

export { renderGovernedAgentMemoryPrompt };
