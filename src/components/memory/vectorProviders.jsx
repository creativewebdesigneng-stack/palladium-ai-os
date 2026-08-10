// Frontend mirror of the vector provider config (base44/shared/vectors.ts).
// The backend module is the real integration seam; this list drives the UI so
// the memory page never imports server-side code.
export const VECTOR_PROVIDERS = [
  { id: 'pinecone', name: 'Pinecone', desc: 'Managed vector database optimised for semantic search at scale.', envKey: 'PINECONE_API_KEY', dims: 1536 },
  { id: 'weaviate', name: 'Weaviate', desc: 'Open-source vector store with hybrid search and modular embeddings.', envKey: 'WEAVIATE_API_KEY', dims: 1536 },
  { id: 'supabase', name: 'Supabase Vector', desc: 'pgvector-backed embeddings inside your Supabase Postgres instance.', envKey: 'SUPABASE_SERVICE_ROLE_KEY', dims: 1536 },
  { id: 'chroma', name: 'Chroma', desc: 'Lightweight open-source embedding database for local & hosted use.', envKey: 'CHROMA_API_KEY', dims: 1536 },
];