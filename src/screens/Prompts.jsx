import { useState } from 'react';
import { Plus, Search, Star, Clock, Bookmark, Sparkles, Copy } from 'lucide-react';
import PageHeader from '@/components/palladium/PageHeader';

const templates = [
  { name: 'Product brief writer', cat: 'Marketing', text: 'Write a product brief for {{product}} targeting {{audience}} with a {{tone}} tone.' },
  { name: 'Code refactor helper', cat: 'Engineering', text: 'Refactor the following {{language}} code for {{goal}}:\n\n```\n{{code}}\n```' },
  { name: 'Support reply', cat: 'Support', text: 'Draft a reply to a customer who says: {{message}}. Emphasize {{value}}.' },
  { name: 'Research summary', cat: 'Research', text: 'Summarize {{topic}} with {{n}} bullet points and key citations.' },
];
const saved = [
  { name: 'Launch email v2', text: 'Write a launch email for our analytics product...', fav: true },
  { name: 'SQL explain', text: 'Explain this SQL query step by step...', fav: false },
  { name: 'Persona builder', text: 'Create a buyer persona for a {{role}}...', fav: true },
];

export default function Prompts() {
  const [text, setText] = useState('');
  const [tab, setTab] = useState('templates');
  const varHint = 'variables use {curly braces}';
  return (
    <>
      <PageHeader eyebrow="AI" title="Prompt Workspace" description="Craft, save, and reuse powerful prompts with variables." action={<button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"><Plus className="h-4 w-4" />New prompt</button>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="mb-3 flex items-center gap-2 text-xs text-zinc-500"><Sparkles className="h-4 w-4 text-violet-400" />Auto-expanding editor · {varHint}</div>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write your prompt here. Use {{variables}} for dynamic values..." className="min-h-[260px] w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-7 outline-none focus:border-violet-500" />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">{text.length} characters · {text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><Bookmark className="h-3.5 w-3.5" />Save</button>
              <button className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-500">Run prompt</button>
            </div>
          </div>
          <div className="mt-5">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-600">Detected variables</p>
            <div className="flex flex-wrap gap-2">
              {(text.match(/\{\{(\w+)\}\}/g) || []).map(v => <span key={v} className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300">{v}</span>)}
              {!text.match(/\{\{(\w+)\}\}/g) && <span className="text-xs text-zinc-600">No variables yet — try writing {'{{product}}'}.</span>}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"><Search className="h-3.5 w-3.5 text-zinc-600" /><input placeholder="Search prompts" className="w-full bg-transparent text-xs outline-none" /></div>
          <div className="mb-4 flex gap-1 rounded-xl bg-black/20 p-1 text-xs">
            {[['templates','Templates'],['saved','Saved'],['favourites','Favourites'],['history','History']].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-lg px-2 py-1.5 ${tab === k ? 'bg-white/10 text-white' : 'text-zinc-500'}`}>{l}</button>
            ))}
          </div>
          <div className="space-y-2">
            {tab === 'templates' && templates.map(t => (
              <button key={t.name} onClick={() => setText(t.text)} className="w-full rounded-xl border border-white/10 p-3 text-left hover:border-violet-400/30">
                <div className="flex items-center justify-between"><span className="text-sm text-white">{t.name}</span><span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{t.cat}</span></div>
                <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500">{t.text}</p>
              </button>
            ))}
            {tab === 'saved' && saved.map(s => (
              <div key={s.name} className="flex items-start gap-2 rounded-xl border border-white/10 p-3 hover:border-white/20">
                <Bookmark className="mt-0.5 h-3.5 w-3.5 text-violet-400" />
                <div className="min-w-0 flex-1"><p className="text-sm text-white">{s.name}</p><p className="mt-1 line-clamp-2 text-xs text-zinc-500">{s.text}</p></div>
                <button onClick={() => setText(s.text)} className="text-zinc-500 hover:text-white"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {tab === 'favourites' && saved.filter(s => s.fav).map(s => (
              <div key={s.name} className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
                <Star className="h-3.5 w-3.5 text-amber-400" /><span className="text-sm text-white">{s.name}</span>
              </div>
            ))}
            {tab === 'history' && ['Launch email v2','SQL explain','Persona builder','Pricing page copy','Onboarding script'].map((h, i) => (
              <div key={h} className="flex items-center gap-2 rounded-xl px-2 py-2 text-xs text-zinc-400 hover:bg-white/5">
                <Clock className="h-3.5 w-3.5 text-zinc-600" />{h}<span className="ml-auto text-[10px] text-zinc-600">{i + 1}h ago</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}