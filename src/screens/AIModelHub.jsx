import { useState, useMemo } from 'react';
import { Info, Cpu } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';
import ModelFilters from '@/components/model-hub/ModelFilters';
import ModelCard from '@/components/model-hub/ModelCard';
import CompareTable from '@/components/model-hub/CompareTable';
import TestModel from '@/components/model-hub/TestModel';
import { MODELS, PROVIDERS } from '@/components/model-hub/modelsData';

export default function AIModelHub() {
  const [q, setQ] = useState('');
  const [provider, setProvider] = useState('all');
  const [compare, setCompare] = useState([]);
  const [test, setTest] = useState(null);
  const [toast, setToast] = useState(null);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(null), 1600); };

  const toggleCompare = (m) => setCompare(prev => prev.find(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : prev.length < 4 ? [...prev, m] : (flash('Compare up to 4 models'), prev));

  const filtered = useMemo(() => MODELS.filter(m =>
    (provider === 'all' || m.provider === provider) &&
    (m.name.toLowerCase().includes(q.toLowerCase()) || m.provider.toLowerCase().includes(q.toLowerCase()) || m.capabilities.join(' ').toLowerCase().includes(q.toLowerCase()))
  ), [q, provider]);

  const onAction = (model, action) => {
    if (action === 'use') flash(`Using ${model.name} — selected as active model`);
    else if (action === 'connect') flash(`Connect ${model.provider} provider…`);
    else if (action === 'test') setTest(model);
  };

  return (
    <>
      <PageHeader eyebrow="Model Hub" title="AI Model Hub" description="Browse and compare AI models across OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, xAI, Cohere, open source, Ollama and Hugging Face." action={
        <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-[11px] text-zinc-400 sm:flex"><Cpu className="h-3.5 w-3.5 text-zinc-500" />{PROVIDERS.length} providers · {MODELS.length} models</div>
      } />
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[.06] px-3 py-2 text-[11px] text-amber-200/90"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><p>Models are illustrative mock data. The interface is backend-ready for a future model catalog integration.</p></div>

      <ModelFilters q={q} setQ={setQ} provider={provider} setProvider={setProvider} />

      {compare.length > 0 && (
        <CompareTable models={compare} onRemove={id => setCompare(prev => prev.filter(m => m.id !== id))} />
      )}

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{provider === 'all' ? 'All models' : provider}</h3>
        <p className="text-[11px] text-zinc-500">{filtered.length} found · {compare.length} selected to compare</p>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-10 text-center text-sm text-zinc-500">No models match your filters.</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(m => <ModelCard key={m.id} model={m} selected={!!compare.find(c => c.id === m.id)} onToggle={() => toggleCompare(m)} onAction={(a) => onAction(m, a)} />)}
        </div>
      )}

      <TestModel model={test} onClose={() => setTest(null)} />
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-[#10121a] px-4 py-2 text-xs text-zinc-200 shadow-2xl">{toast}</div>}
    </>
  );
}