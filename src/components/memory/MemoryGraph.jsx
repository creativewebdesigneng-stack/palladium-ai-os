import { useMemo } from 'react';
import { GRAPH_NODE_TYPES } from './memoryData';

const TYPE_MAP = {
  short_term: 'Memory',
  long_term: 'Memory',
  organisation: 'Organisation',
  document: 'Document',
  agent: 'Agent',
};

function nodeType(entry) {
  return TYPE_MAP[entry.memory_type] ?? Object.keys(GRAPH_NODE_TYPES)[0];
}

/**
 * Renders a radial graph of the caller's real memories, clustered by category.
 * No layout is invented when there are no records — the empty state shows instead.
 */
export default function MemoryGraph({ entries = [] }) {
  const { nodes, edges } = useMemo(() => {
    const list = entries.slice(0, 24);
    if (list.length === 0) return { nodes: [], edges: [] };

    const groups = new Map();
    for (const e of list) {
      const key = e.category || e.memory_type || 'general';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }

    const cx = 320;
    const cy = 195;
    const built = [];
    const links = [];
    const groupKeys = [...groups.keys()];

    groupKeys.forEach((key, gi) => {
      const angle = (gi / groupKeys.length) * Math.PI * 2;
      const gx = cx + Math.cos(angle) * 150;
      const gy = cy + Math.sin(angle) * 105;
      const hubId = `group:${key}`;
      built.push({ id: hubId, label: key.replace(/_/g, ' '), x: gx, y: gy, type: 'Organisation' });
      links.push([hubId, 'root']);

      groups.get(key).forEach((entry, i) => {
        const sub = angle + (i - (groups.get(key).length - 1) / 2) * 0.38;
        built.push({
          id: entry.id,
          label: (entry.title || entry.content || 'Memory').slice(0, 18),
          x: gx + Math.cos(sub) * 72,
          y: gy + Math.sin(sub) * 58,
          type: nodeType(entry),
        });
        links.push([entry.id, hubId]);
      });
    });

    built.push({ id: 'root', label: 'Memory core', x: cx, y: cy, type: 'Agent' });
    return { nodes: built, edges: links };
  }, [entries]);

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const legend = Object.entries(GRAPH_NODE_TYPES);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Memory graph</h3>
        <span className="text-[10px] text-zinc-500">
          {nodes.length} nodes · {edges.length} links
        </span>
      </div>

      {nodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
          No data yet — the graph builds itself from your stored memories.
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {legend.map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <span className="h-2 w-2 rounded-full" style={{ background: v.color }} />
                {k}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto">
            <svg viewBox="0 0 640 390" className="w-full min-w-[560px]">
              {edges.map(([a, b], i) => {
                const na = nodeMap[a];
                const nb = nodeMap[b];
                if (!na || !nb) return null;
                return (
                  <line
                    key={i}
                    x1={na.x}
                    y1={na.y}
                    x2={nb.x}
                    y2={nb.y}
                    stroke="rgba(255,255,255,.1)"
                    strokeWidth="1"
                  />
                );
              })}
              {nodes.map((n) => {
                const t = GRAPH_NODE_TYPES[n.type] ?? { color: '#a78bfa' };
                return (
                  <g key={n.id}>
                    <circle cx={n.x} cy={n.y} r="14" fill={t.color} fillOpacity="0.18" stroke={t.color} strokeWidth="1.5" />
                    <circle cx={n.x} cy={n.y} r="7" fill={t.color} />
                    <text
                      x={n.x}
                      y={n.y + 28}
                      textAnchor="middle"
                      className="fill-zinc-300 text-[9px] font-medium"
                      style={{ pointerEvents: 'none' }}
                    >
                      {n.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
