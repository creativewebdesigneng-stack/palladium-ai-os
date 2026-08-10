import { PORTS } from './terminalData';

export default function PortsView() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      <div className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold text-white">Ports <span className="ml-1 text-zinc-500">({PORTS.filter(p => p.status === 'listening').length} listening)</span></div>
      <div className="flex-1 overflow-y-auto p-2">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="px-2 py-1.5 font-medium">PORT</th>
              <th className="px-2 py-1.5 font-medium">SERVICE</th>
              <th className="px-2 py-1.5 font-medium">PROTOCOL</th>
              <th className="px-2 py-1.5 font-medium">PID</th>
              <th className="px-2 py-1.5 font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {PORTS.map((p) => (
              <tr key={p.port} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-2 py-2 font-mono text-zinc-200">:{p.port}</td>
                <td className="px-2 py-2 text-zinc-300">{p.service}</td>
                <td className="px-2 py-2 font-mono text-zinc-400 uppercase">{p.protocol}</td>
                <td className="px-2 py-2 font-mono text-zinc-400">{p.pid ?? '—'}</td>
                <td className="px-2 py-2">
                  <span className={`flex w-fit items-center gap-1.5 rounded-full px-2 py-px text-[10px] ${p.status === 'listening' ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-500 bg-white/5'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${p.status === 'listening' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />{p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}