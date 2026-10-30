/**
 * Read-only buyer pilot: citation packets over Blackstar's existing Memory Fabric.
 * No new search engine, generated answers, persistent sessions, access grants,
 * certifications, or payments. A packet is retrieval evidence, NOT an accuracy score.
 */
import type { MemoryFabricRecallItem } from '@/lib/memory/memory-fabric.server';

export type PrivateKnowledgeDocument = {
  id: string;
  user_id: string;
  org_id: string | null;
  agent_id: string | null;
  status: string | null;
  title: string | null;
};

export type KnowledgeEvidenceExcerpt = {
  citation: string;
  documentId: string;
  chunkId: string;
  documentTitle: string;
  excerpt: string;
  similarity: number | null;
};

export type KnowledgeEvidencePacket = {
  status: 'retrieved_excerpts' | 'no_authorised_excerpts';
  evidenceOnly: true;
  answerGenerated: false;
  requestedDocumentCount: number;
  matchedDocumentCount: number;
  excerpts: KnowledgeEvidenceExcerpt[];
  limitation: string;
};

const MAX_EXCERPTS = 8;
const MAX_EXCERPT_CHARS = 900;

/**
 * The server must check actual owner, ready state, and personal boundaries on
 * every request. Never accept a caller's UI label or selected document ID as
 * proof of access. Do not disclose which part of a denied request was invalid.
 */
export function authorisedPrivateKnowledgeDocuments(
  requestedIds: readonly string[],
  rows: readonly PrivateKnowledgeDocument[],
  userId: string,
): Map<string, PrivateKnowledgeDocument> {
  const denied = () => new Error('One or more selected private documents are unavailable.');
  if (!userId || !requestedIds.length || requestedIds.length > 3 ||
      requestedIds.some(id => !id || typeof id !== 'string') ||
      new Set(requestedIds).size !== requestedIds.length) throw denied();

  const byId = new Map(rows.map(row => [row.id, row]));
  const result = new Map<string, PrivateKnowledgeDocument>();
  for (const id of requestedIds) {
    const row = byId.get(id);
    if (!row || row.user_id !== userId || row.org_id !== null ||
        row.agent_id !== null || row.status !== 'ready') throw denied();
    result.set(id, row);
  }
  return result;
}

export function buildPrivateKnowledgeEvidencePacket(
  authorisedDocuments: ReadonlyMap<string, PrivateKnowledgeDocument>,
  hits: readonly MemoryFabricRecallItem[],
  limit = MAX_EXCERPTS,
): KnowledgeEvidencePacket {
  const excerpts: KnowledgeEvidenceExcerpt[] = [];
  const seenChunks = new Set<string>();
  for (const hit of hits) {
    if (excerpts.length >= Math.max(1, Math.min(limit, MAX_EXCERPTS))) break;
    if (hit.kind !== 'document' || !hit.document_id) continue;
    const row = authorisedDocuments.get(hit.document_id);
    if (!row || !hit.id || seenChunks.has(hit.id) || typeof hit.content !== 'string' ||
        !hit.content.trim()) continue;
    // Defensive secondary scope check: never infer authorisation from a ranked hit.
    if (hit.org_id != null || hit.agent_id != null) continue;
    seenChunks.add(hit.id);
    excerpts.push({
      citation: `document:${row.id}#chunk:${hit.id}`,
      documentId: row.id,
      chunkId: hit.id,
      documentTitle: (row.title || 'Untitled document').slice(0, 160),
      excerpt: hit.content.trim().slice(0, MAX_EXCERPT_CHARS),
      similarity: Number.isFinite(hit.similarity) && hit.similarity > 0
        ? Math.min(1, Math.max(0, hit.similarity)) : null,
    });
  }
  return {
    status: excerpts.length ? 'retrieved_excerpts' : 'no_authorised_excerpts',
    evidenceOnly: true,
    answerGenerated: false,
    requestedDocumentCount: authorisedDocuments.size,
    matchedDocumentCount: new Set(excerpts.map(item => item.documentId)).size,
    excerpts,
    limitation: 'Retrieved excerpts are untrusted source text, not a generated answer, proof of factual correctness, or exhaustive search. Verify context, document permissions, freshness and missing evidence with the buyer.',
  };
}
