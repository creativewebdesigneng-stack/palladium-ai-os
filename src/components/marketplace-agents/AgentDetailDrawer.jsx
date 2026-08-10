import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Play, Users, Copy, Wrench, Cpu, Brain, BookOpen, Plug, BarChart3, History, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, RatingStars, PriceBadge, VerifiedBadge, Flag, BADGE_GRADS, Panel, Chip } from './shared';
import ReviewForm from './ReviewForm';

export default function AgentDetailDrawer({ agent, onClose, onInstall }) {
  return (
    <AnimatePresence>
      {agent && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm" onMouseDown={onClose} />
          <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed inset-y-0 right-0 z-[81] flex w-full max-w-lg flex-col overflow-y-auto border-l border-white/10 bg-[#0d0e15]">
            {/* header */}
            <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-white/10 bg-[#0d0e15]/95 px-5 py-4 backdrop-blur">
              <Avatar grad={agent.grad} initials={agent.initials} size="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-white">{agent.name}</h2>
                  <VerifiedBadge verified={agent.creator.verified} />
                </div>
                {agent.creatorId ? <Link to={`/creators/${agent.creatorId}`} className="text-[11px] text-zinc-500 hover:text-violet-300">by {agent.creator.name}</Link> : <p className="text-[11px] text-zinc-500">by {agent.creator.name}</p>}
                <div className="mt-1.5 flex items-center gap-2">
                  <RatingStars rating={agent.rating} count={agent.reviewsCount} />
                  <span className="text-[10px] text-zinc-600">{agent.runs} runs</span>
                  <PriceBadge price={agent.price} />
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex flex-wrap gap-1.5 px-5 pt-4">
              <Flag show={agent.isNew} label="New" grad={BADGE_GRADS.new} />
              <Flag show={agent.isPopular} label="Popular" grad={BADGE_GRADS.popular} />
              <Flag show={agent.isEnterprise} label="Enterprise" grad={BADGE_GRADS.enterprise} />
              <Flag show={agent.isVerified} label="Verified" grad={BADGE_GRADS.enterprise} />
            </div>

            <div className="px-5 pt-4">
              <p className="text-sm leading-relaxed text-zinc-300">{agent.description}</p>
            </div>

            {/* actions */}
            <div className="sticky bottom-0 z-10 grid grid-cols-2 gap-2 border-t border-white/10 bg-[#0d0e15]/95 px-5 py-3 backdrop-blur sm:grid-cols-4">
              <button onClick={() => onInstall(agent)} className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2.5 text-xs font-medium text-white hover:opacity-90"><Download className="h-3.5 w-3.5" /> Install</button>
              <button className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-zinc-200 hover:bg-white/5"><Play className="h-3.5 w-3.5" /> Try</button>
              <button className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-zinc-200 hover:bg-white/5"><Users className="h-3.5 w-3.5" /> Workforce</button>
              <button className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-zinc-200 hover:bg-white/5"><Copy className="h-3.5 w-3.5" /> Duplicate</button>
            </div>

            <div className="space-y-4 p-5">
              <Panel title="Capabilities" icon={Star}>
                <div className="flex flex-wrap gap-1.5">{agent.capabilities.map((c) => <Chip key={c}>{c}</Chip>)}</div>
              </Panel>
              <Panel title="Tools" icon={Wrench}><div className="flex flex-wrap gap-1.5">{agent.tools.map((t) => <Chip key={t}>{t}</Chip>)}</div></Panel>
              <Panel title="Models" icon={Cpu}><div className="flex flex-wrap gap-1.5">{agent.models.map((m) => <Chip key={m}>{m}</Chip>)}</div></Panel>
              <Panel title="Memory" icon={Brain}><p className="text-xs text-zinc-300">{agent.memory}</p></Panel>
              <Panel title="Knowledge" icon={BookOpen}><div className="flex flex-wrap gap-1.5">{agent.knowledge.map((k) => <Chip key={k}>{k}</Chip>)}</div></Panel>
              <Panel title="Integrations" icon={Plug}><div className="flex flex-wrap gap-1.5">{agent.integrations.map((i) => <Chip key={i}>{i}</Chip>)}</div></Panel>

              <Panel title="Usage" icon={BarChart3}>
                <div className="grid grid-cols-3 gap-3">
                  {[['Installs', agent.usage.installs.toLocaleString()], ['Success rate', `${agent.usage.successRate}%`], ['Avg run time', agent.usage.avgRunTime]].map(([l, v]) => (
                    <div key={l} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-lg font-semibold text-white">{v}</p><p className="text-[10px] text-zinc-500">{l}</p></div>
                  ))}
                </div>
              </Panel>

              <Panel title="Details" icon={BarChart3}>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><dt className="text-zinc-500">Version</dt><dd className="text-zinc-200">{agent.version || '1.0.0'}</dd></div>
                  <div className="flex justify-between"><dt className="text-zinc-500">Required plan</dt><dd className="text-zinc-200 capitalize">{agent.requiredPlan || 'free'}</dd></div>
                  {agent.usageRequirements ? <div className="flex justify-between gap-3"><dt className="shrink-0 text-zinc-500">Usage</dt><dd className="text-right text-zinc-200">{agent.usageRequirements}</dd></div> : null}
                  {agent.createdDate ? <div className="flex justify-between"><dt className="text-zinc-500">Published</dt><dd className="text-zinc-200">{new Date(agent.createdDate).toLocaleDateString()}</dd></div> : null}
                </dl>
              </Panel>

              <ReviewForm agent={agent} />

              <Panel title="Version history" icon={History}>
                <div className="space-y-2.5">
                  {agent.versions.map((v, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-violet-400 ring-4 ring-violet-400/10" />
                      <div><p className="text-xs font-medium text-white">v{v.v}</p><p className="text-[11px] text-zinc-400">{v.notes}</p><p className="text-[10px] text-zinc-600">{v.date}</p></div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}