import { useState } from 'react';
import { X, Sparkles, FileText, BookOpen, Repeat2, MessageCircle, Save } from 'lucide-react';
import { MOCK_AI, ARTICLES, sectionLabel } from './newsData';

const ACTIONS = [
  { id: 'summarise', label: 'Summarise', icon: FileText },
  { id: 'explain', label: 'Explain', icon: BookOpen },
  { id: 'compare', label: 'Compare', icon: Repeat2 },
  { id: 'ask', label: 'Ask AI', icon: MessageCircle },
];

export default function AIPanel({ article, action, onClose, onSavedToggle, saved }) {
  const [compareWith, setCompareWith] = useState('');
  if (!article || !action) return null;

  const others = ARTICLES.filter(a => a.id !== article.id);
  const second = others.find(a => a.id === compareWith) || others[0];
  let output = '';
  if (action === 'summarise') output = MOCK_AI.summarise(article);
  else if (action === 'explain') output = MOCK_AI.explain(article);
  else if (action === 'compare') output = MOCK_AI.compare(article, second);
  else if (action === 'ask') output = MOCK_AI.ask(article);

  const title = ACTIONS.find(a => a.id === action)?.label || 'AI';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c0d13]">
        <div className="flex items-center gap-2 border-b border-white/10 p-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"><Sparkles className="h-4 w-4 text-white" /></span>
          <p className="text-sm font-semibold text-white">{title}</p>
          <button onClick={onClose} className="ml-auto text-zinc-500 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
            <p className="text-[10px] text-zinc-500">{article.source} · {sectionLabel(article.section)} · {article.date}</p>
            <p className="mt-1 text-[13px] font-semibold text-white">{article.title}</p>
          </div>

          {action === 'compare' && (
            <div className="mt-3">
              <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Compare with</label>
              <select value={compareWith} onChange={e => setCompareWith(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 py-2 text-[12px] text-zinc-200 focus:border-violet-400/40 focus:outline-none">
                {others.map(o => <option key={o.id} value={o.id} className="bg-[#10121a]">{o.title}</option>)}
              </select>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[.08] to-transparent p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-violet-300"><Sparkles className="h-3.5 w-3.5" />AI response</p>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-200">{output}</p>
          </div>

          <button onClick={onSavedToggle} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm ${saved ? 'border-amber-400/30 bg-amber-400/10 text-amber-300' : 'border-white/10 text-zinc-300 hover:bg-white/5'}`}>
            <Save className="h-4 w-4" />{saved ? 'Saved' : 'Save article'}
          </button>
        </div>
      </div>
    </div>
  );
}