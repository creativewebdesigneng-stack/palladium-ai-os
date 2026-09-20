import { beforeEach, describe, expect, it, vi } from "vitest";

const embeddings = vi.hoisted(() => ({ embedOne: vi.fn() }));
vi.mock("../embeddings.server", () => ({
  embedOne: embeddings.embedOne,
  embedTexts: vi.fn(),
  EmbeddingError: class EmbeddingError extends Error {},
}));

vi.mock("../vector-store.server", () => ({
  getVectorStore: vi.fn(),
  resolveVectorProvider: () => "pgvector",
}));

import { searchMemory } from "../memory.server";

type SearchRow = {
  id: string;
  content: string;
  title?: string | null;
  memory_type?: string;
  scope?: string;
  category?: string;
  similarity?: number;
};

function sb(args: {
  semantic?: SearchRow[];
  chunks?: Array<{ id: string; content: string; similarity: number; document_id: string }>;
  keyword?: SearchRow[];
  keywordError?: string;
  documentKeywords?: Array<{ id: string; document_id: string; content: string; user_id: string }>;
  documentKeywordError?: string;
}) {
  const keywordResponse = args.keywordError
    ? { data: null, error: { message: args.keywordError } }
    : { data: args.keyword ?? [], error: null };

  const from = vi.fn((table: string) => {
    let owner: string | null = null;
    let terms: string[] = [];
    let rowLimit = 25;
    const chain: any = {
      select: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn((value: number) => { rowLimit = value; return chain; }),
      eq: vi.fn((column: string, value: string) => {
        if (column === "user_id") owner = value;
        return chain;
      }),
      ilike: vi.fn((_column: string, pattern: string) => {
        terms = [pattern.replace(/^%|%$/g, "").toLowerCase()];
        return chain;
      }),
      or: vi.fn((expression: string) => {
        if (table === "memory_chunks") {
          terms = [...expression.matchAll(/content\.ilike\.%([^%]+)%/g)].map((match) => (match[1] ?? '').toLowerCase());
        }
        return chain;
      }),
      in: vi.fn(() => chain),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
        if (table !== "memory_chunks") return Promise.resolve(keywordResponse).then(resolve, reject);
        if (args.documentKeywordError) return Promise.resolve({ data: null, error: { message: args.documentKeywordError } }).then(resolve, reject);
        const rows = (args.documentKeywords ?? []).filter((row) =>
          (!owner || row.user_id === owner) && terms.some((term) => row.content.toLowerCase().includes(term))
        ).slice(0, rowLimit);
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return chain;
  });

  const rpc = vi.fn(async (name: string) => {
    if (name === "search_agent_memories") return { data: args.semantic ?? [], error: null };
    if (name === "search_memory_chunks") return { data: args.chunks ?? [], error: null };
    throw new Error(`unexpected rpc ${name}`);
  });

  return { from, rpc } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  embeddings.embedOne.mockResolvedValue({ vector: [0.1, 0.2], model: "test" });
});

describe("searchMemory hybrid retrieval", () => {
  it("keeps exact keyword recall when semantic retrieval also returns results", async () => {
    const database = sb({
      semantic: [{ id: "semantic", content: "inventory notes", similarity: 0.45 }],
      keyword: [{ id: "exact", content: "SKU-8842 warehouse bin" }],
    });

    const result = await searchMemory({
      sb: database,
      userId: "user-1",
      agentId: "agent-1",
      query: "SKU-8842",
      includeDocuments: false,
    });

    expect(result.map((row) => row.id)).toContain("semantic");
    expect(result.map((row) => row.id)).toContain("exact");
  });

  it("falls back to keyword recall when embeddings fail", async () => {
    embeddings.embedOne.mockRejectedValueOnce(new Error("embedding unavailable"));
    const database = sb({ keyword: [{ id: "keyword", content: "Project Atlas owner is Maya" }] });

    const result = await searchMemory({
      sb: database,
      userId: "user-1",
      agentId: "agent-1",
      query: "Project Atlas",
    });

    expect(result.map((row) => row.id)).toEqual(["keyword"]);
  });

  it("recalls owned document chunks when vector embeddings are unavailable", async () => {
    embeddings.embedOne.mockRejectedValueOnce(new Error("embedding unavailable"));
    const database = sb({
      documentKeywords: [
        { id: "chunk-owned", user_id: "user-1", document_id: "doc-owned", content: "Supplier returns policy is in section 4." },
        { id: "chunk-other", user_id: "user-2", document_id: "doc-other", content: "Supplier returns policy of another user." },
      ],
    });
    const result = await searchMemory({
      sb: database, userId: "user-1", agentId: "agent-1", query: "Where is the supplier returns policy?",
    });
    expect(result.filter((row) => row.kind === "document").map((row) => row.id)).toEqual(["chunk-owned"]);
    expect(database.from).toHaveBeenCalledWith("memory_chunks");
  });

  it("does not search document chunks when the owner disabled document recall", async () => {
    embeddings.embedOne.mockRejectedValueOnce(new Error("embedding unavailable"));
    const database = sb({ documentKeywords: [
      { id: "chunk-one", user_id: "user-1", document_id: "doc-one", content: "Relevant notes" },
    ] });
    const result = await searchMemory({
      sb: database, userId: "user-1", agentId: null, query: "Relevant notes", includeDocuments: false,
    });
    expect(result.some((row) => row.kind === "document")).toBe(false);
    expect(database.from).not.toHaveBeenCalledWith("memory_chunks");
  });

  it("retains owned document keyword hits when memory keyword retrieval fails", async () => {
    embeddings.embedOne.mockRejectedValueOnce(new Error("embedding unavailable"));
    const database = sb({ keywordError: "memory search offline", documentKeywords: [
      { id: "chunk-one", user_id: "user-1", document_id: "doc-one", content: "Supplier documentation and warranty notes" },
    ] });
    const result = await searchMemory({
      sb: database, userId: "user-1", query: "supplier documentation",
    });
    expect(result.some((row) => row.id === "chunk-one" && row.kind === "document")).toBe(true);
  });

  it("preserves semantic and document results when keyword retrieval fails", async () => {
    const database = sb({
      semantic: [{ id: "memory", content: "refund workflow", similarity: 0.88 }],
      chunks: [
        { id: "chunk-1", content: "refund policy document", similarity: 0.72, document_id: "doc-1" },
      ],
      keywordError: "keyword query unavailable",
    });

    const result = await searchMemory({
      sb: database,
      userId: "user-1",
      agentId: "agent-1",
      query: "refund policy",
    });

    expect(result.some((row) => row.id === "memory" && row.kind === "memory")).toBe(true);
    expect(result.some((row) => row.id === "chunk-1" && row.kind === "document")).toBe(true);
  });

  it("deduplicates the same memory returned by both paths and preserves similarity", async () => {
    const database = sb({
      semantic: [{ id: "same", content: "Palladium launch", similarity: 0.76 }],
      keyword: [{ id: "same", content: "Palladium launch" }],
    });

    const result = await searchMemory({
      sb: database,
      userId: "user-1",
      agentId: "agent-1",
      query: "Palladium",
      includeDocuments: false,
    });

    expect(result.filter((row) => row.id === "same")).toHaveLength(1);
    expect(result.find((row) => row.id === "same")?.similarity).toBe(0.76);
  });

  it("respects the requested fused result limit", async () => {
    const database = sb({
      semantic: [
        { id: "a", content: "alpha one", similarity: 0.9 },
        { id: "b", content: "alpha two", similarity: 0.8 },
      ],
      keyword: [{ id: "c", content: "alpha three" }],
    });

    const result = await searchMemory({
      sb: database,
      userId: "user-1",
      agentId: null,
      query: "alpha",
      limit: 2,
      includeDocuments: false,
    });

    expect(result).toHaveLength(2);
  });
});
