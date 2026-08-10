import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageHeader from '@/components/palladium/PageHeader';
import SkillsToolbar from '@/components/skills/SkillsToolbar';
import ToolCard from '@/components/skills/ToolCard';
import ToolDetailDrawer from '@/components/skills/ToolDetailDrawer';
import ToolBuilder from '@/components/skills/ToolBuilder';
import { TOOLS, CATEGORIES } from '@/components/skills/skillsData';

export default function Skills() {
  const [tools, setTools] = useState(TOOLS);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = tools;
    if (category !== 'All') list = list.filter((t) => t.category === category);
    if (query) { const q = query.toLowerCase(); list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)); }
    return list;
  }, [tools, category, query]);

  const toggle = (t) => setTools((ts) => ts.map((x) => x.id === t.id ? { ...x, status: x.status === 'Enabled' ? 'Disabled' : 'Enabled' } : x));
  const create = (t) => setTools((ts) => [t, ...ts]);

  const stats = useMemo(() => {
    const enabled = tools.filter((t) => t.status === 'Enabled').length;
    const cats = CATEGORIES.length;
    return { total: tools.length, enabled, cats };
  }, [tools]);

  return (
    <>
      <PageHeader eyebrow="Capabilities" title="Skills & Tools" description="Manage the capabilities your AI agents can use." action={
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{stats.total} tools</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{stats.enabled} enabled</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">{stats.cats} categories</span>
        </div>
      } />

      <SkillsToolbar category={category} onCategory={setCategory} query={query} onQuery={setQuery} onNew={() => setBuilderOpen(true)} />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">No tools match your filters.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => <ToolCard key={t.id} tool={t} onOpen={setOpen} />)}
        </div>
      )}

      <AnimatePresence>
        {open && <ToolDetailDrawer tool={open} onClose={() => setOpen(null)} onToggle={toggle} />}
      </AnimatePresence>

      <AnimatePresence>
        <ToolBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} onCreate={create} />
      </AnimatePresence>
    </>
  );
}