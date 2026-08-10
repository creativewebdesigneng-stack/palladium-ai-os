import { motion } from 'framer-motion';
import { Brain, Calendar, User, Building2, TrendingUp, HelpCircle, FileText } from 'lucide-react';
import { AI_KNOWLEDGE } from './filesData';
import { SectionHead } from './shared';

export default function AIKnowledgePanel() {
  return (
    <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/5 to-transparent p-4">
      <SectionHead icon={Brain} title="AI Knowledge Panel" grad="from-violet-500 to-indigo-500" />

      <div className="space-y-4">
        {/* Summary */}
        <div>
          <h4 className="mb-1.5 text-xs font-semibold text-white">Document Summary</h4>
          <p className="text-xs leading-relaxed text-zinc-400">{AI_KNOWLEDGE.summary}</p>
        </div>

        {/* Key Facts */}
        <div>
          <h4 className="mb-2 text-xs font-semibold text-white">Key Facts</h4>
          <div className="space-y-1.5">
            {AI_KNOWLEDGE.keyFacts.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                <span className="text-xs text-zinc-300">{f}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Important Dates */}
        <div>
          <h4 className="mb-2 text-xs font-semibold text-white">Important Dates</h4>
          <div className="space-y-1.5">
            {AI_KNOWLEDGE.importantDates.map((d, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
                <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${d.grad}`}><d.icon className="h-3.5 w-3.5 text-white" /></span>
                <div><p className="text-xs font-medium text-white">{d.date}</p><p className="text-[10px] text-zinc-500">{d.event}</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* People / Companies / Projects */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <h4 className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-white"><User className="h-3 w-3 text-amber-400" />People</h4>
            <div className="space-y-1">{AI_KNOWLEDGE.people.map(p => <p key={p} className="text-[11px] text-zinc-400">{p}</p>)}</div>
          </div>
          <div>
            <h4 className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-white"><Building2 className="h-3 w-3 text-cyan-400" />Companies</h4>
            <div className="space-y-1">{AI_KNOWLEDGE.companies.map(c => <p key={c} className="text-[11px] text-zinc-400">{c}</p>)}</div>
          </div>
          <div>
            <h4 className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-white"><TrendingUp className="h-3 w-3 text-emerald-400" />Projects</h4>
            <div className="space-y-1">{AI_KNOWLEDGE.projects.map(p => <p key={p} className="text-[11px] text-zinc-400">{p}</p>)}</div>
          </div>
        </div>

        {/* FAQs */}
        <div>
          <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold text-white"><HelpCircle className="h-3.5 w-3.5 text-sky-400" />Frequently Asked Questions</h4>
          <div className="space-y-2">
            {AI_KNOWLEDGE.faqs.map((f, i) => (
              <div key={i} className="rounded-lg border border-white/5 bg-white/[.02] p-2.5">
                <p className="text-xs font-medium text-zinc-200">{f.q}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Documents */}
        <div>
          <h4 className="mb-2 flex items-center gap-1 text-xs font-semibold text-white"><FileText className="h-3.5 w-3.5 text-violet-400" />Related Documents</h4>
          <div className="space-y-1.5">
            {AI_KNOWLEDGE.related.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[.02] p-2 hover:bg-white/5">
                <span className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br ${r.grad}`}><r.icon className="h-3.5 w-3.5 text-white" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-xs text-white">{r.name}</p><p className="text-[10px] text-zinc-500">{r.type}</p></div>
                <span className="text-[10px] font-medium text-emerald-400">{r.relevance}%</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}