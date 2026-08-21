import { useMemo, useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import MemoryToolbar from '@/components/memory/MemoryToolbar';
import MemoryCard from '@/components/memory/MemoryCard';
import MemorySettings from '@/components/memory/MemorySettings';
import MemoryGraph from '@/components/memory/MemoryGraph';
import MemoryBrain from '@/components/memory/MemoryBrain';
import VectorPanel from '@/components/memory/VectorPanel';
import AddMemoryModal from '@/components/memory/AddMemoryModal';
import UploadKnowledgeModal from '@/components/memory/UploadKnowledgeModal';
import EditMemoryModal from '@/components/memory/EditMemoryModal';
import VectorIndexModal from '@/components/memory/VectorIndexModal';
import DocumentVault from '@/components/memory/DocumentVault';
import { normalizeMemory } from '@/components/memory/normalizeMemory';
import { listAgents } from '@/lib/agents/agents.functions';
import { useToast } from '@/components/ui/use-toast';
import { useUpgrade } from '@/lib/upgradeContext';
import { useSession, useActiveOrg } from '@/hooks/use-workspace';
import { uploadKnowledgeDocument } from '@/lib/memory/uploadKnowledge';
import {
  createMemory,
  getMemoryPreferences,
  updateMemoryPreferences,
  removeMemories,
  removeKnowledgeDocument,
  editMemory,
  listMemories,
  pruneMemory,
  reindexMemory,
  removeMemory,
  searchMemories,
} from '@/lib/memory/memory.functions';

export default function Memory() {
  const { toast } = useToast();
  const { gate } = useUpgrade();
  const session = useSession();
  const { orgId } = useActiveOrg();

  const [raw, setRaw] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [agents, setAgents] = useState([]);
  const [prefs, setPrefs] = useState(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [brainPulse, setBrainPulse] = useState(0);

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
        setAgents((await listAgents({ data: { limit: 200, withTasks: false } })).agents);
      } catch {
        setAgents([]);
      }
      try {
        setPrefs((await getMemoryPreferences()).preferences);
      } catch {
        setPrefs(null);
      }
      pruneMemory().catch(() => {});
      await reload();
    })();
  }, [session, reload]);

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

  const pulseBrain = () => setBrainPulse((value) => value + 1);

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
      pulseBrain();
      await reload();
    } catch (e) {
      fail('Could not save memory')(e);
    }
  };

  const handleUpload = async (form) => {
    if (!gate('createAgents')) return;
    setUploading(true);
    try {
      const res = await uploadKnowledgeDocument({
        file: form.file,
        title: form.title,
        summary: form.content,
        agentId: form.agent_id,
        orgId,
        scope: form.scope,
        category: form.category,
      });
      toast({
        title: 'Knowledge ingested',
        description: `${res.chunks} chunks indexed${res.storedFile ? ' — the file is stored privately.' : '.'}`,
      });
      setUploadOpen(false);
      pulseBrain();
      await reload();
    } catch (e) {
      fail('Upload failed')(e);
    } finally {
      setUploading(false);
    }
  };

  const savePrefs = async (patch) => {
    setSavingPrefs(true);
    try {
      const res = await updateMemoryPreferences({ data: patch });
      setPrefs(res.preferences);
      toast({ title: 'Memory settings updated' });
    } catch (e) {
      fail('Could not update memory settings')(e);
      throw e;
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleDeleteDocument = async (doc) => {
    try {
      await removeKnowledgeDocument({ data: { document_id: doc.id } });
      toast({ title: 'Document deleted', description: 'The file, its chunks and vectors were removed.' });
      await reload();
    } catch (e) {
      fail('Could not delete document')(e);
    }
  };

  const handleClearLayer = async () => {
    const label = type === 'all' ? 'every memory' : `all ${type.replace('_', ' ')} memories`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setClearing(true);
    try {
      const res = await removeMemories({ data: { memory_type: type, all: type === 'all' } });
      toast({ title: `Deleted ${res.deleted} ${res.deleted === 1 ? 'memory' : 'memories'}` });
      await reload();
    } catch (e) {
      fail('Could not clear memories')(e);
    } finally {
      setClearing(false);
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
      pulseBrain();
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
      pulseBrain();
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
    <div className="relative isolate min-h-full">
      <MemoryBrain memoryCount={entries.length} active={loading || indexing || uploading || !!semantic} pulse={brainPulse} />
      <div className="relative z-10">
        <PageHeader
          eyebrow="Cognition"
          title="AI Memory"
          description="A living memory network that becomes richer as your agents learn."
          action={
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-zinc-300 backdrop-blur-md">{entries.length} memories</span>
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-zinc-300 backdrop-blur-md">{entries.filter((e) => e.pinned).length} pinned</span>
              <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-zinc-300 backdrop-blur-md">{documents.length} documents</span>
            </div>
          }
        />

        <MemoryToolbar type={type} onType={setType} scope={scope} onScope={setScope} query={query} onQuery={setQuery} onAdd={() => setAddOpen(true)} onUpload={() => setUploadOpen(true)} counts={counts} />

        {semantic && (
          <div className="mb-3 text-[11px] text-zinc-400">
            Semantic recall found {semantic.length} relevant {semantic.length === 1 ? 'entry' : 'entries'} — the neural network is tracing related memories by meaning.
          </div>
        )}

        {session === 'no' ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-12 text-center text-sm text-zinc-500 backdrop-blur-sm">Sign in to view your agent memory.</div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((e) => <MemoryCard key={e.id} entry={e} onAction={onAction} />)}
            </div>
            {!loading && filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-12 text-center text-sm text-zinc-500 backdrop-blur-sm">No memories match your filters. Add a memory or upload knowledge to grow the network.</div>
            )}
            {loading && <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-12 text-center text-sm text-zinc-500 backdrop-blur-sm">Loading memory…</div>}
          </>
        )}

        {session === 'yes' && entries.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClearLayer}
              disabled={clearing}
              className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-50"
            >
              {clearing ? 'Deleting…' : type === 'all' ? 'Delete all memories' : `Delete all ${type.replace('_', ' ')} memories`}
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-4 xl:grid-cols-2">
          <DocumentVault documents={documents} onDelete={handleDeleteDocument} onError={fail('Could not open document')} />
          <MemorySettings preferences={prefs} onSave={savePrefs} saving={savingPrefs} disabled={session !== 'yes'} />
        </div>

        <div className="mt-8"><VectorPanel /></div>
        <div className="mt-8"><MemoryGraph entries={entries} /></div>

        <AddMemoryModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleCreate} agents={agents} />
        <UploadKnowledgeModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSubmit={handleUpload} agents={agents} uploading={uploading} />
        <EditMemoryModal open={!!editEntry} onClose={() => setEditEntry(null)} onSubmit={handleEdit} entry={editEntry} />
        <VectorIndexModal open={!!indexEntry} onClose={() => setIndexEntry(null)} onIndex={handleIndex} entry={indexEntry} indexing={indexing} />
      </div>
    </div>
  );
}
