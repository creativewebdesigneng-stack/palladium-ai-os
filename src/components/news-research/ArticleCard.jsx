import { Star, Clock, ArrowUpRight, FileText, Sparkles, BookOpen, Repeat2, Save, MessageCircle } from 'lucide-react';
import { sectionLabel } from './newsData';

export default function ArticleCard({ article, onAction, saved }) {
  const actions = [
    { id: 'summarise', label: 'Summarise', icon: FileText },
    { id: 'explain', label: 'Explain', icon: BookOpen },
    { id: 'compare', label: 'Compare', icon: Repeat2 },
    { id: 'ask', label: 'Ask AI', icon: MessageCircle },
  ];
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[.03] p-4 hover:border-violet-400/30">
      <div className="flex items-center gap-2">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${article.grad} text-sm font-semibold text-white`}>{article.source[0]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] text-zinc-500">{article.source}</p>
          <span className="rounded-full border border-white/10 bg-white/[.03] px-2 py-0.5 text-[10px] text-zinc-400">{sectionLabel(article.section)}</span>
        </div>
        <button onClick={() => onAction(article, 'save')} className={`rounded-lg p-1.5 ${saved ? 'text-amber-400' : 'text-zinc-600 hover:text-white'}`} title="Save"><Save className="h-4 w-4" /></button>
      </div>
      <h3 className="mt-2 text-[14px] font-semibold leading-snug text-white">{article.title}</h3>
      <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-zinc-400">{article.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {article.tags.map(t => <span key={t} className="rounded-md border border-white/10 bg-black/20 px-1.5 py-0.5 text-[10px] text-zinc-400">{t}</span>)}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500">
        <span>{article.date}</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime}</span>
        <a href="#" className="ml-auto flex items-center gap-1 text-violet-300 hover:underline">Read <ArrowUpRight className="h-3 w-3" /></a>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-white/5 pt-3">
        {actions.map(a => { const I = a.icon; return (
          <button key={a.id} onClick={() => onAction(article, a.id)} className="flex items-center justify-center gap-1 rounded-lg border border-white/10 py-1.5 text-[10px] text-zinc-300 hover:bg-white/5"><I className="h-3 w-3" />{a.label}</button>
        );})}
      </div>
    </div>
  );
}