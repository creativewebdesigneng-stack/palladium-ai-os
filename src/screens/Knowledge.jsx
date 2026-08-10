import { useMemo, useState } from 'react';
import PageHeader from '@/components/palladium/PageHeader';
import KnowledgeToolbar from '@/components/knowledge/KnowledgeToolbar';
import KnowledgeCard from '@/components/knowledge/KnowledgeCard';
import AddSourceModal from '@/components/knowledge/AddSourceModal';
import AIKnowledgeSearch from '@/components/knowledge/AIKnowledgeSearch';
import { KBs, SOURCE_TYPES } from '@/components/knowledge/knowledgeData';

export default function Knowledge() {
  const [bases, setBases] = useState(KBs);
  const [query, setQuery] = useState('');
  const [addFor, setAddFor] = useState(null);

  const filtered = useMemo(() => bases.filter((b) => b.name.toLowerCase().includes(query.toLowerCase())), [bases, query]);

  const onAction = (kb, type) => {
    if (type === 'add') setAddFor(kb);
    if (type === 'delete') setBases((bs) => bs.filter((b) => b.id !== kb.id));
    if (type === 'refresh' || type === 'index') setBases((bs) => bs.map((b) => b.id === kb.id ? { ...b, status: 'Indexing', lastIndexed: 'just now' } : b));
    if (type === 'search' || type === 'share') { /* mock — no-op */ }
  };

  const addSource = (sid) => {
    setBases((bs) => bs.map((b) => b.id === addFor.id ? { ...b, sources: b.sources.includes(sid) ? b.sources : [...b.sources, sid] } : b));
  };

  return (
    <>
      <PageHeader eyebrow="Cognition" title="Knowledge Management" description="Create knowledge bases, connect sources, and ask questions in natural language." action={
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{bases.length} knowledge bases</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{SOURCE_TYPES.length} source types</span>
        </div>
      } />

      <KnowledgeToolbar query={query} onQuery={setQuery} onNew={() => setAddFor({ name: 'New Knowledge Base' })} />

      <div className="mb-8 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((kb) => <KnowledgeCard key={kb.id} kb={kb} onAction={onAction} />)}
      </div>

      <AIKnowledgeSearch />

      {addFor && <AddSourceModal kb={addFor} onClose={() => setAddFor(null)} onAdd={addSource} />}
    </>
  );
}