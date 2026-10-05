import { useState } from 'react';
import { X } from 'lucide-react';
import { PROCESSES } from './terminalData';
import TableSurface, { TableEmptyRow } from '@/components/palladium/TableSurface';

export default function ProcessesView({ onToast }) {
  const [procs, setProcs] = useState(PROCESSES);
  const kill = (pid) => { setProcs((p) => p.filter((x) => x.pid !== pid)); onToast?.(`Process ${pid} terminated`); };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      <div className="border-b border-white/10 px-3 py-2 text-[11px] font-semibold text-white">Processes <span className="ml-1 text-zinc-500">({procs.length})</span></div>
      <div className="min-h-0 flex-1 p-2">
        <TableSurface label="Running processes" minWidth={760} maxHeight="100%" className="h-full rounded-xl">
        <table className="text-[11px]">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="px-2 py-1.5 font-medium">PID</th>
              <th className="px-2 py-1.5 font-medium">COMMAND</th>
              <th className="px-2 py-1.5 font-medium">USER</th>
              <th className="px-2 py-1.5 font-medium">CPU%</th>
              <th className="px-2 py-1.5 font-medium">MEM%</th>
              <th className="px-2 py-1.5 font-medium">STARTED</th>
              <th className="px-2 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {procs.map((p) => (
              <tr key={p.pid} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-2 py-2 font-mono text-zinc-300">{p.pid}</td>
                <td className="px-2 py-2 text-zinc-200">{p.name}</td>
                <td className="px-2 py-2 text-zinc-400">{p.user}</td>
                <td className="px-2 py-2"><span className={`font-mono ${p.cpu > 2 ? 'text-amber-400' : 'text-zinc-400'}`}>{p.cpu.toFixed(1)}</span></td>
                <td className="px-2 py-2 font-mono text-zinc-400">{p.mem.toFixed(1)}</td>
                <td className="px-2 py-2 text-zinc-500">{p.started}</td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => kill(p.pid)} className="grid h-6 w-6 place-items-center rounded-lg text-rose-400 hover:bg-rose-500/15"><X className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            {!procs.length && <TableEmptyRow colSpan={7} title="No running processes" description="Processes will appear here when the runtime reports them." />}
          </tbody>
        </table>
        </TableSurface>
      </div>
    </div>
  );
}