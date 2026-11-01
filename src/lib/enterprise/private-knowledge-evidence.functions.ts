import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { loadMemoryPreferences } from '@/lib/memory/preferences.server';
import { recallMemoryFabric } from '@/lib/memory/memory-fabric.server';
import {
  authorisedPrivateKnowledgeDocuments,
  buildPrivateKnowledgeEvidencePacket,
  type PrivateKnowledgeDocument,
} from './private-knowledge-evidence';

type Sb = { from: (table: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

const requestSchema = z.object({
  question: z.string().trim().min(8).max(300),
  documentIds: z.array(z.string().uuid()).min(1).max(3)
    .refine(ids => new Set(ids).size === ids.length, 'Choose distinct documents.'),
}).strict();

/**
 * A non-writing evidence demonstration for the owner's existing, indexed,
 * personal documents. It intentionally does not grant organisation access:
 * enterprise tenants require separately tested membership/role authority.
 *
 * Never uses a service-role client. No extra connector or AI provider.
 */
export const previewPrivateKnowledgeEvidence = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const preferences = await loadMemoryPreferences(sb, context.userId);
    if (!preferences.document_memory_enabled) {
      throw new Error('Document memory is disabled in your privacy preferences.');
    }

    const { data: rows, error } = await sb.from('memory_documents')
      .select('id,user_id,org_id,agent_id,status,title')
      .eq('user_id', context.userId)
      .in('id', data.documentIds)
      .limit(3);

    if (error) throw new Error('Could not verify selected document permissions.');
    const authorised = authorisedPrivateKnowledgeDocuments(
      data.documentIds,
      (rows ?? []) as PrivateKnowledgeDocument[],
      context.userId,
    );
    // Reuse canonical Memory Fabric, which re-reads document and chunk
    // authority under the caller's Supabase RLS and filters execution scope.
    const hits = await recallMemoryFabric({
      sb,
      userId: context.userId,
      query: data.question,
      context: { agentId: null, orgId: null },
      limit: 25,
      includeDocuments: true,
    });

    return buildPrivateKnowledgeEvidencePacket(authorised, hits, 8);
  });
