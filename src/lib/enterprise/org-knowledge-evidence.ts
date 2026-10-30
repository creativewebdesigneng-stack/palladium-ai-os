import { rankHybridMemoryHits } from '@/lib/memory/hybrid-memory-ranking';
import type { KnowledgeEvidencePacket, KnowledgeEvidenceExcerpt } from './private-knowledge-evidence';

export type OrgKnowledgeDocument = {
  id: string;
  user_id: string;
  org_id: string | null;
  agent_id: string | null;
  title: string | null;
  status: string | null;
  metadata: unknown;
};

export type OrgKnowledgeChunk = {
  id: string;
  document_id: string;
  user_id: string;
  org_id: string | null;
  agent_id: string | null;
  content: string;
};

/** Avoid changing underlying ownership, RLS, agent scopes or permissions. */
export function authorisedOrgKnowledgeDocuments(args: {
  requestedIds: readonly string[];
  rows: readonly OrgKnowledgeDocument[];
  orgId: string;
  role: string | null;
}): Map<string, OrgKnowledgeDocument> {
  const denied = () => new Error('One or more requested organisation documents are unavailable.');
  const { requestedIds, rows, orgId, role } = args;
  if (!orgId || !['owner', 'admin', 'member'].includes(role ?? '') ||
      requestedIds.length < 1 || requestedIds.length > 3 ||
      new Set(requestedIds).size !== requestedIds.length) throw denied();
  const byId = new Map(rows.map(r => [r.id, r]));
  const selected = new Map<string, OrgKnowledgeDocument>();
  for (const id of requestedIds) {
    const row = byId.get(id);
    const metadata = row?.metadata;
    const shared = typeof metadata === 'object' && metadata !== null &&
      !Array.isArray(metadata) && (metadata as Record<string, unknown>)['enterprise_shared'] === true;
    if (!row || !id || row.org_id !== orgId || row.agent_id !== null ||
        row.status !== 'ready' || !row.user_id || !shared) throw denied();
    selected.set(id, row);
  }
  return selected;
}

const STOP = new Set(['about','after','which','their','that','with','what','where','when','from','these','those','this','there','have','does','would','could','should','please','your','into','and','the','for','are','how','who','our','can']);

/**
 * Bounded, lexical-only source evaluation. Reuses the existing hybrid-memory
 * ranked-hit fusion policy, but does not issue external embedding/model calls.
 * The server must retrieve chunks with RLS and enforce org, owner and parent IDs.
 */
export function buildOrgKnowledgeEvidencePacket(args: {
  documents: ReadonlyMap<string, OrgKnowledgeDocument>;
  chunks: readonly OrgKnowledgeChunk[];
  orgId: string;
  question: string;
}): KnowledgeEvidencePacket {
  const { documents, orgId, question } = args;
  const tokens = [...new Set(question.normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])]
    .filter(token => !STOP.has(token)).slice(0, 12);
  const filtered = args.chunks.filter(chunk => {
    const parent = documents.get(chunk.document_id);
    if (!parent || parent.org_id !== orgId || chunk.org_id !== orgId ||
        chunk.user_id !== parent.user_id || chunk.agent_id !== null ||
        !chunk.content.trim() || !tokens.length) return false;
    const haystack = (String(parent.title ?? '') + ' ' + chunk.content).toLowerCase();
    return tokens.some(token => haystack.includes(token));
  }).map(chunk => ({
    id: chunk.id,
    kind: 'document' as const,
    document_id: chunk.document_id,
    content: chunk.content,
    title: documents.get(chunk.document_id)?.title ?? null,
    similarity: 0,
  }));
  const ranked = rankHybridMemoryHits({ semantic: [], keyword: filtered, query: question, limit: 8 });
  const seen = new Set<string>();
  const excerpts: KnowledgeEvidenceExcerpt[] = [];
  for (const hit of ranked) {
    const parent = documents.get(hit.document_id);
    if (!parent || seen.has(hit.id)) continue;
    seen.add(hit.id);
    excerpts.push({
      citation: `document:${parent.id}#chunk:${hit.id}`,
      documentId: parent.id,
      chunkId: hit.id,
      documentTitle: (parent.title || 'Untitled document').slice(0, 160),
      excerpt: hit.content.trim().slice(0, 900),
      similarity: null, // lexical ranking is not semantic similarity or truth.
    });
  }
  return {
    status: excerpts.length ? 'retrieved_excerpts' : 'no_authorised_excerpts',
    evidenceOnly: true,
    answerGenerated: false,
    requestedDocumentCount: documents.size,
    matchedDocumentCount: new Set(excerpts.map(x => x.documentId)).size,
    excerpts,
    limitation: 'Bounded lexical retrieval only: this is not semantic completeness, a generated answer, customer approval, accuracy certification or full-document disclosure. A lack of matches does not mean there is no relevant passage.',
  };
}
