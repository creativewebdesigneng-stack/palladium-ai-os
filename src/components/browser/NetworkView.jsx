import { NETWORK, STATUS_STYLE } from './browserData';

const TYPE_STYLE = { xhr: 'text-sky-400', js: 'text-amber-400', css: 'text-violet-400', img: 'text-emerald-400', ws: 'text-zinc-400' };

export default function NetworkView() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      <div className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold text-white">Network <span className="ml-1 text-zinc-500">{NETWORK.length} requests</span></div>
      <div className="flex-1 overflow-y-auto p-2">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="px-2 py-1.5 font-medium">METHOD</th>
              <th className="px-2 py-1.5 font-medium">URL</th>
              <th className="px-2 py-1.5 font-medium">TYPE</th>
              <th className="px-2 py-1.5 font-medium">STATUS</th>
              <th className="px-2 py-1.5 font-medium">TIME</th>
              <th className="px-2 py-1.5 font-medium">SIZE</th>
            </tr>
          </thead>
          <tbody>
            {NETWORK.map((r, i) => (
              <tr key={i} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-2 py-2 font-mono text-zinc-300">{r.method}</td>
                <td className="px-2 py-2 text-zinc-300">{r.url}</td>
                <td className={`px-2 py-2 font-mono uppercase ${TYPE_STYLE[r.type]}`}>{r.type}</td>
                <td className={`px-2 py-2 font-mono ${STATUS_STYLE[r.status]}`}>{r.status}</td>
                <td className="px-2 py-2 font-mono text-zinc-400">{r.time}ms</td>
                <td className="px-2 py-2 font-mono text-zinc-400">{r.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}