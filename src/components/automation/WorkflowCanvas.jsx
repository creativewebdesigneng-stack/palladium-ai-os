import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ZoomIn, ZoomOut, Undo2, Redo2, Copy, Trash2, Grid3x3, Maximize,
  MousePointer2, Hand, Plus, Search,
} from 'lucide-react';
import { CANVAS_NODES, CANVAS_CONNECTIONS, STATUS_STYLE } from './automationData';

const NODE_W = 200;
const NODE_H = 72;
const CANVAS_W = 1280;
const CANVAS_H = 420;

function getNode(id) { return CANVAS_NODES.find(n => n.id === id); }

function pathBetween(a, b) {
  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x;
  const y2 = b.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  return `M ${x1},${y1} C ${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}

export default function WorkflowCanvas() {
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState('n2');
  const [tool, setTool] = useState('select');

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#08090d]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[.02] px-3 py-2">
        <div className="flex items-center gap-1">
          {[
            { id: 'select', icon: MousePointer2, label: 'Select' },
            { id: 'pan', icon: Hand, label: 'Pan' },
            { id: 'add', icon: Plus, label: 'Add' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`grid h-8 w-8 place-items-center rounded-lg ${tool === t.id ? 'bg-violet-500/20 text-violet-400' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'}`}
              title={t.label}
            >
              <t.icon className="h-4 w-4" />
            </button>
          ))}
          <div className="mx-1 h-5 w-px bg-white/10" />
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300"><ZoomIn className="h-4 w-4" /></button>
          <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300"><ZoomOut className="h-4 w-4" /></button>
          <span className="w-10 text-center text-[11px] tabular-nums text-zinc-500">{Math.round(zoom * 100)}%</span>
          <div className="mx-1 h-5 w-px bg-white/10" />
          <button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Undo"><Undo2 className="h-4 w-4" /></button>
          <button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Redo"><Redo2 className="h-4 w-4" /></button>
          <button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Copy"><Copy className="h-4 w-4" /></button>
          <button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Delete"><Trash2 className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-1">
          <button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Grid"><Grid3x3 className="h-4 w-4" /></button>
          <button className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-zinc-300" title="Fit"><Maximize className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="relative h-[480px] flex-1 overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translate(-50%, -50%) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <svg width={CANVAS_W} height={CANVAS_H} className="absolute left-0 top-0 overflow-visible">
            {CANVAS_CONNECTIONS.map((c, i) => {
              const a = getNode(c.from), b = getNode(c.to);
              if (!a || !b) return null;
              return (
                <motion.path
                  key={i}
                  d={pathBetween(a, b)}
                  fill="none"
                  stroke="rgba(139,92,246,.4)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                />
              );
            })}

          </svg>

          {CANVAS_NODES.map((n, i) => {
            const st = STATUS_STYLE[n.status] || STATUS_STYLE.idle;
            const isSel = selected === n.id;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelected(n.id)}
                style={{ left: n.x, top: n.y, width: NODE_W, height: NODE_H }}
                className={`absolute cursor-pointer rounded-xl border p-3 backdrop-blur-sm transition-shadow ${isSel ? 'border-violet-400/60 bg-violet-500/10 shadow-[0_0_30px_rgba(139,92,246,.25)]' : 'border-white/10 bg-white/[.04] hover:border-white/20'}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${n.grad} text-white shadow-lg`}>
                    <n.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{n.label}</p>
                    <p className="truncate text-[10px] text-zinc-500">{n.sub}</p>
                  </div>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
                </div>
                {/* Connection ports */}
                <span className="absolute -left-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-violet-400/50 bg-[#08090d]" />
                <span className="absolute -right-1 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-violet-400/50 bg-[#08090d]" />
              </motion.div>
            );
          })}
        </div>

        {/* Mini Map */}
        <div className="absolute bottom-3 right-3 h-28 w-48 overflow-hidden rounded-xl border border-white/10 bg-black/60 backdrop-blur-md">
          <div className="border-b border-white/5 px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-600">Mini Map</div>
          <div className="relative h-full">
            <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
              {CANVAS_CONNECTIONS.map((c, i) => {
                const a = getNode(c.from), b = getNode(c.to);
                if (!a || !b) return null;
                return <path key={i} d={pathBetween(a, b)} fill="none" stroke="rgba(139,92,246,.3)" strokeWidth={4} />;
              })}
              {CANVAS_NODES.map(n => (
                <rect key={n.id} x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx={8} className={`fill-white/10 ${selected === n.id ? 'stroke-violet-400' : 'stroke-white/20'}`} strokeWidth={selected === n.id ? 6 : 2} />
              ))}
              <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} className="fill-violet-400/5 stroke-violet-400/30" strokeWidth={4} strokeDasharray="12 8" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}