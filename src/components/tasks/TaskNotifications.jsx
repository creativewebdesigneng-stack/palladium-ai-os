import { NOTIFICATIONS } from './tasksData';

export default function TaskNotifications() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Notifications</h3>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-zinc-500">{NOTIFICATIONS.length}</span>
      </div>
      <div className="space-y-2">
        {NOTIFICATIONS.map((n, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <n.icon className={`mt-0.5 h-4 w-4 shrink-0 ${n.color}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{n.title}</p>
              <p className="text-xs text-zinc-400">{n.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}