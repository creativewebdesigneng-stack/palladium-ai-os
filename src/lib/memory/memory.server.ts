/**
 * Memory operations for PalladiumAI.
 *
 * Four layers share one storage model (`agent_memories`) plus a chunk table for
 * document memory:
 *   short_term    — current conversation / task / workflow context (expires)
 *   long_term     — durable facts about the operator and agent history
 *   organisation  — company info, policies, procedures, shared knowledge
 *   knowledge     — uploaded documents and their searchable chunks
 *
 * Tenancy is enforced by RLS: every read/write here goes through the caller's
 * own Supabase client, so a user can never touch another organisation's memory.
 */
import { embedOne, embedTexts, EmbeddingError } from "./embeddings.server";
import {
  capturePermitted,
  expiryFor,
  loadMemoryPreferences,
  sanitizeForCapture,
  type MemoryPreferences,
} from "./preferences.server";
import { getVectorStore, resolveVectorProvider, type VectorFilter } from "./vector-store.server";

type Sb = { from: (t: string) => any; rpc: (fn: string, args?: Record<string, unknown>) => any };

export type MemoryType = "short_term" | "long_term" | "knowledge" | "organisation";
export type MemoryScope = "private" | "agent" | "user" | "shared" | "organisation";

export type StoreMemoryInput = {
  content: string;
  memory_type?: MemoryType;
  category?: string;
  scope?: MemoryScope;
  title?: string | null;
  source?: string | null;
  importance?: "low" | "medium" | "high" | "critical";
  pinned?: boolean;
  agent_id?: string | null;
  task_id?: string | null;
  workflow_id?: string | null;
  document_id?: string | null;
  org_id?: string | null;
  file_url?: string | null;
  metadata?: Record<string, unknown>;
  /** Short-term memory decays; defaults to 12 hours when not given. */
  ttl_minutes?: number | null;
  /**
   * True when an agent (not the user) decided to remember this. Automatic
   * writes are subject to the user's memory preferences and sensitive-content
   * redaction; explicit user-authored memories are not.
   */
  automatic?: boolean;
};

const SHORT_TERM_TTL_MINUTES = 12 * 60;

export class MemoryError extends Error {}

// Strips NUL bytes from ingested content before storage (Postgres text rejects them).
/* eslint-disable no-control-regex */
const clean = (value: string | null | undefined, max: number) =>
  typeof value === "string"
    ? value
        .replace(/\u0000/g, "")
        .trim()
        .slice(0, max)
    : null;
/* eslint-enable no-control-regex */

/** Organisation-scoped memory requires an organisation; RLS re-checks membership. */
function assertScope(input: StoreMemoryInput) {
  const scope = input.scope ?? "private";
  if ((scope === "shared" || scope === "organisation") && !input.org_id) {
    throw new MemoryError("Pick an organisation before sharing this memory with your workspace.");
  }
  return scope;
}

/* ------------------------------------------------------------------ storeMemory */

export async function storeMemory(args: {
  sb: Sb;
  userId: string;
  input: StoreMemoryInput;
  prefs?: MemoryPreferences;
}) {
  let content = clean(args.input.content, 20_000);
  if (!content) throw new MemoryError("Memory content cannot be empty.");
  const scope = assertScope(args.input);
  const memoryType = args.input.memory_type ?? "long_term";

  // Automatic capture obeys the user's privacy choices; anything they typed
  // themselves is stored verbatim.
  let prefs = args.prefs ?? null;
  let redacted: string[] = [];
  if (args.input.automatic) {
    prefs = prefs ?? (await loadMemoryPreferences(args.sb, args.userId));
    const permitted = capturePermitted(memoryType, prefs);
    if (!permitted.ok) return null;
    const sanitised = sanitizeForCapture(content, prefs);
    if (!sanitised.content) return null;
    content = sanitised.content;
    redacted = sanitised.redacted;
  }

  const expiresAt = prefs
    ? expiryFor(memoryType, prefs, args.input.ttl_minutes ?? null)
    : args.input.ttl_minutes
      ? new Date(Date.now() + args.input.ttl_minutes * 60_000).toISOString()
      : memoryType === "short_term"
        ? new Date(Date.now() + SHORT_TERM_TTL_MINUTES * 60_000).toISOString()
        : null;

  const { data, error } = await args.sb
    .from("agent_memories")
    .insert({
      user_id: args.userId,
      org_id: args.input.org_id ?? null,
      agent_id: args.input.agent_id ?? null,
      task_id: args.input.task_id ?? null,
      workflow_id: args.input.workflow_id ?? null,
      document_id: args.input.document_id ?? null,
      memory_type: memoryType,
      category: clean(args.input.category, 60) ?? "conversation",
      scope,
      title: clean(args.input.title, 200),
      content,
      source: clean(args.input.source, 300),
      importance: args.input.importance ?? "medium",
      pinned: Boolean(args.input.pinned),
      file_url: clean(args.input.file_url, 2000),
      metadata: redacted.length
        ? { ...(args.input.metadata ?? {}), redacted }
        : (args.input.metadata ?? {}),
      vector_provider: resolveVectorProvider(),
      vector_status: "pending",
      expires_at: expiresAt,
    })
    .select("*")
    .maybeSingle();

  if (error) throw new MemoryError(error.message);
  if (!data) throw new MemoryError("Could not save that memory.");

  // Indexing failures must not lose the memory — the row stays searchable by text.
  const indexed = await indexMemory({ sb: args.sb, userId: args.userId, memory: data }).catch(
    (e) => {
      console.error("[memory] index failed", e);
      return null;
    },
  );

  return indexed ?? data;
}

/* ------------------------------------------------------------------ indexMemory */

/** Embeds a memory row and writes the vector to the active vector store. */
export async function indexMemory(args: {
  sb: Sb;
  userId: string;
  memory: any;
  provider?: string | null;
}) {
  const text = [args.memory.title, args.memory.content].filter(Boolean).join("\n");
  const store = getVectorStore(args.sb, args.provider);
  const filter: VectorFilter = {
    userId: args.userId,
    orgId: args.memory.org_id ?? null,
    agentId: args.memory.agent_id ?? null,
    namespace: "memories",
  };

  try {
    const { vector, model } = await embedOne(text);
    const { externalIds } = await store.upsert(
      [
        {
          id: args.memory.id,
          vector,
          content: text,
          metadata: {
            user_id: args.userId,
            org_id: args.memory.org_id ?? null,
            agent_id: args.memory.agent_id ?? null,
            memory_type: args.memory.memory_type,
            scope: args.memory.scope,
          },
        },
      ],
      filter,
    );

    const { data } = await args.sb
      .from("agent_memories")
      .update({
        vector_status: "indexed",
        vector_provider: store.provider,
        embedding_model: model,
        vector_external_id: externalIds[args.memory.id] ?? null,
      })
      .eq("id", args.memory.id)
      .select("*")
      .maybeSingle();
    return data ?? args.memory;
  } catch (error) {
    await args.sb
      .from("agent_memories")
      .update({ vector_status: "failed" })
      .eq("id", args.memory.id);
    throw error instanceof EmbeddingError ? new MemoryError(error.message) : error;
  }
}

/* ----------------------------------------------------------------- updateMemory */

export async function updateMemory(args: {
  sb: Sb;
  userId: string;
  id: string;
  patch: Partial<StoreMemoryInput> & { pinned?: boolean };
}) {
  const patch: Record<string, unknown> = {};
  if (args.patch.content !== undefined) {
    const content = clean(args.patch.content, 20_000);
    if (!content) throw new MemoryError("Memory content cannot be empty.");
    patch["content"] = content;
    patch["vector_status"] = "pending";
  }
  if (args.patch.title !== undefined) patch["title"] = clean(args.patch.title, 200);
  if (args.patch.category !== undefined) patch["category"] = clean(args.patch.category, 60);
  if (args.patch.source !== undefined) patch["source"] = clean(args.patch.source, 300);
  if (args.patch.importance !== undefined) patch["importance"] = args.patch.importance;
  if (args.patch.pinned !== undefined) patch["pinned"] = Boolean(args.patch.pinned);
  if (args.patch.memory_type !== undefined) patch["memory_type"] = args.patch.memory_type;
  if (args.patch.scope !== undefined) patch["scope"] = args.patch.scope;
  if (args.patch.agent_id !== undefined) patch["agent_id"] = args.patch.agent_id || null;
  if (args.patch.metadata !== undefined) patch["metadata"] = args.patch.metadata;
  if (!Object.keys(patch).length) throw new MemoryError("Nothing to update.");

  const { data, error } = await args.sb
    .from("agent_memories")
    .update(patch)
    .eq("id", args.id)
    .select("*")
    .maybeSingle();
  if (error) throw new MemoryError(error.message);
  if (!data) throw new MemoryError("Memory not found, or you do not have permission to edit it.");

  if (patch["vector_status"] === "pending") {
    await indexMemory({ sb: args.sb, userId: args.userId, memory: data }).catch((e) =>
      console.error("[memory] reindex failed", e),
    );
  }
  return data;
}

/* ----------------------------------------------------------------- deleteMemory */

export async function deleteMemory(args: { sb: Sb; userId: string; id: string }) {
  const { data: row } = await args.sb
    .from("agent_memories")
    .select("id,org_id,agent_id,vector_provider")
    .eq("id", args.id)
    .maybeSingle();
  if (!row) throw new MemoryError("Memory not found, or you do not have permission to delete it.");

  // Remove the vector first so an external index never keeps orphaned content.
  try {
    await getVectorStore(args.sb, row.vector_provider).remove([args.id], {
      userId: args.userId,
      orgId: row.org_id,
      agentId: row.agent_id,
      namespace: "memories",
    });
  } catch (error) {
    console.error("[memory] vector delete failed", error);
  }

  const { error } = await args.sb.from("agent_memories").delete().eq("id", args.id);
  if (error) throw new MemoryError(error.message);
  return { deleted: true, id: args.id };
}

/* ----------------------------------------------------------------- searchMemory */

export type MemorySearchHit = {
  id: string;
  content: string;
  title?: string | null;
  memory_type?: string;
  scope?: string;
  category?: string;
  similarity: number;
  kind: "memory" | "document";
  document_id?: string | null;
};

/**
 * Semantic search with a keyword fallback, so memory still works when embeddings
 * are unavailable (missing credits, provider outage, not yet indexed).
 */
export async function searchMemory(args: {
  sb: Sb;
  userId: string;
  query: string;
  limit?: number;
  agentId?: string | null;
  types?: MemoryType[] | null;
  includeDocuments?: boolean;
}): Promise<MemorySearchHit[]> {
  const query = clean(args.query, 2000);
  if (!query) return [];
  const limit = Math.min(Math.max(args.limit ?? 8, 1), 25);

  try {
    const { vector } = await embedOne(query);
    const hits: MemorySearchHit[] = [];

    const { data: rows, error } = await args.sb.rpc("search_agent_memories", {
      _embedding: vector as unknown as string,
      _match_count: limit,
      _agent: args.agentId ?? null,
      _types: args.types ?? null,
    });
    if (error) throw new Error(error.message);
    for (const row of rows ?? []) {
      hits.push({
        id: row.id,
        content: row.content,
        title: row.title,
        memory_type: row.memory_type,
        scope: row.scope,
        category: row.category,
        similarity: Number(row.similarity ?? 0),
        kind: "memory",
      });
    }

    if (args.includeDocuments !== false) {
      const { data: chunks } = await args.sb.rpc("search_memory_chunks", {
        _embedding: vector as unknown as string,
        _match_count: Math.min(limit, 6),
        _agent: args.agentId ?? null,
      });
      for (const chunk of chunks ?? []) {
        hits.push({
          id: chunk.id,
          content: chunk.content,
          similarity: Number(chunk.similarity ?? 0),
          kind: "document",
          document_id: chunk.document_id,
        });
      }
    }

    if (hits.length) return hits.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  } catch (error) {
    console.error("[memory] semantic search unavailable, falling back to keywords", error);
  }

  return keywordSearch(args.sb, query, limit, args.agentId ?? null, args.types ?? null);
}

async function keywordSearch(
  sb: Sb,
  query: string,
  limit: number,
  agentId: string | null,
  types: MemoryType[] | null,
): Promise<MemorySearchHit[]> {
  const safe = query.replace(/[%,()]/g, " ").trim();
  let q = sb
    .from("agent_memories")
    .select("id,title,content,memory_type,scope,category")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (safe) q = q.or(`content.ilike.%${safe}%,title.ilike.%${safe}%`);
  if (agentId) q = q.or(`agent_id.is.null,agent_id.eq.${agentId}`);
  if (types?.length) q = q.in("memory_type", types);
  const { data } = await q;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    content: row.content,
    title: row.title,
    memory_type: row.memory_type,
    scope: row.scope,
    category: row.category,
    similarity: 0,
    kind: "memory" as const,
  }));
}

/* -------------------------------------------------- retrieveRelevantMemory */

export type RelevantMemory = {
  shortTerm: string[];
  longTerm: string[];
  organisation: string[];
  documents: string[];
};

/**
 * Builds the memory block injected into an agent's context before execution:
 * pinned + recent short-term context, semantically relevant long-term facts,
 * organisation knowledge and document extracts.
 */
export async function retrieveRelevantMemory(args: {
  sb: Sb;
  userId: string;
  agentId: string | null;
  orgId?: string | null;
  query: string;
  limit?: number;
}): Promise<RelevantMemory> {
  const limit = args.limit ?? 10;

  const [semantic, pinned, recentShortTerm] = await Promise.all([
    searchMemory({
      sb: args.sb,
      userId: args.userId,
      query: args.query,
      limit,
      agentId: args.agentId,
    }).catch(() => [] as MemorySearchHit[]),
    args.sb
      .from("agent_memories")
      .select("title,content,memory_type")
      .eq("pinned", true)
      .limit(10)
      .then((r: any) => r.data ?? []),
    args.sb
      .from("agent_memories")
      .select("title,content")
      .eq("memory_type", "short_term")
      .order("created_at", { ascending: false })
      .limit(8)
      .then((r: any) => r.data ?? []),
  ]);

  const line = (m: { title?: string | null; content: string }) =>
    `${m.title ? `${m.title}: ` : ""}${String(m.content).slice(0, 1200)}`;
  const dedupe = (items: string[]) => [...new Set(items)].slice(0, 12);

  const longTerm: string[] = [];
  const organisation: string[] = [];
  const documents: string[] = [];

  for (const hit of semantic) {
    if (hit.kind === "document") documents.push(line(hit));
    else if (
      hit.memory_type === "organisation" ||
      hit.scope === "shared" ||
      hit.scope === "organisation"
    )
      organisation.push(line(hit));
    else if (hit.memory_type !== "short_term") longTerm.push(line(hit));
  }
  for (const p of pinned) {
    if (p.memory_type === "organisation") organisation.push(line(p));
    else longTerm.push(line(p));
  }

  return {
    shortTerm: dedupe(recentShortTerm.map(line)),
    longTerm: dedupe(longTerm),
    organisation: dedupe(organisation),
    documents: dedupe(documents),
  };
}

/** Renders the memory block as prompt text. Empty layers are omitted. */
export function renderMemoryPrompt(memory: RelevantMemory): string {
  const blocks: string[] = [];
  const push = (heading: string, items: string[]) => {
    if (items.length) blocks.push(`${heading}\n${items.map((i) => `- ${i}`).join("\n")}`);
  };
  push("Recent context (short-term memory):", memory.shortTerm);
  push("What you know about the operator (long-term memory):", memory.longTerm);
  push("Organisation knowledge, policies and procedures:", memory.organisation);
  push("Relevant extracts from the knowledge base:", memory.documents);
  if (!blocks.length) return "";
  return `${blocks.join("\n\n")}\n\nUse this memory when it is relevant. Never invent memories that are not listed here.`;
}

/* ----------------------------------------------------------- document memory */

/** Splits text into overlapping chunks on paragraph boundaries. */
export function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const normalised = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!normalised) return [];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < normalised.length) {
    let end = Math.min(cursor + size, normalised.length);
    if (end < normalised.length) {
      const boundary = normalised.lastIndexOf("\n\n", end);
      if (boundary > cursor + size * 0.5) end = boundary;
    }
    chunks.push(normalised.slice(cursor, end).trim());
    if (end >= normalised.length) break;
    cursor = Math.max(end - overlap, cursor + 1);
  }
  return chunks.filter(Boolean).slice(0, 200);
}

/**
 * Registers a document and stores embedded chunks so agents can cite it.
 * The document row and chunks are owned by the caller; RLS scopes both.
 */
export async function ingestDocument(args: {
  sb: Sb;
  userId: string;
  input: {
    title: string;
    text: string;
    org_id?: string | null;
    agent_id?: string | null;
    storage_path?: string | null;
    mime_type?: string | null;
    size_bytes?: number | null;
    source?: string | null;
    scope?: MemoryScope;
  };
}) {
  const title = clean(args.input.title, 200) ?? "Untitled document";
  const chunks = chunkText(args.input.text ?? "");
  if (!chunks.length) throw new MemoryError("That document has no readable text to index.");

  const { data: doc, error } = await args.sb
    .from("memory_documents")
    .insert({
      user_id: args.userId,
      org_id: args.input.org_id ?? null,
      agent_id: args.input.agent_id ?? null,
      title,
      storage_path: args.input.storage_path ?? null,
      mime_type: args.input.mime_type ?? null,
      size_bytes: args.input.size_bytes ?? null,
      status: "processing",
      chunk_count: 0,
      metadata: { source: args.input.source ?? "upload" },
    })
    .select("*")
    .maybeSingle();
  if (error || !doc) throw new MemoryError(error?.message ?? "Could not create that document.");

  try {
    const { vectors, model } = await embedTexts(chunks);
    const rows = chunks.map((content, index) => ({
      document_id: doc.id,
      user_id: args.userId,
      org_id: args.input.org_id ?? null,
      agent_id: args.input.agent_id ?? null,
      chunk_index: index,
      content,
      token_estimate: Math.ceil(content.length / 4),
      embedding: (vectors[index] ?? null) as unknown as string | null,
      embedding_model: model,
      vector_provider: resolveVectorProvider(),
    }));
    const { error: chunkError } = await args.sb.from("memory_chunks").insert(rows);
    if (chunkError) throw new MemoryError(chunkError.message);

    await args.sb
      .from("memory_documents")
      .update({ status: "ready", chunk_count: rows.length })
      .eq("id", doc.id);

    // A knowledge memory keeps the document visible in the memory UI.
    const summary = await storeMemory({
      sb: args.sb,
      userId: args.userId,
      input: {
        content: chunks[0]!.slice(0, 2000),
        memory_type: "knowledge",
        category: "document",
        scope: args.input.scope ?? (args.input.org_id ? "shared" : "private"),
        title,
        source: args.input.source ?? title,
        agent_id: args.input.agent_id ?? null,
        org_id: args.input.org_id ?? null,
        document_id: doc.id,
        importance: "high",
        metadata: { chunk_count: rows.length },
      },
    }).catch(() => null);

    return {
      document: { ...doc, status: "ready", chunk_count: rows.length },
      chunks: rows.length,
      memory: summary,
    };
  } catch (error) {
    await args.sb.from("memory_documents").update({ status: "failed" }).eq("id", doc.id);
    throw error instanceof MemoryError ? error : new MemoryError("Could not index that document.");
  }
}

/** Deletes a document, its chunks and any vectors held by an external store. */
export async function deleteDocument(args: { sb: Sb; userId: string; documentId: string }) {
  const { data: doc } = await args.sb
    .from("memory_documents")
    .select("id,storage_path")
    .eq("id", args.documentId)
    .maybeSingle();

  const { data: chunks } = await args.sb
    .from("memory_chunks")
    .select("id,org_id,agent_id,vector_provider")
    .eq("document_id", args.documentId);
  const ids = (chunks ?? []).map((c: any) => c.id);
  if (ids.length) {
    try {
      await getVectorStore(args.sb, chunks?.[0]?.vector_provider).remove(ids, {
        userId: args.userId,
        orgId: chunks?.[0]?.org_id ?? null,
        agentId: chunks?.[0]?.agent_id ?? null,
        namespace: "chunks",
      });
    } catch (error) {
      console.error("[memory] chunk vector delete failed", error);
    }
  }
  const { error } = await args.sb.from("memory_documents").delete().eq("id", args.documentId);
  if (error) throw new MemoryError(error.message);

  // The uploaded file goes with the document; nothing is left in the private bucket.
  if (doc?.storage_path) {
    try {
      const storage = (args.sb as unknown as { storage?: any }).storage;
      await storage?.from("knowledge").remove([doc.storage_path]);
    } catch (storageError) {
      console.error("[memory] document file delete failed", storageError);
    }
  }
  return { deleted: true, id: args.documentId };
}

/** Clears expired short-term memory for the caller. */
export async function pruneExpiredMemory(sb: Sb) {
  const { data } = await sb
    .from("agent_memories")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");
  return { pruned: (data ?? []).length };
}
