import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Download, Share2, Star, Brain, Tag, FolderKanban, Bot,
  MessageSquare, History, FileText, Calendar, User, Building2, TrendingUp,
} from 'lucide-react';
import { DOCUMENT_DETAILS, KNOWLEDGE_STATUS } from './filesData';
import { SectionHead, Progress } from './shared';

const TABS = ['Preview', 'Summary', 'Key Topics', 'Entities', 'AI Summary', 'Projects', 'Agents', 'Comments', 'Versions'];

export default function DocumentViewer({ file, onClose }) {
  const [tab, setTab] = useState('Preview');
  if (!file) return null;
  const d = { ...DOCUMENT_DETAILS, name: file.name, type: file.ext?.toUpperCase() + ' Document', size: file.size, owner: file.owner, collection: file.collection };
  const ks = KNOWLEDGE_STATUS[file.knowledge] || KNOWLEDGE_STATUS.pending;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          onClick={e => e.stopPropagation()}
          className="absolute right-0 top-0 h-full w-full max-w-3xl overflow-y-auto border-l border-white/10 bg-[#0a0b10]"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-[#0a0b10]/95 px-5 py-3 backdrop-blur-xl">
            <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${file.ext ? (ks.badge.includes('emerald') ? 'from-red-500 to-rose-500' : 'from-violet-500 to-indigo-500') : 'from-violet-500 to-indigo-500'}`}>
              <FileText className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{d.name}</p>
              <p className="text-[10px] text-zinc-500">{d.type} · {d.size} · {d.owner}</p>
            </div>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/5"><Star className="h-4 w-4" /></button>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/5"><Download className="h-4 w-4" /></button>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/5"><Share2 className="h-4 w-4" /></button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/5"><X className="h-4 w-4" /></button>
          </div>

          {/* Tabs */}
          <div className="sticky top-[57px] z-10 flex gap-1 overflow-x-auto border-b border-white/10 bg-[#0a0b10]/95 px-3 py-2 backdrop-blur-xl">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${tab === t ? 'bg-violet-500/20 text-violet-300' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}>{t}</button>
            ))}
          </div>

          {/* Content */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                {tab === 'Preview' && (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-6">
                    <div className="mx-auto max-w-md space-y-3">
                      {[...Array(8)].map((_, i) => <div key={i} className="space-y-1.5"><div className="h-3 w-3/4 rounded bg-white/10" /><div className="h-2 w-full rounded bg-white/5" /><div className="h-2 w-5/6 rounded bg-white/5" /></div>)}
                    </div>
                  </div>
                )}
                {tab === 'Summary' && (
                  <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
                    <p className="text-sm leading-relaxed text-zinc-300">{d.summary}</p>
                  </div>
                )}
                {tab === 'Key Topics' && (
                  <div className="flex flex-wrap gap-2">
                    {d.keyTopics.map(t => <span key={t} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300"><Tag className="h-3 w-3 text-violet-400" />{t}</span>)}
                  </div>
                )}
                {tab === 'Entities' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {d.entities.map((e, i) => (
                      <div key={i} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.03] p-3">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15"><e.icon className="h-4 w-4 text-violet-400" /></span>
                        <div><p className="text-[10px] text-zinc-500">{e.type}</p><p className="text-xs font-medium text-white">{e.value}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                {tab === 'AI Summary' && (
                  <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2"><Brain className="h-4 w-4 text-violet-400" /><span className="text-sm font-semibold text-white">AI-Generated Summary</span></div>
                    <p className="text-sm leading-relaxed text-zinc-300">{d.summary}</p>
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-zinc-500"><span className="rounded-md bg-white/5 px-1.5 py-0.5">Confidence: 96%</span><span className="rounded-md bg-white/5 px-1.5 py-0.5">Model: GPT-4o</span></div>
                  </div>
                )}
                {tab === 'Projects' && (
                  <div className="space-y-2">
                    {d.referencedProjects.map(p => (
                      <div key={p} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.03] p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500"><FolderKanban className="h-4 w-4 text-white" /></span><span className="text-xs font-medium text-white">{p}</span></div>
                    ))}
                  </div>
                )}
                {tab === 'Agents' && (
                  <div className="space-y-2">
                    {d.referencedAgents.map(a => (
                      <div key={a} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.03] p-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500"><Bot className="h-4 w-4 text-white" /></span><div><p className="text-xs font-medium text-white">{a}</p><p className="text-[10px] text-zinc-500">Referenced this document</p></div></div>
                    ))}
                  </div>
                )}
                {tab === 'Comments' && (
                  <div className="space-y-3">
                    {d.comments.map((c, i) => (
                      <div key={i} className="flex gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-[10px] font-semibold text-white">{c.avatar}</span>
                        <div><div className="flex items-center gap-2"><span className="text-xs font-medium text-white">{c.who}</span><span className="text-[10px] text-zinc-600">{c.time}</span></div><p className="mt-0.5 text-xs text-zinc-300">{c.text}</p></div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2">
                      <MessageSquare className="h-4 w-4 text-zinc-500" />
                      <input placeholder="Add a comment..." className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 focus:outline-none" />
                      <button className="rounded-lg bg-violet-500/20 px-3 py-1 text-xs text-violet-300">Send</button>
                    </div>
                  </div>
                )}
                {tab === 'Versions' && (
                  <div className="relative space-y-4 pl-4">
                    <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-violet-500/40 via-white/10 to-transparent" />
                    {d.versions.map((v, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
                        <span className={`absolute -left-4 top-1 grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br ${v.grad} ring-4 ring-black/80`}><v.icon className="h-2.5 w-2.5 text-white" /></span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">{v.version}</span>
                          <span className={`rounded-md bg-gradient-to-r ${v.grad} px-1.5 py-0.5 text-[10px] text-white`}>{v.label}</span>
                          <span className="text-[11px] text-zinc-500">{v.time}</span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">{v.desc}</p>
                        <p className="text-[10px] text-zinc-600">by {v.who}</p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}