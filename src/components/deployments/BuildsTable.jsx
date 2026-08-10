import { BUILDS, BUILD_STATUS_STYLE } from './deploymentsData';

export default function BuildsTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
      <div className="border-b border-white/10 px-4 py-2.5 text-sm font-semibold text-white">Builds <span className="ml-1 text-[11px] text-zinc-500">({BUILDS.length})</span></div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="px-4 py-2 font-medium">BUILD</th>
              <th className="px-4 py-2 font-medium">PROJECT</th>
              <th className="px-4 py-2 font-medium">COMMIT</th>
              <th className="px-4 py-2 font-medium">TIME</th>
              <th className="px-4 py-2 font-medium">DURATION</th>
              <th className="px-4 py-2 font-medium">SIZE</th>
              <th className="px-4 py-2 font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {BUILDS.map((b) => (
              <tr key={b.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-4 py-2 font-mono text-zinc-300">{b.id}</td>
                <td className="px-4 py-2 text-zinc-300">{b.project}</td>
                <td className="px-4 py-2 font-mono text-zinc-400">{b.commit}</td>
                <td className="px-4 py-2 text-zinc-400">{b.time}</td>
                <td className="px-4 py-2 font-mono text-zinc-400">{b.duration}</td>
                <td className="px-4 py-2 font-mono text-zinc-400">{b.size}</td>
                <td className={`px-4 py-2 font-medium ${BUILD_STATUS_STYLE[b.status]}`}>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}