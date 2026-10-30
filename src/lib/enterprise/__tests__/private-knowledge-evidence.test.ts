import { describe, expect, it } from 'vitest';
import type { MemoryFabricRecallItem } from '@/lib/memory/memory-fabric.server';
import {
  authorisedPrivateKnowledgeDocuments,
  buildPrivateKnowledgeEvidencePacket,
  type PrivateKnowledgeDocument,
} from '../private-knowledge-evidence';

const owner = 'user-1';
const document = (override: Partial<PrivateKnowledgeDocument> = {}): PrivateKnowledgeDocument => ({
  id: 'doc-1', user_id: owner, org_id: null, agent_id: null,
  status: 'ready', title: 'Approved returns policy', ...override,
});
const chunk = (override: Record<string, unknown> = {}) => ({
  id: 'chunk-1', kind: 'document', document_id: 'doc-1',
  content: 'Customers must submit a refund request within 30 days.',
  similarity: 0.86, org_id: null, agent_id: null,
  layer: 'knowledge', provenance: { id: 'chunk-1', kind: 'document', documentId: 'doc-1' },
  ...override,
}) as MemoryFabricRecallItem;

describe('Private Knowledge Intelligence evidence acceptance boundary', () => {
  it('authorises only the exact owner-scoped ready personal source set', () => {
    const docs = authorisedPrivateKnowledgeDocuments(['doc-1'], [document()], owner);
    expect(docs.size).toBe(1);
    expect(docs.get('doc-1')?.title).toBe('Approved returns policy');
  });

  it('rejects foreign, missing, organisation, agent and unready documents', () => {
    for (const bad of [
      document({ user_id: 'someone-else' }),
      document({ org_id: 'customer-org' }),
      document({ agent_id: 'agent-1' }),
      document({ status: 'processing' }),
    ]) {
      expect(() => authorisedPrivateKnowledgeDocuments(['doc-1'], [bad], owner))
        .toThrow('unavailable');
    }
    expect(() => authorisedPrivateKnowledgeDocuments(['doc-1'], [], owner)).toThrow('unavailable');
    expect(() => authorisedPrivateKnowledgeDocuments(['doc-1', 'doc-1'], [document()], owner)).toThrow('unavailable');
    expect(() => authorisedPrivateKnowledgeDocuments(['doc-1'], [document()], '')).toThrow('unavailable');
    expect(() => authorisedPrivateKnowledgeDocuments([], [document()], owner)).toThrow('unavailable');
  });

  it('requires every selected document to be authorised, not just the first', () => {
    expect(() => authorisedPrivateKnowledgeDocuments(
      ['doc-1', 'doc-2'], [document(), document({ id: 'doc-2', org_id: 'other' })], owner,
    )).toThrow('unavailable');
  });

  it('returns cited, bounded excerpts without inventing an answer', () => {
    const authorised = authorisedPrivateKnowledgeDocuments(['doc-1'], [document()], owner);
    const result = buildPrivateKnowledgeEvidencePacket(authorised, [
      chunk(), chunk({ id: 'chunk-2', similarity: 0, content: 'Escalation requires human review.' }),
    ]);
    expect(result.status).toBe('retrieved_excerpts');
    expect(result.answerGenerated).toBe(false);
    expect(result.evidenceOnly).toBe(true);
    expect(result.requestedDocumentCount).toBe(1);
    expect(result.matchedDocumentCount).toBe(1);
    expect(result.excerpts[0]?.citation).toBe('document:doc-1#chunk:chunk-1');
    expect(result.excerpts[0]?.documentTitle).toBe('Approved returns policy');
    expect(result.excerpts[1]?.similarity).toBeNull();
  });

  it('drops unselected, mismatched-scope and memory hits', () => {
    const authorised = authorisedPrivateKnowledgeDocuments(['doc-1'], [document()], owner);
    const result = buildPrivateKnowledgeEvidencePacket(authorised, [
      chunk({ document_id: 'other-private-doc' }),
      chunk({ id: 'wrong-org', org_id: 'org-b' }),
      chunk({ id: 'wrong-agent', agent_id: 'agent-b' }),
      chunk({ id: 'memory', kind: 'memory' }),
      chunk(),
      chunk(), // same chunk ID must not be repeated
    ]);
    expect(result.excerpts).toHaveLength(1);
    expect(result.excerpts[0]?.chunkId).toBe('chunk-1');
  });

  it('fails evidence coverage closed and never treats absent results as accuracy proof', () => {
    const authorised = authorisedPrivateKnowledgeDocuments(['doc-1'], [document()], owner);
    const result = buildPrivateKnowledgeEvidencePacket(authorised, [chunk({ document_id: 'doc-2' })]);
    expect(result.status).toBe('no_authorised_excerpts');
    expect(result.excerpts).toHaveLength(0);
    expect(result.matchedDocumentCount).toBe(0);
    expect(result.limitation).toContain('not a generated answer');
  });

  it('caps total excerpts and individual length for safe source previews', () => {
    const authorised = authorisedPrivateKnowledgeDocuments(['doc-1'], [document()], owner);
    const hits = Array.from({ length: 20 }, (_, index) =>
      chunk({ id: `chunk-${index}`, content: 'X'.repeat(8000) }));
    const result = buildPrivateKnowledgeEvidencePacket(authorised, hits, 1000);
    expect(result.excerpts).toHaveLength(8);
    expect(result.excerpts.every(hit => hit.excerpt.length === 900)).toBe(true);
  });
});
