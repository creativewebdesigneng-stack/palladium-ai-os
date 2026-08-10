import { GRAPH_NODES, GRAPH_EDGES, GRAPH_NODE_TYPES } from './memoryData';

export default function MemoryGraph() {
  const nodeMap = Object.fromEntries(GRAPH_NODES.map((n) => [n.id, n]));
  const legend = Object.entries(GRAPH_NODE_TYPES);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Memory graph</h3>
        <span className="text-[10px] text-zinc-500">{GRAPH_NODES.length} nodes · {GRAPH_EDGES.length} links</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {legend.map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-[10px] text-zinc-400"><span className="h-2 w-2 rounded-full" style={{ background: v.color }} />{k}</span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 640 390" className="w-full min-w-[560px]">
          {/* edges */}
          {GRAPH_EDGES.map(([a, b], i) => {
            const na = nodeMap[a], nb = nodeMap[b];
            if (!na || !nb) return null;
            return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="rgba(255,255,255,.1)" strokeWidth="1" />;
          })}
          {/* nodes */}
          {GRAPH_NODES.map((n) => {
            const t = GRAPH_NODE_TYPES[n.type];
            const I = t.icon;
            return (
              <g key={n.id} className="group">
                <circle cx={n.x} cy={n.y} r="16" fill={t.color} fillOpacity="0.18" stroke={t.color} strokeWidth="1.5" />
                <circle cx={n.x} cy={n.y} r="9" fill={t.color} />
                <text x={n.x} y={n.y + 32} textAnchor="middle" className="fill-zinc-300 text-[9px] font-medium" style={{ pointerEvents: 'none' }}>{n.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}