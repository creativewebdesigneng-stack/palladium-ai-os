/**
 * Vector store abstraction for the memory system.
 *
 * The agent runtime talks to this interface only, so the vector backend can be
 * swapped without touching memory logic. `supabase` (pgvector) is the default
 * and needs no configuration; Pinecone and Weaviate are drop-in alternatives
 * that activate when their environment variables are present.
 */
import { EMBEDDING_DIMENSIONS } from "./embeddings.server";

export type VectorProvider = "supabase" | "pinecone" | "weaviate";

export type VectorRecord = {
  /** Row id in `agent_memories` / `memory_chunks` — the stable cross-provider key. */
  id: string;
  vector: number[];
  content: string;
  /** Tenancy + filtering metadata. Always includes user_id and org_id. */
  metadata: Record<string, string | number | boolean | null>;
};

export type VectorMatch = { id: string; similarity: number; content?: string };

export type VectorFilter = {
  userId: string;
  orgId?: string | null;
  agentId?: string | null;
  namespace: "memories" | "chunks";
};

export type VectorStore = {
  provider: VectorProvider;
  /** Writes/overwrites vectors. Returns the external ids when the backend mints them. */
  upsert(
    records: VectorRecord[],
    filter: VectorFilter,
  ): Promise<{ externalIds: Record<string, string> }>;
  /** Similarity search, always scoped to the caller's tenancy. */
  search(vector: number[], filter: VectorFilter, limit: number): Promise<VectorMatch[]>;
  remove(ids: string[], filter: VectorFilter): Promise<void>;
};

type Sb = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

/** Reads the configured provider. Falls back to pgvector when unset/misconfigured. */
export function resolveVectorProvider(preferred?: string | null): VectorProvider {
  const wanted = (preferred ?? process.env["VECTOR_PROVIDER"] ?? "supabase").toLowerCase();
  if (
    wanted === "pinecone" &&
    process.env["PINECONE_API_KEY"] &&
    process.env["PINECONE_INDEX_HOST"]
  )
    return "pinecone";
  if (wanted === "weaviate" && process.env["WEAVIATE_URL"]) return "weaviate";
  return "supabase";
}

/* ------------------------------------------------------------ pgvector (default) */

function supabaseStore(sb: Sb): VectorStore {
  const table = (filter: VectorFilter) =>
    filter.namespace === "chunks" ? "memory_chunks" : "agent_memories";
  return {
    provider: "supabase",
    async upsert(records, filter) {
      // Vectors live on the row itself; RLS guarantees the caller owns the row.
      for (const record of records) {
        if (record.vector.length !== EMBEDDING_DIMENSIONS) continue;
        await sb
          .from(table(filter))
          .update({
            embedding: record.vector as unknown as string,
            vector_provider: "supabase",
            ...(filter.namespace === "memories" ? { vector_status: "indexed" } : {}),
          })
          .eq("id", record.id);
      }
      return { externalIds: {} };
    },
    async search(vector, filter, limit) {
      const fn = filter.namespace === "chunks" ? "search_memory_chunks" : "search_agent_memories";
      const { data, error } = await sb.rpc(fn, {
        _embedding: vector as unknown as string,
        _match_count: limit,
        _agent: filter.agentId ?? null,
      });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        similarity: Number(row.similarity ?? 0),
        content: row.content,
      }));
    },
    async remove(ids, filter) {
      if (!ids.length) return;
      await sb
        .from(table(filter))
        .update({ embedding: null, vector_status: "disabled" })
        .in("id", ids);
    },
  };
}

/* ----------------------------------------------------------------------- Pinecone */

function pineconeStore(): VectorStore {
  const host = process.env["PINECONE_INDEX_HOST"]!.replace(/\/$/, "");
  const key = process.env["PINECONE_API_KEY"]!;
  const headers = { "Api-Key": key, "Content-Type": "application/json" };
  const ns = (filter: VectorFilter) => `${filter.namespace}:${filter.orgId ?? filter.userId}`;

  return {
    provider: "pinecone",
    async upsert(records, filter) {
      const res = await fetch(`${host}/vectors/upsert`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          namespace: ns(filter),
          vectors: records.map((r) => ({
            id: r.id,
            values: r.vector,
            metadata: { ...r.metadata, content: r.content.slice(0, 2000) },
          })),
        }),
      });
      if (!res.ok) throw new Error(`Pinecone upsert failed (${res.status}).`);
      return { externalIds: Object.fromEntries(records.map((r) => [r.id, r.id])) };
    },
    async search(vector, filter, limit) {
      const res = await fetch(`${host}/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          namespace: ns(filter),
          vector,
          topK: limit,
          includeMetadata: true,
          filter: {
            user_id: filter.userId,
            ...(filter.agentId ? { agent_id: filter.agentId } : {}),
          },
        }),
      });
      if (!res.ok) throw new Error(`Pinecone query failed (${res.status}).`);
      const payload = (await res.json()) as {
        matches?: Array<{ id: string; score: number; metadata?: any }>;
      };
      return (payload.matches ?? []).map((m) => ({
        id: m.id,
        similarity: m.score,
        content: m.metadata?.content,
      }));
    },
    async remove(ids, filter) {
      if (!ids.length) return;
      await fetch(`${host}/vectors/delete`, {
        method: "POST",
        headers,
        body: JSON.stringify({ namespace: ns(filter), ids }),
      });
    },
  };
}

/* ----------------------------------------------------------------------- Weaviate */

function weaviateStore(): VectorStore {
  const base = process.env["WEAVIATE_URL"]!.replace(/\/$/, "");
  const key = process.env["WEAVIATE_API_KEY"];
  const headers = {
    "Content-Type": "application/json",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
  const className = (filter: VectorFilter) =>
    filter.namespace === "chunks" ? "PalladiumChunk" : "PalladiumMemory";

  return {
    provider: "weaviate",
    async upsert(records, filter) {
      for (const record of records) {
        const res = await fetch(`${base}/v1/objects`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            class: className(filter),
            id: record.id,
            vector: record.vector,
            properties: { ...record.metadata, content: record.content.slice(0, 4000) },
          }),
        });
        // 422 means the object already exists; replace it instead.
        if (res.status === 422) {
          await fetch(`${base}/v1/objects/${className(filter)}/${record.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
              class: className(filter),
              id: record.id,
              vector: record.vector,
              properties: { ...record.metadata, content: record.content.slice(0, 4000) },
            }),
          });
        } else if (!res.ok) {
          throw new Error(`Weaviate upsert failed (${res.status}).`);
        }
      }
      return { externalIds: Object.fromEntries(records.map((r) => [r.id, r.id])) };
    },
    async search(vector, filter, limit) {
      const query = `{
        Get { ${className(filter)}(
          limit: ${limit}
          nearVector: { vector: ${JSON.stringify(vector)} }
          where: { path: ["user_id"], operator: Equal, valueText: ${JSON.stringify(filter.userId)} }
        ) { content _additional { id certainty } } }
      }`;
      const res = await fetch(`${base}/v1/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(`Weaviate query failed (${res.status}).`);
      const payload = (await res.json()) as any;
      const rows = payload?.data?.Get?.[className(filter)] ?? [];
      return rows.map((r: any) => ({
        id: r._additional?.id,
        similarity: Number(r._additional?.certainty ?? 0),
        content: r.content,
      }));
    },
    async remove(ids, filter) {
      for (const id of ids) {
        await fetch(`${base}/v1/objects/${className(filter)}/${id}`, { method: "DELETE", headers });
      }
    },
  };
}

/** Returns the active store. `sb` is the caller-scoped client used by pgvector. */
export function getVectorStore(sb: Sb, preferred?: string | null): VectorStore {
  const provider = resolveVectorProvider(preferred);
  if (provider === "pinecone") return pineconeStore();
  if (provider === "weaviate") return weaviateStore();
  return supabaseStore(sb);
}
