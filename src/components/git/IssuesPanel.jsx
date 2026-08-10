import { CircleDot } from 'lucide-react';
import { ISSUES, ISSUE_STATUS_STYLE, LABEL_STYLE } from './gitData';

export default function IssuesPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><CircleDot className="h-5 w-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Issues</h2></div>
      <div className="space-y-2">
        {ISSUES.map((i) => (
          <div key={i.id} className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${ISSUE_STATUS_STYLE[i.status]}`}>{i.id}</span>
              <span className="text-sm text-white">{i.title}</span>
              <span className="ml-auto text-[10px] text-zinc-500">{i.date}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500">{i.author}</span>
              {i.labels.map((l) => <span key={l} className={`rounded px-1.5 py-px text-[9px] font-medium ${LABEL_STYLE[l] || 'bg-white/10 text-zinc-300'}`}>{l}</span>)}
              <span className={`ml-auto text-[10px] font-medium ${ISSUE_STATUS_STYLE[i.status]}`}>{i.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}