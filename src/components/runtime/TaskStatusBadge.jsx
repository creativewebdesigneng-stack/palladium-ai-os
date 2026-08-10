import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

const MAP = {
  pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-300', Icon: Clock },
  running: { label: 'Running', cls: 'bg-violet-500/15 text-violet-300', Icon: Loader2 },
  completed: { label: 'Completed', cls: 'bg-emerald-500/15 text-emerald-300', Icon: CheckCircle2 },
  failed: { label: 'Failed', cls: 'bg-rose-500/15 text-rose-300', Icon: XCircle },
};

export default function TaskStatusBadge({ status }) {
  const s = MAP[status] || MAP.pending;
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${s.cls}`}>
      <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {s.label}
    </span>
  );
}