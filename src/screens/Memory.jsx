import { useMemo, useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import MemoryToolbar from '@/components/memory/MemoryToolbar';
import MemoryCard from '@/components/memory/MemoryCard';
import MemorySettings from '@/components/memory/MemorySettings';
import MemoryGraph from '@/components/memory/MemoryGraph';
import VectorPanel from '@/components/memory/VectorPanel';
import AddMemoryModal from '@/components/memory/AddMemoryModal';
import UploadKnowledgeModal from '@/components/memory/UploadKnowledgeModal';
import EditMemoryModal from '@/components/memory/EditMemoryModal';
import VectorIndexModal from '@/components/memory/VectorIndexModal';
import { MEMORY_SETTINGS } from '@/components/memory/memoryData';
import { normalizeMemory } from '@/components/memory/normalizeMemory';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useUpgrade } from '@/lib/upgradeContext';
import { useSession, useActiveOrg } from '@/hooks/use-workspace';
import {
  createMemory,
  editMemory,
  ingestKnowledgeDocument,
  listMemories,
  pruneMemory,
  reindexMemory,
  removeMemory,
  searchMemories,
} from '@/lib/memory/memory.functions';

const TEXT_TYPES = /^(text\/|application\/json$|application\/xml$)/;

/** Reads a document client-side so the server only ever receives plain text. */
async function readDocumentText(file) {
  if (!file) return '';
  if (TEXT_TYPES.test(file.type) || /\.(txt|md|markdown|csv|json|ya?ml|log)$/i.test(file.name)) {
    return (await file.text()).slice(0, 400000);
  }
  return '';
}

export default function Memory() {
  const { toast } = useToast();
  const { gate } = useUpgrade();
  const session = useSession();
  const { orgId } = useActiveOrg();

  const [raw, setRaw] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [settings, setSettings] = useState(MEMORY_SETTINGS);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState('all');
  const [scope, setScope] = useState('all');
  const [query, setQuery] = useState('');
  const [semantic, setSemantic] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [indexEntry, setIndexEntry] = useState(null);
  const [indexing, setIndexing] = useState(false);

  const fail = (title) => (e) => toast({ title, description: e?.message, variant: 'destructive' });

  const reload = useCallback(async () => {
    if (session !== 'yes') return;
    try {
      const res = await listMemories({ data: { limit: 300 } });
      setRaw(res?.memories || []);
      setDocuments(res?.documents || []);
    } catch (e) {
      setRaw([]);
      fail('Could not load memory')(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (session === 'no') setLoading(false);
    if (session !== 'yes') return;
    (async () => {
      try {
        setAgents(await base44.entities.Agent.filter({}, '-created_date', 200));
      } catch {
        setAgents([]);
      }
      pruneMemory().catch(() => {});
      await reload();
    })();
  }, [session, reload]);

  // Semantic recall: the vector search runs server-side, keyword filtering stays local.
  useEffect(() => {
    if (session !== 'yes' || query.trim().length < 3) {
      setSemantic(null);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await searchMemories({ data: { query: query.trim(), limit: 24 } });
        if (alive) setSemantic(res?.results || []);
      } catch {
        if (alive) setSemantic(null);
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, session]);

  const entries = useMemo(() => raw.map((m) => normalizeMemory(m, agents)), [raw, agents]);

  const ranking = useMemo(() => {
    if (!semantic) return null;
    const map = new Map();
    semantic.forEach((r, i) => map.set(r.id, { rank: i, similarity: r.similarity }));
    return map;
  }, [semantic]);

  const filtered = useMemo(() => {
    let list = entries;
    if (type !== 'all') list = list.filter((e) => e.memory_type === type);
    if (scope !== 'all') list = list.filter((e) => e.scope === scope);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          ranking?.has(e.id) ||
          e.content.toLowerCase().includes(q) ||
          (e.title || '').toLowerCase().includes(q) ||
          (e.source || '').toLowerCase().includes(q) ||
          e.agent_name.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (ranking) {
        const ra = ranking.get(a.id)?.rank ?? 999;
        const rb = ranking.get(b.id)?.rank ?? 999;
        if (ra !== rb) return ra - rb;
      }
      return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    }).map((e) => (ranking?.has(e.id) ? { ...e, similarity: ranking.get(e.id).similarity } : e));
  }, [entries, type, scope, query, ranking]);

  const counts = useMemo(() => {
    const c = { all: entries.length, short_term: 0, long_term: 0, knowledge: 0, organisation: 0 };
    for (const e of entries) c[e.memory_type] = (c[e.memory_type] || 0) + 1;
    return c;
  }, [entries]);

  const handleCreate = async (form) => {
    if (!gate('createAgents')) return;
    try {
      await createMemory({
        data: {
          memory_type: form.memory_type,
          category: form.category,
          scope: form.scope,
          agent_id: form.agent_id || null,
          org_id: form.scope === 'private' ? null : orgId,
          title: form.title || null,
          content: form.content,
          source: form.source || 'manual',
          importance: form.importance,
        },
      });
      toast({ title: 'Memory saved', description: 'Stored and indexed for recall.' });
      setAddOpen(false);
      await reload();
    } catch (e) {
      fail('Could not save memory')(e);
    }
  };

  const handleUpload = async (form) => {
    if (!gate('createAgents')) return;
    setUploading(true);
    try {
      const text = (form.content || '') || (await readDocumentText(form.file));
      if (!text.trim()) {
        throw new Error('Add a text summary — this file type cannot be read in the browser yet.');
      }
      const res = await ingestKnowledgeDocument({
        data: {
          title: form.title || form.file?.name || 'Untitled document',
          text,
          agent_id: form.agent_id || null,
          org_id: form.scope === 'private' ? null : orgId,
          scope: form.scope,
          mime_type: form.file?.type || null,
          size_bytes: form.file?.size || null,
          source: form.file?.name || 'upload',
        },
      });
      toast({ title: 'Knowledge ingested', description: `${res.chunks} chunks indexed for retrieval.` });
      setUploadOpen(false);
      await reload();
    } catch (e) {
      fail('Upload failed')(e);
    } finally {
      setUploading(false);
    }
  };

  const handlePin = async (entry) => {
    try {
      await editMemory({ data: { id: entry.id, patch: { pinned: !entry.pinned } } });
      await reload();
    } catch (e) {
      fail('Could not update')(e);
    }
  };

  const handleDelete = async (entry) => {
    try {
      await removeMemory({ data: { id: entry.id } });
      toast({ title: 'Memory deleted', description: 'Removed from storage and the vector index.' });
      await reload();
    } catch (e) {
      fail('Could not delete')(e);
    }
  };

  const handleEdit = async (id, form) => {
    try {
      await editMemory({ data: { id, patch: form } });
      toast({ title: 'Memory updated' });
      setEditEntry(null);
      await reload();
    } catch (e) {
      fail('Could not update')(e);
    }
  };

  const handleIndex = async (provider) => {
    setIndexing(true);
    try {
      const res = await reindexMemory({ data: { id: indexEntry.id, provider } });
      toast({ title: res.status === 'indexed' ? 'Indexed' : 'Queued for indexing', description: res.message });
      setIndexEntry(null);
      await reload();
    } catch (e) {
      fail('Indexing failed')(e);
    } finally {
      setIndexing(false);
    }
  };

  const onAction = (entry, kind) => {
    if (kind === 'pin') handlePin(entry);
    if (kind === 'delete') handleDelete(entry);
    if (kind === 'edit') setEditEntry(entry);
    if (kind === 'index') setIndexEntry(entry);
  };

  return (
    <>
      <PageHeader
        eyebrow="Cognition"
        title="AI Memory"
        description="Control what your agents remember — and what they forget."
        action={
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{entries.length} memories</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{entries.filter((e) => e.pinned).length} pinned</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{documents.length} documents</span>
          </div>
        }
      />

      <MemoryToolbar type={type} onType={setType} scope={scope} onScope={setScope} query={query} onQuery={setQuery} onAdd={() => setAddOpen(true)} onUpload={() => setUploadOpen(true)} counts={counts} />

      {semantic && (
        <div className="mb-3 text-[11px] text-zinc-400">
          Semantic recall found {semantic.length} relevant {semantic.length === 1 ? 'entry' : 'entries'} — ranked by meaning, not keywords.
        </div>
      )}

      {session === 'no' ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">Sign in to view your agent memory.</div>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => <MemoryCard key={e.id} entry={e} onAction={onAction} />)}
          </div>
          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No memories match your filters. Add a memory or upload knowledge to get started.</div>
          )}
          {loading && <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">Loading memory…</div>}
        </>
      )}

      <div className="mt-8"><VectorPanel /></div>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        <MemorySettings settings={settings} onChange={setSettings} />
        <MemoryGraph />
      </div>

      <AddMemoryModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleCreate} agents={agents} />
      <UploadKnowledgeModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSubmit={handleUpload} agents={agents} uploading={uploading} />
      <EditMemoryModal open={!!editEntry} onClose={() => setEditEntry(null)} onSubmit={handleEdit} entry={editEntry} />
      <VectorIndexModal open={!!indexEntry} onClose={() => setIndexEntry(null)} onIndex={handleIndex} entry={indexEntry} indexing={indexing} />
    </>
  );
}
