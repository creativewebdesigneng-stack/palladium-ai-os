import { useMemo, useState, useEffect } from 'react';
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

export default function Memory() {
  const { toast } = useToast();
  const { gate } = useUpgrade();
  const [raw, setRaw] = useState([]);
  const [agents, setAgents] = useState([]);
  const [orgId, setOrgId] = useState('');
  const [settings, setSettings] = useState(MEMORY_SETTINGS);

  const [type, setType] = useState('all');
  const [scope, setScope] = useState('all');
  const [query, setQuery] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [indexEntry, setIndexEntry] = useState(null);
  const [indexing, setIndexing] = useState(false);

  const reload = async () => {
    try {
      const items = await base44.entities.AgentMemory.filter({}, '-created_date', 200);
      setRaw(items || []);
    } catch {
      setRaw([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setOrgId(me?.data?.organisation_id || me?.organisation_id || '');
      } catch {
        /* ignore */
      }
      try {
        setAgents(await base44.entities.Agent.filter({}, '-created_date', 200));
      } catch {
        setAgents([]);
      }
      await reload();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = useMemo(() => raw.map((m) => normalizeMemory(m, agents)), [raw, agents]);

  const filtered = useMemo(() => {
    let list = entries;
    if (type !== 'all') list = list.filter((e) => e.memory_type === type);
    if (scope !== 'all') list = list.filter((e) => e.scope === scope);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((e) =>
        e.content.toLowerCase().includes(q) ||
        (e.title || '').toLowerCase().includes(q) ||
        (e.source || '').toLowerCase().includes(q) ||
        e.agent_name.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [entries, type, scope, query]);

  const counts = useMemo(() => {
    const c = { all: entries.length, short_term: 0, long_term: 0, knowledge: 0 };
    for (const e of entries) c[e.memory_type] = (c[e.memory_type] || 0) + 1;
    return c;
  }, [entries]);

  const handleCreate = async (form) => {
    if (!gate('createAgents')) return;
    try {
      await base44.entities.AgentMemory.create({
        organisation_id: orgId,
        memory_type: form.memory_type,
        category: form.category,
        scope: form.scope,
        agent_id: form.agent_id || '',
        title: form.title || '',
        content: form.content,
        source: form.source || 'manual',
        importance: form.importance,
      });
      toast({ title: 'Memory saved' });
      setAddOpen(false);
      await reload();
    } catch (e) {
      toast({ title: 'Could not save memory', description: e.message, variant: 'destructive' });
    }
  };

  const handleUpload = async (form) => {
    if (!gate('createAgents')) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: form.file });
      await base44.entities.AgentMemory.create({
        organisation_id: orgId,
        memory_type: 'knowledge',
        category: form.category,
        scope: form.scope,
        agent_id: form.agent_id || '',
        title: form.title || form.file.name,
        content: form.content || `Uploaded document: ${form.file.name}`,
        source: form.file.name,
        importance: form.importance,
        file_url,
      });
      toast({ title: 'Knowledge uploaded', description: form.file.name });
      setUploadOpen(false);
      await reload();
    } catch (e) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handlePin = async (entry) => {
    try {
      await base44.entities.AgentMemory.update(entry.id, { pinned: !entry.pinned });
      await reload();
    } catch (e) {
      toast({ title: 'Could not update', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (entry) => {
    try {
      await base44.entities.AgentMemory.delete(entry.id);
      toast({ title: 'Memory deleted' });
      await reload();
    } catch (e) {
      toast({ title: 'Could not delete', description: e.message, variant: 'destructive' });
    }
  };

  const handleEdit = async (id, form) => {
    try {
      await base44.entities.AgentMemory.update(id, form);
      toast({ title: 'Memory updated' });
      setEditEntry(null);
      await reload();
    } catch (e) {
      toast({ title: 'Could not update', description: e.message, variant: 'destructive' });
    }
  };

  const handleIndex = async (provider) => {
    setIndexing(true);
    try {
      const res = await base44.functions.invoke('indexMemoryVector', { memory_id: indexEntry.id, provider });
      toast({ title: res.status === 'indexed' ? 'Indexed' : 'Queued for indexing', description: res.message });
      setIndexEntry(null);
      await reload();
    } catch (e) {
      toast({ title: 'Indexing failed', description: e.message, variant: 'destructive' });
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
      <PageHeader eyebrow="Cognition" title="AI Memory" description="Control what your agents remember — and what they forget." action={
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{entries.length} memories</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{entries.filter((e) => e.pinned).length} pinned</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{counts.knowledge} knowledge</span>
        </div>
      } />

      <MemoryToolbar type={type} onType={setType} scope={scope} onScope={setScope} query={query} onQuery={setQuery} onAdd={() => setAddOpen(true)} onUpload={() => setUploadOpen(true)} counts={counts} />

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((e) => <MemoryCard key={e.id} entry={e} onAction={onAction} />)}
      </div>
      {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No memories match your filters. Add a memory or upload knowledge to get started.</div>}

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