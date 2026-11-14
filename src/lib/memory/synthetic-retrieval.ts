import { rankHybridMemoryHits, type HybridMemoryHit } from "./hybrid-memory-ranking";

export type SyntheticDocument = {
  id: string;
  tenantId: string;
  title: string;
  content: string;
};

export type LabelledQuery = {
  tenantId: string;
  query: string;
  expectedId: string;
};

/**
 * Deterministic hashed bag-of-tokens embedding used for offline retrieval
 * checks. It is not a substitute for the 1536-d production embedding providers.
 */
export function hashEmbedding(text: string, dimensions = 96): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = text
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((token) => token.length >= 3);
  const add = (token: string, weight: number) => {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const bucket = Math.abs(hash) % dimensions;
    vector[bucket] = (vector[bucket] ?? 0) + weight * ((hash & 1) === 0 ? 1 : -1);
  };
  tokens.forEach((token) => add(token, 1));
  for (let index = 0; index < tokens.length - 1; index += 1)
    add(`${tokens[index]}_${tokens[index + 1]}`, 1.4);
  const norm = Math.hypot(...vector) || 1;
  return vector.map((value) => value / norm);
}

export function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0;
  for (let index = 0; index < left.length; index += 1)
    dot += (left[index] ?? 0) * (right[index] ?? 0);
  return dot;
}

export const SYNTHETIC_MEMORY_CORPUS: SyntheticDocument[] = [
  {
    id: "coolant-valve",
    tenantId: "tenant-a",
    title: "Palladium reactor coolant valve schedule",
    content:
      "The palladium reactor coolant valve schedule uses ceramic seat PN-441 and is inspected every 30 operating days.",
  },
  {
    id: "native-lane",
    tenantId: "tenant-a",
    title: "Qwen3 GTX 1080 context window",
    content:
      "Local Astra inference uses qwen3 8b q4 on a gtx 1080 ti with an 8192 token context window through Ollama.",
  },
  {
    id: "invoice-ledger",
    tenantId: "tenant-a",
    title: "Acme invoice ledger 4481",
    content:
      "Tenant acme invoice ledger 4481 records a paid hosting retainer and must not be shown to another tenant.",
  },
  {
    id: "foreign-invoice",
    tenantId: "tenant-b",
    title: "Acme invoice ledger 4481 foreign copy",
    content:
      "Tenant acme invoice ledger 4481 belongs to tenant-b and includes a different bank reference that tenant-a must not retrieve.",
  },
  {
    id: "packing",
    tenantId: "tenant-a",
    title: "Warehouse packing slip colour codes",
    content:
      "Blue labels mark refrigerated goods and amber labels mark fragile optics in the riverside warehouse.",
  },
  {
    id: "onboarding",
    tenantId: "tenant-a",
    title: "Operator onboarding passphrase rotation",
    content:
      "Operators rotate the support passphrase every quarter and store the procedure in the private runbook.",
  },
  {
    id: "crop",
    tenantId: "tenant-b",
    title: "North field irrigation notes",
    content:
      "The north field irrigation notes describe drip lines for barley and are owned by tenant-b.",
  },
];

export const SYNTHETIC_LABELLED_QUERIES: LabelledQuery[] = [
  {
    tenantId: "tenant-a",
    query: "palladium reactor coolant valve schedule",
    expectedId: "coolant-valve",
  },
  { tenantId: "tenant-a", query: "qwen3 gtx 1080 context window", expectedId: "native-lane" },
  { tenantId: "tenant-a", query: "tenant acme invoice ledger 4481", expectedId: "invoice-ledger" },
  { tenantId: "tenant-a", query: "warehouse packing slip colour codes", expectedId: "packing" },
  {
    tenantId: "tenant-a",
    query: "operator onboarding passphrase rotation",
    expectedId: "onboarding",
  },
  { tenantId: "tenant-b", query: "north field irrigation notes barley", expectedId: "crop" },
];

function keywordHits(query: string, documents: SyntheticDocument[]) {
  const tokens = [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}_]+/u)
        .filter((token) => token.length >= 3),
    ),
  ];
  return documents
    .filter((document) => {
      const haystack = `${document.title} ${document.content}`.toLowerCase();
      return tokens.some((token) => haystack.includes(token));
    })
    .map((document) => ({
      id: document.id,
      title: document.title,
      content: document.content,
      similarity: 0,
      kind: "document" as const,
    }));
}

/** Tenant filter is applied before scoring so another tenant cannot outrank the caller. */
export function retrieveSyntheticCorpus(
  query: string,
  tenantId: string,
  limit = 3,
): HybridMemoryHit[] {
  const visible = SYNTHETIC_MEMORY_CORPUS.filter((document) => document.tenantId === tenantId);
  const queryVector = hashEmbedding(query);
  const semantic = visible
    .map((document) => ({
      id: document.id,
      title: document.title,
      content: document.content,
      similarity: cosineSimilarity(
        queryVector,
        hashEmbedding(`${document.title}\n${document.content}`),
      ),
      kind: "document" as const,
    }))
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, 8);
  return rankHybridMemoryHits({
    semantic,
    keyword: keywordHits(query, visible),
    query,
    limit,
  });
}

export function syntheticRetrievalAccuracy(queries: LabelledQuery[] = SYNTHETIC_LABELLED_QUERIES): {
  accuracy: number;
  misses: LabelledQuery[];
} {
  const misses = queries.filter(
    (labelled) =>
      retrieveSyntheticCorpus(labelled.query, labelled.tenantId, 1)[0]?.id !== labelled.expectedId,
  );
  return {
    accuracy: queries.length ? (queries.length - misses.length) / queries.length : 0,
    misses,
  };
}
