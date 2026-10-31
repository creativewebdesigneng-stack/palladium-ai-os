import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { loadMemoryPreferences } from '@/lib/memory/preferences.server';
import { writeAuditRequired } from '@/lib/platform/audit.server';
import {
  authorisedOrgKnowledgeDocuments,
  buildOrgKnowledgeEvidencePacket,
  type OrgKnowledgeChunk,
  type OrgKnowledgeDocument,
} from './org-knowledge-evidence';

type Sb = { from: (table: string) => any };
const orgSchema = z.object({ orgId: z.string().uuid() }).strict();
const shareSchema = orgSchema.extend({ documentId: z.string().uuid(), shared: z.boolean() }).strict();
const evidenceSchema = orgSchema.extend({
  question: z.string().trim().min(8).max(300),
  documentIds: z.array(z.string().uuid()).min(1).max(3)
    .refine(ids => new Set(ids).size === ids.length, 'Choose distinct documents.'),
}).strict();

async function membership(sb: Sb, userId: string, orgId: string, roles: string[] = ['owner','admin','member']) {
  const { data, error } = await sb.from('organisation_members')
    .select('role').eq('org_id', orgId).eq('user_id', userId).maybeSingle();
  if (error || !data || !roles.includes(data.role)) {
    throw new Error('Organisation knowledge access is not available.');
  }
  return data.role as string;
}

/** Read only explicitly shared, ready, non-agent document labels under live RLS. */
export const listOrgKnowledgeDocuments = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orgSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await membership(sb, context.userId, data.orgId);
    const { data: docs, error } = await sb.from('memory_documents')
      .select('id,title,org_id,agent_id,user_id,status,metadata')
      .eq('org_id', data.orgId).is('agent_id', null).eq('status','ready')
      .contains('metadata', { enterprise_shared: true })
      .order('created_at',{ ascending: false }).limit(50);
    if (error) throw new Error('Could not load authorised organisation knowledge.');
    return {
      documents: (docs ?? []).map((doc: OrgKnowledgeDocument) => ({
        id: doc.id, title: doc.title || 'Untitled document',
        ownedByYou: doc.user_id === context.userId,
      })),
      bounded: true,
    };
  });

/** Owner, while currently an organisation admin, explicitly opts their own
 * organisation document in/out. Documents are never shared on upload. */
export const setOrgKnowledgeSharing = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => shareSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    await membership(sb, context.userId, data.orgId, ['owner','admin']);
    const { data: row, error } = await sb.from('memory_documents')
      .select('id,user_id,org_id,agent_id,status,metadata')
      .eq('id',data.documentId).eq('user_id',context.userId)
      .eq('org_id',data.orgId).is('agent_id',null).eq('status','ready').maybeSingle();
    if (error || !row) throw new Error('Document unavailable for organisation sharing.');
    const meta = row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? row.metadata as Record<string, unknown> : {};
    // Durable intent audit before any write; there is no schema or role bypass.
    await writeAuditRequired({ userId: context.userId, orgId: data.orgId,
      action: 'enterprise_knowledge_share_intent', targetType: 'memory_document',
      targetId: data.documentId, metadata: { shared: data.shared } });
    const { data: changed, error: updateError } = await sb.from('memory_documents')
      .update({ metadata: { ...meta, enterprise_shared: data.shared } })
      .eq('id',data.documentId).eq('user_id',context.userId)
      .eq('org_id',data.orgId).is('agent_id',null).eq('status','ready')
      .select('id').maybeSingle();
    if (updateError || !changed) throw new Error('Organisation sharing could not be changed.');
    // A database trigger records the committed change atomically with this UPDATE.
    return { documentId: data.documentId, shared: data.shared };
  });

/** Evidence-only, no model calls, no secret-bearing logs, no mutations. A live
 * member may inspect only selected explicitly shared documents and matching
 * chunks; Supabase RLS must independently enforce the same access. */
export const previewOrgKnowledgeEvidence = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => evidenceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb;
    const preferences = await loadMemoryPreferences(sb, context.userId);
    if (!preferences.document_memory_enabled || !preferences.organisation_sharing_enabled)
      throw new Error('Enable document and organisation memory preferences before sharing evidence.');

    const role = await membership(sb, context.userId, data.orgId);
    const { data: rows, error } = await sb.from('memory_documents')
      .select('id,user_id,org_id,agent_id,status,title,metadata')
      .eq('org_id',data.orgId).in('id',data.documentIds).limit(3);
    if (error) throw new Error('Organisation document access could not be verified.');
    const authorised = authorisedOrgKnowledgeDocuments({
      requestedIds: data.documentIds,
      rows: (rows ?? []) as OrgKnowledgeDocument[],
      orgId: data.orgId,
      role,
    });

    const { data: chunks, error: chunkError } = await sb.from('memory_chunks')
      .select('id,document_id,user_id,org_id,agent_id,content')
      .eq('org_id',data.orgId).is('agent_id',null)
      .in('document_id',data.documentIds)
      .order('chunk_index',{ascending:true}).limit(120);
    if (chunkError) throw new Error('Authorised organisation evidence is unavailable.');
    const packet = buildOrgKnowledgeEvidencePacket({
      documents: authorised, chunks: (chunks ?? []) as OrgKnowledgeChunk[],
      orgId: data.orgId, question: data.question,
    });

    // No response is released without a durable, redacted audit record.
    // Question text and document extracts are never added to audit metadata.
    await writeAuditRequired({
      userId: context.userId, orgId: data.orgId,
      action: 'enterprise_knowledge_evidence_read', targetType: 'organisation',
      targetId: data.orgId, metadata: {
        selectedDocumentCount: data.documentIds.length,
        returnedExcerptCount: packet.excerpts.length,
      },
    });
    return packet;
  });
