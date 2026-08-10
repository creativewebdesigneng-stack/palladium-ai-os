import { useState, useMemo } from 'react';
import { Info, Wrench } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ToolFilters from '@/components/ai-tools/ToolFilters';
import ToolCard from '@/components/ai-tools/ToolCard';
import { TOOLS, CATEGORIES, PRICING_TYPES } from '@/components/ai-tools/toolsData';

export default function AITools() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [pricing, setPricing] = useState([]);

  const togglePricing = (p) => setPricing(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const filtered = useMemo(() => TOOLS.filter(t =>
    (cat === 'all' || t.category === cat) &&
    (pricing.length === 0 || pricing.includes(t.pricing)) &&
    (t.name.toLowerCase().includes(q.toLowerCase()) || t.desc.toLowerCase().includes(q.toLowerCase()) || t.capabilities.join(' ').toLowerCase().includes(q.toLowerCase()) || t.category.toLowerCase().includes(q.toLowerCase()))
  ), [q, cat, pricing]);

  return (
    <>
      <PageHeader eyebrow="Directory" title="AI Tools Directory" description="Discover and compare AI tools across writing, images, video, audio, coding, research, marketing, design, productivity, business, automation and data." action={
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] text-zinc-400 sm:flex"><Wrench className="h-3.5 w-3.5 text-zinc-500" />{CATEGORIES.length} categories · {TOOLS.length} tools · {PRICING_TYPES.length} pricing types</div>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Listings are illustrative mock data. The interface is backend-ready for a future tools integration.</p></div>

      <ToolFilters q={q} setQ={setQ} cat={cat} setCat={setCat} pricing={pricing} togglePricing={togglePricing} />

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{cat === 'all' ? 'All tools' : cat}</h3>
        <p className="text-[11px] text-zinc-500">{filtered.length} found</p>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-10 text-center text-sm text-zinc-500">No tools match your filters.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(t => <ToolCard key={t.id} tool={t} />)}
        </div>
      )}
    </>
  );
}