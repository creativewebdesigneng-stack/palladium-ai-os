import { STATUS_STYLE, PRIORITY_STYLE } from './jobsData';

export default function TaskListView({ tasks, onOpen }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[.03]">
      <table className="w-full min-w-[940px] text-left text-xs">
        <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-3 py-3 font-medium">Title</th>
            <th className="px-3 py-3 font-medium">Project</th>
            <th className="px-3 py-3 font-medium">Agent</th>
            <th className="px-3 py-3 font-medium">Owner</th>
            <th className="px-3 py-3 font-medium">Priority</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Due</th>
            <th className="px-3 py-3 font-medium">Progress</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const st = STATUS_STYLE[t.status];
            return (
              <tr key={t.id} onClick={() => onOpen(t)} className="cursor-pointer border-b border-white/5 transition hover:bg-white/[.04]">
                <td className="max-w-[220px] px-3 py-3">
                  <p className="truncate font-medium text-white">{t.title}</p>
                  <p className="truncate text-[10px] text-zinc-600">{t.description}</p>
                </td>
                <td className="px-3 py-3 text-zinc-300">{t.project}</td>
                <td className="px-3 py-3 text-zinc-300">{t.agent}</td>
                <td className="px-3 py-3 text-zinc-300">{t.owner}</td>
                <td className="px-3 py-3"><span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span></td>
                <td className="px-3 py-3"><span className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${st.bg} ${st.text}`}><span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{t.status}</span></td>
                <td className="px-3 py-3 text-zinc-400">{t.dueDate}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${t.progress}%` }} /></div>
                    <span className="text-[10px] text-zinc-400">{t.progress}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}