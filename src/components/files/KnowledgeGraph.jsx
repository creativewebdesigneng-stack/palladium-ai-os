import { motion } from 'framer-motion';
import { Network } from 'lucide-react';
import { GRAPH_NODES, GRAPH_EDGES, GRAPH_LEGEND } from './filesData';
import { SectionHead } from './shared';

function getNode(id) { return GRAPH_NODES.find(n => n.id === id); }

export default function KnowledgeGraph() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4">
      <SectionHead icon={Network} title="Knowledge Graph" grad="from-purple-500 to-violet-500" />

      <div className="grid gap-4 lg:grid-cols-[1fr_12rem]">
        {/* Graph */}
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          <svg viewBox="0 0 100 100" className="h-80 w-full">
            {/* Edges */}
            {GRAPH_EDGES.map((e, i) => {
              const a = getNode(e.from), b = getNode(e.to);
              if (!a || !b) return null;
              return <motion.line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(139,92,246,.25)" strokeWidth="0.3" strokeDasharray="1 1"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: i * 0.08, duration: 0.4 }} />;
            })}
            {/* Nodes */}
            {GRAPH_NODES.map((n, i) => (
              <motion.g key={n.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                <circle cx={n.x} cy={n.y} r="3" className={`fill-violet-500/20 stroke-violet-400/40`} strokeWidth="0.3" />
                <text x={n.x} y={n.y - 4} textAnchor="middle" className="fill-zinc-400" style={{ fontSize: '2px' }}>{n.label}</text>
              </motion.g>
            ))}
          </svg>
          {/* Node badges overlay */}
          {GRAPH_NODES.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
              className="absolute" style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%, -50%)' }}>
              <div className={`flex items-center gap-1 rounded-lg border border-white/10 bg-black/70 px-1.5 py-1 backdrop-blur-sm`}>
                <span className={`grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br ${n.grad}`}><n.icon className="h-3 w-3 text-white" /></span>
                <span className="text-[9px] text-zinc-300">{n.label}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Legend */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-zinc-400">Node Types</h4>
          {GRAPH_LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.02] p-2">
              <span className={`grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br ${l.grad}`}><l.icon className="h-3 w-3 text-white" /></span>
              <span className="text-xs text-zinc-300">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}