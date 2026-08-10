/**
 * Memory API (typed RPC). Every function is authenticated and acts as the
 * caller, so row-level security decides which memories are reachable.
 */
import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import {
  deleteDocument,
  deleteMemory,
  indexMemory,
  ingestDocument,
  MemoryError,
  pruneExpiredMemory,
  retrieveRelevantMemory,
  searchMemory,
  storeMemory,
  updateMemory,
  type MemoryScope,
  type MemoryType,
} from './memory.server';

type Sb = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

function surface(error: unknown): never {
  if (error instanceof MemoryError) throw new Error(error.message);
  console.error('[memory.api]', error);
  throw new Error(error instanceof Error ? error.message : 'The memory service is unavailable.');
}

const asString = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const asId = (v: unknown) => (typeof v === 'string' && v ? v : null);

/** Lists memories the caller can see, newest first, with light filtering. */
export const listMemories = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { memory_type?: string; scope?: string; agent_id?: string; limit?: number } = {}) => input ?? {})
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    let query = sb
      .from('agent_memories')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(Number(data?.limit ?? 200), 1), 500));
    if (data?.memory_type && data.memory_type !== 'all') query = query.eq('memory_type', data.memory_type);
    if (data?.scope && data.scope !== 'all') query = query.eq('scope', data.scope);
    if (data?.agent_id) query = query.eq('agent_id', data.agent_id);

    const [{ data: memories, error }, { data: documents }] = await Promise.all([
      query,
      sb.from('memory_documents').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    if (error) surface(new MemoryError(error.message));
    return { memories: memories ?? [], documents: documents ?? [] };
  });

/** storeMemory */
export const createMemory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, unknown>) => {
    const content = asString(input?.['content']).trim();
    if (!content) throw new Error('Memory content cannot be empty.');
    return {
      content,
      memory_type: asString(input?.['memory_type'], 'long_term') as MemoryType,
      scope: asString(input?.['scope'], 'private') as MemoryScope,
      category: asString(input?.['category'], 'conversation'),
      title: asString(input?.['title']) || null,
      source: asString(input?.['source']) || null,
      importance: asString(input?.['importance'], 'medium') as 'low' | 'medium' | 'high' | 'critical',
      pinned: Boolean(input?.['pinned']),
      agent_id: asId(input?.['agent_id']),
      org_id: asId(input?.['org_id']),
      task_id: asId(input?.['task_id']),
      workflow_id: asId(input?.['workflow_id']),
      file_url: asString(input?.['file_url']) || null,
    };
  })
  .handler(async ({ data, context }) => {
    try {
      return { memory: await storeMemory({ sb: context.supabase as unknown as Sb, userId: context.userId, input: data }) };
    } catch (error) {
      surface(error);
    }
  });

/** updateMemory */
export const editMemory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; patch: Record<string, unknown> }) => {
    if (!input?.id) throw new Error('A memory id is required.');
    return { id: String(input.id), patch: input.patch ?? {} };
  })
  .handler(async ({ data, context }) => {
    try {
      return {
        memory: await updateMemory({
          sb: context.supabase as unknown as Sb,
          userId: context.userId,
          id: data.id,
          patch: data.patch as never,
        }),
      };
    } catch (error) {
      surface(error);
    }
  });

/** deleteMemory */
export const removeMemory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error('A memory id is required.');
    return { id: String(input.id) };
  })
  .handler(async ({ data, context }) => {
    try {
      return await deleteMemory({ sb: context.supabase as unknown as Sb, userId: context.userId, id: data.id });
    } catch (error) {
      surface(error);
    }
  });

/** searchMemory — semantic search with keyword fallback. */
export const searchMemories = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; limit?: number; agent_id?: string; types?: string[] }) => ({
    query: asString(input?.query),
    limit: Number(input?.limit ?? 8),
    agent_id: asId(input?.agent_id),
    types: Array.isArray(input?.types) ? (input.types as MemoryType[]) : null,
  }))
  .handler(async ({ data, context }) => {
    try {
      const results = await searchMemory({
        sb: context.supabase as unknown as Sb,
        userId: context.userId,
        query: data.query,
        limit: data.limit,
        agentId: data.agent_id,
        types: data.types,
      });
      return { results };
    } catch (error) {
      surface(error);
    }
  });

/** retrieveRelevantMemory — the exact block the runtime injects before execution. */
export const previewAgentMemory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string; agent_id?: string }) => ({
    query: asString(input?.query),
    agent_id: asId(input?.agent_id),
  }))
  .handler(async ({ data, context }) => {
    try {
      return await retrieveRelevantMemory({
        sb: context.supabase as unknown as Sb,
        userId: context.userId,
        agentId: data.agent_id,
        query: data.query,
      });
    } catch (error) {
      surface(error);
    }
  });

/** Re-embeds a memory into the active (or requested) vector store. */
export const reindexMemory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; provider?: string }) => ({
    id: String(input?.id ?? ''),
    provider: asString(input?.provider) || null,
  }))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const { data: memory } = await sb.from('agent_memories').select('*').eq('id', data.id).maybeSingle();
    if (!memory) surface(new MemoryError('Memory not found, or you do not have access to it.'));
    try {
      const updated = await indexMemory({ sb, userId: context.userId, memory, provider: data.provider });
      return { status: 'indexed', memory: updated, message: `Indexed with ${updated.vector_provider ?? 'supabase'}.` };
    } catch (error) {
      surface(error);
    }
  });

/** Document memory: register + chunk + embed uploaded text. */
export const ingestKnowledgeDocument = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, unknown>) => {
    const text = asString(input?.['text']);
    if (!text.trim()) throw new Error('The document has no readable text.');
    return {
      title: asString(input?.['title'], 'Untitled document'),
      text,
      org_id: asId(input?.['org_id']),
      agent_id: asId(input?.['agent_id']),
      storage_path: asString(input?.['storage_path']) || null,
      mime_type: asString(input?.['mime_type']) || null,
      size_bytes: Number(input?.['size_bytes'] ?? 0) || null,
      source: asString(input?.['source']) || null,
      scope: (asString(input?.['scope'], 'private') as MemoryScope),
    };
  })
  .handler(async ({ data, context }) => {
    try {
      return await ingestDocument({ sb: context.supabase as unknown as Sb, userId: context.userId, input: data });
    } catch (error) {
      surface(error);
    }
  });

export const removeKnowledgeDocument = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { document_id: string }) => ({ document_id: String(input?.document_id ?? '') }))
  .handler(async ({ data, context }) => {
    try {
      return await deleteDocument({
        sb: context.supabase as unknown as Sb,
        userId: context.userId,
        documentId: data.document_id,
      });
    } catch (error) {
      surface(error);
    }
  });

/** Clears the caller's expired short-term memory. */
export const pruneMemory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      return await pruneExpiredMemory(context.supabase as unknown as Sb);
    } catch (error) {
      surface(error);
    }
  });
